// translate-text — Claude Haiku ile metin çevirisi (~$0.0003/çeviri)
// Client: supabase.functions.invoke('translate-text', { body: { text, target_lang } })

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = "claude-haiku-4-5-20251001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const { text, target_lang } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (text.length > 3000) {
      return new Response(
        JSON.stringify({ error: "Text too long (max 3000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = target_lang || "tr";
    const langName = lang === "tr" ? "Türkçe" : lang === "en" ? "İngilizce" : lang;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `Aşağıdaki metni ${langName} diline çevir. Sadece çeviriyi döndür, başka bir şey ekleme. Profesyonel ve doğal bir dil kullan.\n\n${text.trim()}`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errBody);
      throw new Error("Translation API error");
    }

    const data = await anthropicRes.json();
    const translated = data?.content?.[0]?.text?.trim();

    if (!translated) {
      throw new Error("Empty translation response");
    }

    return new Response(
      JSON.stringify({ translated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("translate-text error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
