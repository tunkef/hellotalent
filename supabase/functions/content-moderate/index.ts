// content-moderate — Icerik moderasyonu (taciz, spam, uygunsuz icerik filtresi)
// Server-side: ANTHROPIC_API_KEY ile Claude haiku kullanir (en ucuz, en hizli)
// Kullanim: mesaj gonderme, coach post, profil aciklama oncesi cagrilir
// Maliyet: ~$0.0003/moderasyon (haiku 4.5)
//
// Input:  { text, context: "message" | "coach_post" | "profile" }
// Output: { safe: boolean, reason?: string, category?: string }

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = "claude-haiku-4-5-20251001"; // En ucuz, en hizli — moderasyon icin ideal

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://hellotalent.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ModerationInput {
  text: string;
  context: "message" | "coach_post" | "profile" | "comment";
}

interface ModerationOutput {
  safe: boolean;
  reason?: string;
  category?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    // Moderasyon API yoksa gecir (fail-open — icerik engellenmez)
    return new Response(
      JSON.stringify({ safe: true, reason: "moderation_unavailable" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const input: ModerationInput = await req.json();
    if (!input || !input.text || input.text.trim().length === 0) {
      return new Response(
        JSON.stringify({ safe: true, reason: "empty_input" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cok kisa metinler icin moderasyon atlama (performans)
    if (input.text.trim().length < 5) {
      return new Response(
        JSON.stringify({ safe: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contextLabels: Record<string, string> = {
      message: "isveren-aday mesajlasmasi",
      coach_post: "kariyer kocu makalesi",
      profile: "aday profil aciklamasi",
      comment: "yorum",
    };

    const systemPrompt = `Sen bir icerik moderasyon sistemisin. Turkiye perakende sektorune ozel profesyonel bir yetenek platformu icin calisiyorsun.

Gorevi: Verilen metni degerlendir ve su kategorilerde uygunsuzluk var mi kontrol et:
1. harassment: Taciz, zorbalik, asagilama
2. hate_speech: Nefret soylemi, ayrimcilik
3. sexual: Cinsel icerik veya imalari
4. spam: Reklam, tekrarlayan anlamsiz icerik, dolandiricilik
5. personal_info: Telefon numarasi, TC kimlik no, adres gibi kisisel veri paylasimi (mesaj baglami disinda)
6. profanity: Agir kufur

Yanitini SADECE JSON olarak ver:
{"safe": true} veya {"safe": false, "reason": "kisa aciklama", "category": "kategori_adi"}

Profesyonel is gorusmesi baglami: Normal is ilani, mulakat, kariyer tavsiyeleri guvenlidir.
Sert ama profesyonel geri bildirim guvenlidir.
Sadece acikca uygunsuz icerikleri engelle. Supheye dusmede gecir.`;

    const userPrompt = `Bagłam: ${contextLabels[input.context] || "genel"}
Metin: "${input.text.substring(0, 2000)}"`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 100,
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      }),
    });

    if (!res.ok) {
      // API hatasi → fail-open (icerik engellenmez)
      return new Response(
        JSON.stringify({ safe: true, reason: "api_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const aiText = data?.content?.[0]?.text || "";

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");
      const result: ModerationOutput = JSON.parse(jsonMatch[0]);
      return new Response(
        JSON.stringify({
          safe: result.safe !== false,
          reason: result.reason || undefined,
          category: result.category || undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch {
      // Parse hatasi → fail-open
      return new Response(
        JSON.stringify({ safe: true, reason: "parse_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("[content-moderate] Error:", err);
    return new Response(
      JSON.stringify({ safe: true, reason: "internal_error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
