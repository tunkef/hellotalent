// journal-feedback — Structured AI evaluation for Yetenek STAR+T journals
// Triggered by: client calls request_journal_feedback RPC → this function processes pending rows
// Schedule: manual invoke or future pg_cron (not scheduled yet)
//
// Flow:
//   1. Claim pending feedback rows
//   2. Fetch journal content from candidate_studio_journals
//   3. Call OpenAI with structured prompt
//   4. Parse structured JSON response
//   5. Persist via complete_journal_feedback RPC

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
const BATCH_SIZE = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://hellotalent.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Extract optional self-reflection from request body
    let selfReflection = "";
    try {
      const body = await _req.json();
      if (body && typeof body.self_reflection === "string") {
        selfReflection = body.self_reflection.trim();
      }
    } catch { /* no body or invalid JSON — proceed without */ }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Step 1: Claim pending feedback rows
    const { data: pending, error: claimError } = await supabase
      .from("candidate_journal_feedback")
      .select("id, candidate_id, journal_id, role_key, competency_code, question_hash, question_text")
      .eq("status", "pending")
      .limit(BATCH_SIZE);

    if (claimError) {
      return jsonResponse({ error: claimError.message }, 500);
    }

    if (!pending || pending.length === 0) {
      return jsonResponse({ ok: true, processed: 0 });
    }

    // Mark as processing
    const pendingIds = pending.map((p) => p.id);
    await supabase
      .from("candidate_journal_feedback")
      .update({ status: "processing" })
      .in("id", pendingIds);

    let processed = 0;
    let failed = 0;

    // Step 2: Process each row
    for (const row of pending) {
      try {
        // Fetch journal content
        const { data: journal } = await supabase
          .from("candidate_studio_journals")
          .select("situation_text, task_text, action_text, result_text, takeaway_text, role_key, question_text")
          .eq("id", row.journal_id)
          .maybeSingle();

        if (!journal) {
          await completeFeedback(supabase, row.id, "failed", null, "Journal bulunamadi.");
          failed++;
          continue;
        }

        if (!OPENAI_API_KEY) {
          await completeFeedback(supabase, row.id, "failed", null, "OPENAI_API_KEY yapilandirilmamis.");
          failed++;
          continue;
        }

        // Step 3: Call OpenAI
        const prompt = buildPrompt(
          row.role_key || journal.role_key || "",
          row.competency_code,
          row.question_text || journal.question_text || "",
          journal.situation_text || "",
          journal.task_text || "",
          journal.action_text || "",
          journal.result_text || "",
          journal.takeaway_text || "",
          selfReflection,
        );

        const aiResult = await callOpenAI(prompt);

        // Step 4: Persist
        await supabase.rpc("complete_journal_feedback", {
          p_feedback_id: row.id,
          p_status: "completed",
          p_overall_signal: aiResult.overall_signal || "mixed",
          p_score_overall: aiResult.score_overall || null,
          p_strong_points: aiResult.strong_points || [],
          p_weak_points: aiResult.weak_points || [],
          p_star_review: aiResult.star_review || {},
          p_improvement_actions: aiResult.improvement_actions || [],
          p_followup_questions: aiResult.followup_questions || [],
          p_summary_text: aiResult.summary_text || "",
          p_raw_response: aiResult,
        });

        processed++;
      } catch (err) {
        const msg = (err as Error).message || "Unknown error";
        await completeFeedback(supabase, row.id, "failed", null, msg);
        failed++;
      }
    }

    return jsonResponse({ ok: true, processed, failed });
  } catch (err) {
    console.error("journal-feedback error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function completeFeedback(
  supabase: ReturnType<typeof createClient>,
  feedbackId: number,
  status: string,
  raw: unknown,
  errorMsg: string | null,
) {
  await supabase.rpc("complete_journal_feedback", {
    p_feedback_id: feedbackId,
    p_status: status,
    p_error_message: errorMsg,
    p_raw_response: raw,
  });
}

// ═══════════════════════════════════════════════
// PROMPT ENGINEERING
// ═══════════════════════════════════════════════

function buildPrompt(
  role: string,
  competencyCode: string,
  questionText: string,
  situation: string,
  task: string,
  action: string,
  result: string,
  takeaway: string,
  selfReflection: string = "",
): string {
  const selfReflectBlock = selfReflection
    ? `\n\nADAYIN KENDİ DEĞERLENDİRMESİ:\n"${selfReflection}"\n(Bu değerlendirmeyi dikkate al. Adayın fark ettiği güçlü yanları teyit et veya gözden kaçırdığı noktaları belirt.)`
    : "";

  return `Sen perakende sektöründe deneyimli bir mülakat koçusun. Bir adayın iş görüşmesi hazırlık yanıtını değerlendireceksin.

BAĞLAM:
- Hedef Rol: ${role || "Belirtilmemiş"}
- Yetkinlik: ${competencyCode}
- Mülakat Sorusu: "${questionText}"

ADAYIN STAR+T YANITI:
Durum (S): ${situation || "(Boş bırakılmış)"}
Görev (T): ${task || "(Boş bırakılmış)"}
Aksiyon (A): ${action || "(Boş bırakılmış)"}
Sonuç (R): ${result || "(Boş bırakılmış)"}
Çıkarım (+T): ${takeaway || "(Boş bırakılmış)"}${selfReflectBlock}

DEĞERLENDİRME KRİTERLERİ:
1. Yapısal bütünlük: STAR+T formatına uyum
2. Somutluk: Genel ifadeler yerine spesifik örnekler var mı
3. Sahiplenme: "Biz yaptık" yerine "Ben yaptım" odağı var mı
4. Ölçülebilir sonuç: Sayısal veya somut etki belirtilmiş mi
5. Rol uyumu: Yanıt hedef role ve yetkinliğe uygun mu
6. Çıkarım kalitesi: Öğrenme ve gelişim boyutu var mı

ZORUNLU ÇIKTI FORMATI (JSON):
{
  "summary_text": "1-2 cümlelik genel değerlendirme",
  "overall_signal": "strong | mixed | needs_work",
  "score_overall": 0-100,
  "strong_points": ["somut güçlü sinyal 1", "somut güçlü sinyal 2"],
  "weak_points": ["somut zayıf sinyal veya eksik 1", "somut zayıf sinyal veya eksik 2"],
  "star_review": {
    "situation": {"status": "strong | adequate | weak | missing", "note": "kısa not"},
    "task": {"status": "strong | adequate | weak | missing", "note": "kısa not"},
    "action": {"status": "strong | adequate | weak | missing", "note": "kısa not"},
    "result": {"status": "strong | adequate | weak | missing", "note": "kısa not"},
    "takeaway": {"status": "strong | adequate | weak | missing", "note": "kısa not"}
  },
  "improvement_actions": ["spesifik iyileştirme önerisi 1", "spesifik iyileştirme önerisi 2"],
  "followup_questions": ["mülakatçının sorabileceği takip sorusu 1", "mülakatçının sorabileceği takip sorusu 2"]
}

KURALLAR:
- Türkçe yanıt ver
- Yalnızca JSON döndür, açıklama ekleme
- Boş bırakılan STAR+T alanları "missing" olarak değerlendir
- Perakende sektörü bağlamında değerlendir

YAZIM TONU:
- "Harika!", "Mükemmel!", "Muhteşem!" gibi boş övgüler KULLANMA
- Somut referans ver: "Satış rakamlarını vermişsin, bu güçlü" gibi spesifik ol
- "kapsamlı", "etkili", "güçlü" kelimelerini her cümlede tekrarlama
- Kısa ve uzun cümleleri karıştır, tekdüze ritim kurma
- "X, Y ve Z" üçlü kalıbını her listede kullanma — bazen ikili, bazen dörtlü grupla
- Genel tavsiye yerine bu adayın bu cevabına özel geri bildirim ver
- Eksik alanları "doldurmanız önerilir" gibi genel ifadelerle geçiştirme, ne yazılabileceğine dair somut örnek ver`;
}

// ═══════════════════════════════════════════════
// OPENAI API
// ═══════════════════════════════════════════════

interface FeedbackResult {
  summary_text: string;
  overall_signal: string;
  score_overall: number;
  strong_points: string[];
  weak_points: string[];
  star_review: Record<string, { status: string; note: string }>;
  improvement_actions: string[];
  followup_questions: string[];
}

async function callOpenAI(prompt: string): Promise<FeedbackResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "Sen bir perakende mülakat koçusun. Yalnızca geçerli JSON döndür." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const status = res.status;
    // Sanitize: never expose raw API error body (may contain key fragments)
    const safeMsg = status === 401 ? "API anahtari gecersiz."
      : status === 429 ? "Istek limiti asildi. Lutfen bekleyin."
      : status === 404 ? `Model bulunamadi: ${MODEL}`
      : `OpenAI hatasi (${status})`;
    throw new Error(safeMsg);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI empty response");

  const parsed: FeedbackResult = JSON.parse(content);

  // Validate required fields
  if (!parsed.overall_signal) parsed.overall_signal = "mixed";
  if (!parsed.strong_points) parsed.strong_points = [];
  if (!parsed.weak_points) parsed.weak_points = [];
  if (!parsed.star_review) parsed.star_review = {};
  if (!parsed.improvement_actions) parsed.improvement_actions = [];
  if (!parsed.followup_questions) parsed.followup_questions = [];
  if (!parsed.summary_text) parsed.summary_text = "";

  return parsed;
}
