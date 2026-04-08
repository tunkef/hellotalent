// cv-optimize — Anthropic-powered CV content optimization
// Server-side only: ANTHROPIC_API_KEY never touches the client.
//
// Source CV parse policy:
//   - PDF: text-layer extraction (BT/ET operators). Scanned/image PDFs → fallback.
//   - DOCX: real ZIP unzip via fflate → word/document.xml → w:t text extraction.
//   - DOC (legacy binary): best-effort latin1 readable runs. Low confidence.
//   - Parse failure: honest fallback to profile-only optimization.
//   - Parse success: source CV text included in AI prompt as additional context.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514";
/* MVP free-tier: set MVP_FREE_TIER=true in Supabase Edge Function env to bypass is_premium check.
   Flip to false (or remove) when iyzico/payment is ready. */
const MVP_FREE_TIER = Deno.env.get("MVP_FREE_TIER") === "true";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://hellotalent.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CVInput {
  isim: string;
  targetRole: string;
  city: string;
  experiences: Array<{
    pozisyon?: string; marka?: string; sirket?: string;
    baslangic_yil?: number; bitis_yil?: number; devam_ediyor?: boolean;
    rol_ailesi?: string; segment?: string;
  }>;
  education: Array<{ okul?: string; bolum?: string; egitim_seviye?: string; mezun_yil?: number }>;
  languages: Array<{ dil?: string; seviye?: string }>;
  certificates: Array<{ egitim_adi?: string; kurum?: string; yil?: string }>;
  brandInterests: string[];
  cvUrl?: string;
  cvFilename?: string;
}

interface CVOutput {
  summary: string;
  experienceRewrites: Array<{ index: number; headline: string; bullets: string[] }>;
  keywordSuggestions: string[];
  headlineImprovement?: string;
  sourceUsed: "profile_only" | "profile_and_cv" | "profile_fallback";
  parserUsed?: "pdf_text" | "docx_unzip" | "doc_besteff" | "none";
}

// ── PDF text extraction (basic — no OCR) ──
function extractTextFromPDF(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder("latin1").decode(bytes);
    const chunks: string[] = [];
    const btEtRegex = /BT\s([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(text)) !== null) {
      const block = match[1];
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tj;
      while ((tj = tjRegex.exec(block)) !== null) { chunks.push(tj[1]); }
      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let tja;
      while ((tja = tjArrayRegex.exec(block)) !== null) {
        const innerTj = /\(([^)]*)\)/g;
        let it;
        while ((it = innerTj.exec(tja[1])) !== null) { chunks.push(it[1]); }
      }
    }
    if (chunks.length < 10) {
      const readable = text.match(/[A-Za-z\u00C0-\u024F\u0100-\u017F]{3,}[^)]{0,200}/g);
      if (readable && readable.length > chunks.length) return readable.join(" ").substring(0, 5000);
    }
    return chunks.join(" ").replace(/\\n/g, "\n").replace(/\s+/g, " ").trim().substring(0, 5000);
  } catch { return ""; }
}

// ── DOCX text extraction (real ZIP unzip → word/document.xml → w:t tags) ──
function extractTextFromDOCX(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    // Verify ZIP magic bytes (PK\x03\x04)
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B) return "";

    const unzipped = unzipSync(bytes);

    // Find word/document.xml in the ZIP entries
    let docXml = "";
    for (const [name, data] of Object.entries(unzipped)) {
      if (name === "word/document.xml" || name === "word\\document.xml") {
        docXml = new TextDecoder("utf-8").decode(data as Uint8Array);
        break;
      }
    }
    if (!docXml) return "";

    // Extract text from <w:t> tags within <w:body>
    const bodyMatch = docXml.match(/<w:body>([\s\S]*?)<\/w:body>/);
    const searchText = bodyMatch ? bodyMatch[1] : docXml;
    const chunks: string[] = [];
    const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m;
    while ((m = wtRegex.exec(searchText)) !== null) {
      if (m[1].trim()) chunks.push(m[1]);
    }
    return chunks.join(" ").substring(0, 5000);
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: candidate } = await supabase.from("candidates")
      .select("is_premium, cv_url, cv_filename").eq("user_id", user.id).maybeSingle();
    /* Premium gate — bypassed during MVP free-tier beta */
    if (!candidate || (!MVP_FREE_TIER && candidate.is_premium !== true)) {
      return new Response(JSON.stringify({ error: "Premium required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const input: CVInput = await req.json();
    if (!input || !input.isim) {
      return new Response(JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Source CV ingestion ──
    let sourceCVText = "";
    let sourceUsed: CVOutput["sourceUsed"] = "profile_only";
    let parserUsed: CVOutput["parserUsed"] = "none";
    const cvUrl = candidate.cv_url || input.cvUrl || "";
    const cvFilename = candidate.cv_filename || input.cvFilename || "";

    if (cvUrl) {
      try {
        const cvRes = await fetch(cvUrl);
        if (cvRes.ok) {
          const buffer = await cvRes.arrayBuffer();
          const ext = cvFilename.split(".").pop()?.toLowerCase() || "";
          if (ext === "pdf") {
            sourceCVText = extractTextFromPDF(buffer);
            parserUsed = "pdf_text";
          } else if (ext === "docx") {
            sourceCVText = extractTextFromDOCX(buffer);
            parserUsed = "docx_unzip";
          } else if (ext === "doc") {
            const raw = new TextDecoder("latin1").decode(new Uint8Array(buffer));
            const readable = raw.match(/[\x20-\x7E\xC0-\xFF]{4,}/g);
            sourceCVText = readable ? readable.join(" ").substring(0, 3000) : "";
            parserUsed = "doc_besteff";
          }
          sourceUsed = (sourceCVText && sourceCVText.length > 50) ? "profile_and_cv" : "profile_fallback";
          if (sourceUsed === "profile_fallback") sourceCVText = "";
        } else { sourceUsed = "profile_fallback"; }
      } catch { sourceUsed = "profile_fallback"; }
    }

    // ── Build prompt ──
    const expText = (input.experiences || []).map((e, i) =>
      `${i + 1}. ${e.pozisyon || ""} — ${e.marka || e.sirket || ""} (${e.baslangic_yil ? `${e.baslangic_yil}-${e.devam_ediyor ? "Devam" : (e.bitis_yil || "?")}` : ""}) [${e.rol_ailesi || ""}, ${e.segment || ""}]`
    ).join("\n");
    const eduText = (input.education || []).map(e => `${e.okul || ""} — ${e.bolum || ""} (${e.egitim_seviye || ""}, ${e.mezun_yil || ""})`).join("\n");
    const langText = (input.languages || []).map(l => `${l.dil || ""} (${l.seviye || ""})`).join(", ");
    const certText = (input.certificates || []).map(c => `${c.egitim_adi || ""} — ${c.kurum || ""}`).join(", ");

    const sourceBlock = sourceCVText
      ? `\n\nYÜKLÜ ORİJİNAL CV METNİ (kaynak olarak kullan):\n---\n${sourceCVText}\n---\nBu CV'deki detayları (başarılar, rakamlar, sorumluluklar) profil verisini zenginleştirmek için kullan. Uydurma bilgi EKLEME.`
      : "";

    const systemPrompt = `Sen Türkiye perakende sektörü için uzmanlaşmış bir CV danışmanısın.
Görevin: adayın profil verilerini${sourceCVText ? " ve yüklü orijinal CV'sini" : ""} kullanarak ATS-uyumlu CV içeriği optimize etmek.
KURALLAR:
- Yalnızca Türkçe yaz
- Uydurma bilgi EKLEME
${sourceCVText ? "- Orijinal CV'deki detayları profil verisiyle birleştir" : ""}
- Her deneyim için 2-3 başarı odaklı bullet point öner
- Perakende sektörü anahtar kelimelerini doğal yerleştir
- Özet 2-3 cümle, güçlü ve özlü
- JSON formatında yanıt ver`;

    const userPrompt = `Aday: ${input.isim}
Hedef: ${input.targetRole || "Belirtilmemiş"} | Şehir: ${input.city || "Belirtilmemiş"}
DENEYİM:\n${expText || "Yok"}
EĞİTİM:\n${eduText || "Yok"}
DİLLER: ${langText || "Yok"} | SERTİFİKALAR: ${certText || "Yok"}
İLGİ: ${(input.brandInterests || []).join(", ") || "Yok"}${sourceBlock}

JSON yanıt:
{"summary":"...","experienceRewrites":[{"index":0,"headline":"...","bullets":["..."]}],"keywordSuggestions":["..."],"headlineImprovement":"..."}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 2048, messages: [{ role: "user", content: userPrompt }], system: systemPrompt }),
    });

    if (!anthropicRes.ok) {
      console.error("[cv-optimize] Anthropic error:", anthropicRes.status);
      return new Response(JSON.stringify({ error: "AI service unavailable", detail: anthropicRes.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anthropicData = await anthropicRes.json();
    const aiText = anthropicData?.content?.[0]?.text || "";

    let parsed: Record<string, unknown>;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(JSON.stringify({ error: "AI response parse error", raw: aiText.substring(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const output: CVOutput = {
      summary: typeof parsed.summary === "string" ? parsed.summary.substring(0, 500) : "",
      experienceRewrites: Array.isArray(parsed.experienceRewrites)
        ? (parsed.experienceRewrites as Array<Record<string, unknown>>).slice(0, 10).map(r => ({
            index: typeof r.index === "number" ? r.index : 0,
            headline: typeof r.headline === "string" ? r.headline.substring(0, 200) : "",
            bullets: Array.isArray(r.bullets) ? (r.bullets as string[]).slice(0, 5).map(b => String(b).substring(0, 300)) : [],
          })) : [],
      keywordSuggestions: Array.isArray(parsed.keywordSuggestions)
        ? (parsed.keywordSuggestions as string[]).slice(0, 10).map(k => String(k).substring(0, 50)) : [],
      headlineImprovement: typeof parsed.headlineImprovement === "string" ? parsed.headlineImprovement.substring(0, 200) : undefined,
      sourceUsed,
      parserUsed,
    };

    return new Response(JSON.stringify(output), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[cv-optimize] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
