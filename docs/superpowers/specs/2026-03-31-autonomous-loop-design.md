# Autonomous Loop — Design Spec

**Tarih:** 31 Mart 2026
**Durum:** Onaylandi
**Amac:** Claude'un bilgisayar basinda insan olmadan tam otonom calismasini saglamak

---

## Ozet

3 yeni script ile mevcut pipeline'in etrafina otonom dongu eklenir. Claude is bitirir, Computer Use ile Codex desktop app'e rapor verir, Codex yeni asama yazar, kullaniciya Telegram'dan detayli ozet gider, kullanici telefondan onaylar/revize eder/yon verir.

**Altin kural:** Kullanici "go" demeden Claude asla calismaya baslamaz.

---

## Mimari

```
autonomous-loop.sh (orchestrator — ana dongu)
  |
  |-- orchestrator.sh run (MEVCUT pipeline)
  |     |-- Grok brief
  |     |-- Claude Code implement
  |     |-- DeepSeek code review
  |     |-- Cerebras deep review
  |     |-- Gemini UAT
  |     |-- Grok sync
  |
  |-- codex-bridge.sh (Computer Use ile Codex iletisimi)
  |
  |-- telegram-gate.sh (kullanici onay kapisi)
```

Mevcut 11 AI agent + 5 MCP + 3 kalite kapisi sistemi degismiyor. Sadece ustune otonom dongu ekleniyor.

---

## Bilesenler

### 1. codex-bridge.sh

Computer Use ile Codex desktop app'e mesaj yazar ve cevap okur.

**Komutlar:**
- `report <ozet>` — Codex app'i ac, HelloTalent projesine git, ozeti yaz, gonder
- `read` — Codex'in cevabini oku (max 10dk bekle, 10sn arayla kontrol)
- `send-user-feedback <orijinal> <yorum>` — Kullanicinin Telegram mesajini + Claude'un teknik yorumunu Codex'e ilet

**Computer Use akisi (report):**
1. Codex desktop app'i on plana getir (veya ac)
2. HelloTalent projesini bul/sec
3. Mesaj alanina tikla
4. Raporu yaz: "Asama X bitti. [ozet]. Sonraki asamayi yaz."
5. Enter/gonder

**Computer Use akisi (read):**
1. 10 saniyede bir ekrani kontrol et
2. Codex'in cevabi geldi mi bak (yeni mesaj var mi)
3. Geldiyse metni oku ve stdout'a yaz
4. 10dk doldu cevap yoksa timeout hatasi dondur

**Guvenlik:**
- Sadece Codex app'e dokunur, baska pencereye gecmez
- Timeout ile sonsuz bekleme onlenir
- Her adim loglanir (reviews/codex-bridge.log)

### 2. telegram-gate.sh

Kullaniciya detayli asama ozeti gonderir ve onay bekler.

**Komutlar:**
- `notify <asama_no> <ozet_dosyasi>` — Telegram'dan detayli ozet gonder
- `wait` — Kullanicidan cevap gelene kadar bekle, sonucu dondur

**Telegram mesaj formati:**
```
🔄 Yeni Asama: 23

📋 Tema: [Codex'in yazdigi tema]
📁 Degisecek dosyalar:
  * dosya1.js (yeni/guncelleme)
  * dosya2.html (guncelleme)

🎯 Codex notu: [onemli notlar]
⚠️ Risk: [varsa]

→ "go" — onayla, Claude baslasin
→ "dont" — bu asamayi iptal et
→ veya ne istedigini yaz
```

**Wait sonuclari:**
- `go` → stdout: "GO"
- `dont` → stdout: "DONT"
- Diger her sey → stdout: "FEEDBACK:<mesaj metni>"

**Timeout yok** — kullanici cevap verene kadar bekler (sabah kahvede bile olabilir).

**Mevcut telegram-bot.sh ile cakisma onleme:**
- Ayri offset dosyasi kullanir (`.telegram-gate.offset`)
- Mevcut bot'un `/status`, `/log` vb. komutlari aynen calisir

### 3. autonomous-loop.sh

Ana dongu orchestrator. State machine olarak calisir.

**Komutlar:**
- `start` — Otonom donguyu baslat
- `stop` — Durdur
- `status` — Durum

**State Machine:**
```
IDLE
  | Autopilot yeni asama algilar
  v
PIPELINE
  | orchestrator.sh run (Grok→Claude→DeepSeek→Gemini→Grok)
  v
REPORT
  | codex-bridge.sh report "Asama X bitti..."
  v
WAIT_CODEX
  | codex-bridge.sh read (max 10dk)
  | Codex cevap verdi → AI-COLLAB.md guncellendi
  v
GATE
  | telegram-gate.sh notify + wait
  |
  |-- "go"      → PIPELINE'a don (yeni asama)
  |-- "dont"    → IDLE'a don (ama Telegram dinlemeye devam)
  |-- feedback  → codex-bridge.sh send-user-feedback
  |               → WAIT_CODEX'e don (Codex revize eder)
```

**"dont" davranisi:**
- Bu asamayi iptal eder
- Ama Telegram dinlemeye devam eder
- Kullanici yeni mesaj yazarsa → Codex'e iletir → dongu devam
- Hic yazmazsa → sonsuza kadar sessiz bekler
- Tam kapatmak icin: `./scripts/autonomous-loop.sh stop`

**State dosyasi:** `.autonomous-loop.state` — her adimda guncellenir. Crash recovery: restart'ta kaldigi yerden devam eder.

**Mevcut autopilot.sh ile iliski:**
- autopilot.sh hala AI-COLLAB.md'yi izler
- autonomous-loop aktifken autopilot kendi pipeline cagirisini atlar
- autonomous-loop pasifken autopilot eski gibi calisir (nohup fallback)

---

## Hata Yonetimi

| Hata | Davranis | Bildirim |
|------|----------|----------|
| Pipeline fail (orchestrator hata) | Dongu durur, Codex'e gitmez | Telegram: "Pipeline hata verdi. Log: ..." |
| Codex app acilamadi | 3 deneme, basarisizsa durur | Telegram: "Codex'e ulasilamiyor" |
| Codex 10dk cevap vermedi | Timeout, kullaniciya sorar | Telegram: "Codex cevap vermedi. Bekleyeyim mi?" |
| Telegram mesaj gonderilemedi | 3 retry, sonra log'a yaz | macOS notification fallback |
| Computer Use izin hatasi | Durur | Telegram: "Ekran izni gerekli" |
| Crash / restart | State dosyasindan devam | Telegram: "Dongu yeniden basladi, kaldigim yer: X" |

**Genel kural:** Hata oldugunda asla sessiz kalma — her zaman Telegram'dan bilgilendir. Telegram da calismiyorsa macOS notification.

---

## Dosya Yapisi

**Yeni dosyalar (3):**
```
scripts/autonomous-loop.sh
scripts/codex-bridge.sh
scripts/telegram-gate.sh
```

**Degisen dosyalar (1):**
```
scripts/autopilot.sh    → autonomous-loop aktifken kendi pipeline'ini atlar
```

**Runtime state dosyalari (.gitignore'a eklenir):**
```
.autonomous-loop.state
.autonomous-loop.pid
.telegram-gate.offset
```

**Dokunulmayan dosyalar:**
```
scripts/orchestrator.sh
scripts/telegram-bot.sh
scripts/grok-context.sh
scripts/deepseek-review.sh
scripts/autopilot-launcher.sh
scripts/setup-launchd.sh
```

**Env vars:**
```
TELEGRAM_BOT_TOKEN    → Zaten var
TELEGRAM_CHAT_ID      → Zaten var
```
Yeni env var gerekmiyor.

---

## Izin Siniri

Computer Use ile erisilebilecek uygulamalar:
- Codex desktop app ✅
- Terminal (test calistirma, git push) ✅
- Telegram script ✅
- Diger her sey ❌

---

## Kararlar

| Karar | Secim | Neden |
|-------|-------|-------|
| Codex iletisim yolu | Computer Use (Codex desktop app) | GPT 5.4 korunur, API'de yok |
| Codex bekleme suresi | Max 10 dakika | Uzun reasoning icin yeterli |
| Codex'e rapor formati | Kisa ozet | Token tasarrufu, Codex zaten context'i biliyor |
| Kullanici feedback iletimi | Orijinal mesaj + Claude yorumu | Codex hem kullanici niyetini hem teknik context'i gorur |
| "dont" davranisi | Asamayi iptal, dinlemeye devam | Kullanici istediginde yeni yon verebilir |
| Mimari yaklasim | Moduler (3 script) | SOLID, TDD ile test edilebilir, mevcut scriptler bozulmaz |
| Mevcut pipeline | Degismiyor | 11 agent + 5 MCP + 3 kalite kapisi aynen devam |
