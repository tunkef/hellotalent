#!/usr/bin/env node
/**
 * Harici AI API bağlantı ve kredi testi
 * Ortam değişkenleri: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY
 * Kullanım: node scripts/test-ai-apis.mjs
 */

const TEST_MSG = 'Merhaba, sistem testi';

function now() { return Date.now(); }

async function testOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { provider: 'OpenAI (GPT)', status: 'skip', error: 'OPENAI_API_KEY tanımlı değil', ms: 0 };
  const start = now();
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: TEST_MSG }],
        max_tokens: 50
      })
    });
    const ms = now() - start;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body.error?.message || body.message || res.statusText;
      return { provider: 'OpenAI (GPT)', status: 'fail', httpStatus: res.status, error: err, ms };
    }
    const text = body.choices?.[0]?.message?.content || '';
    return { provider: 'OpenAI (GPT)', status: 'ok', httpStatus: res.status, ms, preview: text.slice(0, 80) };
  } catch (e) {
    return { provider: 'OpenAI (GPT)', status: 'error', error: e.message || String(e), ms: now() - start };
  }
}

async function testAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { provider: 'Anthropic (Claude)', status: 'skip', error: 'ANTHROPIC_API_KEY tanımlı değil', ms: 0 };
  const start = now();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 64,
        messages: [{ role: 'user', content: TEST_MSG }]
      })
    });
    const ms = now() - start;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body.error?.message || body.message || res.statusText;
      return { provider: 'Anthropic (Claude)', status: 'fail', httpStatus: res.status, error: err, ms };
    }
    const text = body.content?.[0]?.text || '';
    return { provider: 'Anthropic (Claude)', status: 'ok', httpStatus: res.status, ms, preview: text.slice(0, 80) };
  } catch (e) {
    return { provider: 'Anthropic (Claude)', status: 'error', error: e.message || String(e), ms: now() - start };
  }
}

async function testGemini() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) return { provider: 'Google (Gemini)', status: 'skip', error: 'GEMINI_API_KEY / GOOGLE_GEMINI_API_KEY tanımlı değil', ms: 0 };
  const start = now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: TEST_MSG }] }],
        generationConfig: { maxOutputTokens: 50 }
      })
    });
    const ms = now() - start;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body.error?.message || res.statusText;
      return { provider: 'Google (Gemini)', status: 'fail', httpStatus: res.status, error: err, ms };
    }
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { provider: 'Google (Gemini)', status: 'ok', httpStatus: res.status, ms, preview: text.slice(0, 80) };
  } catch (e) {
    return { provider: 'Google (Gemini)', status: 'error', error: e.message || String(e), ms: now() - start };
  }
}

async function testXAI() {
  const key = process.env.XAI_API_KEY;
  if (!key) return { provider: 'xAI (Grok)', status: 'skip', error: 'XAI_API_KEY tanımlı değil', ms: 0 };
  const start = now();
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [{ role: 'user', content: TEST_MSG }],
        max_tokens: 50
      })
    });
    const ms = now() - start;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body.error?.message || body.message || res.statusText;
      return { provider: 'xAI (Grok)', status: 'fail', httpStatus: res.status, error: err, ms };
    }
    const text = body.choices?.[0]?.message?.content || '';
    return { provider: 'xAI (Grok)', status: 'ok', httpStatus: res.status, ms, preview: text.slice(0, 80) };
  } catch (e) {
    return { provider: 'xAI (Grok)', status: 'error', error: e.message || String(e), ms: now() - start };
  }
}

function interpretError(r) {
  if (r.httpStatus === 401 || r.httpStatus === 403) return 'API anahtarı geçersiz veya yetkisiz.';
  if (r.httpStatus === 429) return 'Kota / rate limit veya bakiye (kredi) yetersiz.';
  if (r.httpStatus >= 500) return 'Sağlayıcı taraflı hata veya kesinti.';
  return r.error || 'Bilinmeyen hata';
}

async function main() {
  console.log('=== Harici AI API Bağlantı ve Kredi Testi ===\n');
  console.log('Test mesajı: "' + TEST_MSG + '"\n');

  const results = await Promise.all([
    testOpenAI(),
    testAnthropic(),
    testGemini(),
    testXAI()
  ]);

  const report = [];
  for (const r of results) {
    const line = {
      Sağlayıcı: r.provider,
      Durum: r.status === 'ok' ? 'OK' : r.status === 'skip' ? 'Atlandı (anahtar yok)' : 'Hata',
      'Yanıt süresi (ms)': r.ms || '—',
      Açıklama: ''
    };
    if (r.status === 'ok') {
      line.Açıklama = r.preview ? `Yanıt: "${r.preview}..."` : 'Yanıt alındı';
    } else if (r.status === 'skip') {
      line.Açıklama = r.error;
    } else {
      line.Açıklama = r.httpStatus ? `HTTP ${r.httpStatus}: ${interpretError(r)} — ${r.error || ''}` : (r.error || '');
    }
    report.push(line);
  }

  console.log('--- RAPOR ---\n');
  report.forEach((r, i) => {
    console.log(`${i + 1}. ${r.Sağlayıcı}`);
    console.log(`   Durum: ${r.Durum}`);
    console.log(`   Yanıt süresi: ${r['Yanıt süresi (ms)']} ms`);
    console.log(`   Açıklama: ${r.Açıklama}`);
    console.log('');
  });

  const ok = results.filter(r => r.status === 'ok').length;
  const skip = results.filter(r => r.status === 'skip').length;
  const fail = results.filter(r => r.status === 'fail' || r.status === 'error').length;
  console.log('--- ÖZET ---');
  console.log(`Başarılı: ${ok} | Atlandı (anahtar yok): ${skip} | Hata: ${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
