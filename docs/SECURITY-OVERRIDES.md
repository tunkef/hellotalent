# Security Overrides — Audit Trail

> Best-practice'in dışına çıkan açık Tuna kararları. Her override için:
> tarih, kapsam, gerekçe, geri alma koşulu. Compromise/breach durumunda
> override geçersizdir — default policy uygulanır.

---

## SO1: GitHub PAT — no expiration + geniş scope

**Tarih:** 2026-05-16
**Karar veren:** Tuna (explicit, chat'te 2 kez doğrulandı)
**Kapsam:**
- 2 mevcut token (`for claude`, `hellotalent deploy`) no expiration
- `for claude` token geniş scope: admin:enterprise, admin:org, admin:gpg_key,
  admin:public_key, admin:ssh_signing_key, admin:repo_hook, admin:org_hook,
  delete_repo, delete:packages, audit_log, codespace, copilot, notifications,
  project, user, write:network_configurations, write:packages, repo, workflow,
  write:discussion

**Gerekçe (Tuna):**
- Kapalı geliştirme ortamı — public deployment yok henüz
- Friction azaltma — scope dar olunca her gelişimde yeni token yorgunluğu
- Tek developer — least-privilege ihlal vektörü düşük

**Default policy (override edildi):**
- TTL: 90 gün
- Scope: `repo` + `workflow` (least-privilege)

**Geri alma koşulları (override iptal):**
1. **Public launch** — production trafik başlayınca least-privilege + 90gün TTL zorunlu
2. **Team genişlemesi** — 2+ developer olursa scope per-role
3. **Compromise event** — chat'e paylaşma, leak, hijack → hemen rotate, scope daralt
4. **Audit/compliance** — SOC2/ISO27001 hazırlığı başlayınca

**İlgili dosyalar:**
- `scripts/token-rotation-guide.sh` — Tuna tercih default
- `scripts/token-age-tracker.sh` — 90gün alert ama "OK" sayar
- `.claude/agent-memory/pending-approvals.md` A1 — orijinal rotation entry

---

## SO1 Addendum 2026-05-16 — kapsam genişletildi

Cloudflare Access Service Token ("HelloTalent UAT Playwright") rotation sırasında Tuna yine Non-expiring tercih etti. SO1 kapsamı GitHub PAT'tan tüm CF Access Service Token'larına genişledi.

**Kapsam ek:**
- CF Access Service Tokens: Non-expiring kabul (Tuna explicit)
- Gerekçe aynı: kapalı dev, friction azaltma

**Aktif Non-expiring tokenlar (SO1 kapsamında):**
- GitHub PAT: `for claude`, `hellotalent deploy`
- CF Access Service Token: `HelloTalent UAT Playwright` (rotated 2026-05-16 via Chrome MCP)

**Geri alma koşulları aynı** (public launch, team genişlemesi, compromise event, audit/compliance).

**Compromise notu:** CF Access Service Token secret 2026-05-16 rotation sırasında chat screenshot'a düştü. Bu token sadece Playwright UAT testleri için (prod etkisi yok), low-risk kabul edildi. Sonraki audit cycle'da gerekirse tekrar rotate.

---

## Format

```markdown
## SO{N}: {kapsam}

**Tarih:** YYYY-MM-DD
**Karar veren:** {kim, nasıl onayladı}
**Kapsam:** {hangi kural override ediliyor}
**Gerekçe:** {neden}
**Default policy:** {ne ihlal ediliyor}
**Geri alma koşulları:** {ne olursa override iptal}
**İlgili dosyalar:** {referans}
```

**Append-only.** Override iptal edilirse status: `REVOKED YYYY-MM-DD — neden`.
