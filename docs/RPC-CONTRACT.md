# RPC Contract — HelloTalent Supabase RPC Schema

> **Reform 11 May 2026 — Hallucination önleyici #1.** UI render kodu yazmadan önce bu dosya grep ZORUNLU. RPC/DB shape uydurmak YASAK (L4 — feedback_data_contract_no_invention).
>
> Yeni RPC eklendiğinde supabase-agent bu dosyaya append yapar. Dosya source of truth.

---

## Format

```markdown
### `<rpc_name>(<params>)`

**Tier:** T3 | **Context:** authenticated / service_role | **Migration:** YYYYMMDDHHMMSS_<name>

**Input:**
| Parametre | Tip | Nullable | Default | Açıklama |

**Output (JSON shape):**
```json
{ ... }
```

**RLS:** {policy guard açıklama}

**UI Usage:** {hangi sayfa render eder, hangi field gösterir}

**Edge cases:** {empty, error, validation}
```

---

## Active RPCs

### `get_my_candidate_id()`

**Tier:** T3 | **Context:** authenticated | **Migration:** baseline 20260322000000

**Input:** Yok

**Output:**
```json
{ "candidate_id": 12345 }
```

**RLS:** `auth.uid()` → `candidates.user_id` lookup, candidate kendi id'sini alır.

**UI Usage:** profil.html — child table query'lerinde `candidate_id` ön gereksinim.

---

### `is_employer()`

**Tier:** T3 | **Context:** authenticated | **Migration:** baseline

**Input:** Yok

**Output:**
```json
{ "is_employer": true }
```

**RLS:** `user_metadata.role === 'employer'` check.

**UI Usage:** ik.html — employer view filter.

---

### `search_employer_candidates(p_filter jsonb, p_limit int, p_offset int)`

**Tier:** T3 | **Context:** authenticated (is_employer guard) | **Migration:** 20260430211728_search_rpc_candidate_id_filter

**Input:**
| Parametre | Tip | Nullable | Default | Açıklama |
|---|---|---|---|---|
| `p_filter` | jsonb | Y | `{}` | `{ candidate_id, pozisyon, marka, sehir, ... }` |
| `p_limit` | int | Y | 50 | max 100 |
| `p_offset` | int | Y | 0 | pagination |

**Output:** Array of candidate row:
```json
{
  "candidate_id": 12345,
  "full_name": "...",
  "son_pozisyon": "...",
  "adres_il": "...",
  "toplam_deneyim_ay": 36,
  "match_score": 0.78,
  "match_reasons": ["pozisyon", "marka", "sehir"],
  "experiences": [...],
  "education": [...],
  "languages": [...]
}
```

**RLS:** is_employer guard + candidate.is_active + profile_completed filter.

**UI Usage:** hr-pool.html, hr-pipeline.html — aday liste render. `candidate_id` filter ile `getCandidate(id)` shape unified.

**Edge cases:** Empty result → `[]`. Filter geçersiz → 400 error.

---

### `hr_get_pipeline(p_position_id bigint)`

**Tier:** T3 | **Context:** authenticated (is_employer + company_id guard) | **Migration:** Sprint 7

**Input:**
| Parametre | Tip | Nullable | Açıklama |
|---|---|---|---|
| `p_position_id` | bigint | N | pozisyon id |

**Output:**
```json
{
  "pipeline": [
    {
      "candidate_id": 12345,
      "stage": "uzun_liste|kisa_liste|iletisime_gecildi",
      "added_at": "2026-05-08T...",
      "added_by_hr_id": "uuid",
      "candidate_full_name": "...",
      "candidate_pozisyon": "..."
    }
  ]
}
```

**Backlog:** `candidate_avatar_url` field eklenecek (extras query gereksizleştir).

**UI Usage:** hr-pipeline.html — 3-sütun board render.

---

### `bulk_add_to_pipeline(p_position_id bigint, p_candidate_ids bigint[], p_stage pipeline_stage)`

**Tier:** T3 | **Context:** authenticated (is_employer) | **Migration:** Phase D2 (commit f4b36e6)

**Input:**
| Parametre | Tip | Nullable | Default |
|---|---|---|---|
| `p_position_id` | bigint | N | — |
| `p_candidate_ids` | bigint[] | N | — |
| `p_stage` | pipeline_stage | Y | `'yeni'` |

**Output:**
```json
{ "inserted": 12, "skipped": 3, "errors": [] }
```

**UI Usage:** hr-pool.html — bulk add 50+ aday tek RPC.

---

### `mark_employer_thread_read(p_message_id bigint)`

**Tier:** T3 | **Context:** authenticated (is_employer + company_id) | **Migration:** Phase D2 (commit f4b36e6)

**Input:**
| Parametre | Tip | Nullable | Açıklama |
|---|---|---|---|
| `p_message_id` | bigint | N | mesaj id |

**Output:** void

**UI Usage:** hr-messages.html — employer-side thread okundu işareti.

---

### `purge_old_employer_notes()`

**Tier:** T3 | **Context:** service_role only (cron) | **Migration:** 20260505125000_a8_notes_retention_purge

**Input:** Yok

**Output:**
```json
{ "purged": 42 }
```

**Cron:** Günlük 02:00 UTC (`cron.schedule 'purge-employer-notes'`).

**KVKK:** retention_until > now() satırlar silinir. md.7 right of erasure.

---

## TODO (Backlog — yeni RPC ekleme)

- `recalculate_match_scores(p_position_id bigint)` — match score nightly cron (CURRENT-STATE backlog)
- `get_my_notes_about_me()` — KVKK md.11 aday self-view (A8 pending)
- `delete_my_employer_notes(p_note_id bigint)` — KVKK md.7 aday self-deletion (A8 pending)

---

## Maintenance

- Yeni RPC her zaman bu dosyaya append ile gelir (supabase-agent dispatch)
- Migration ID dosya adı ile sync
- Eski RPC deprecate edilirse `**Status:** DEPRECATED` etiketi
- UI'da RPC çağırmadan önce bu dosya grep şart (frontend agent impl mode pre-flight)

## Source

- Migration history: `supabase/migrations/`
- Edge function: `supabase/functions/`
- Önceki RPC referansları: `docs/SESSION-LOG.md`
- Code usage: `js/ik-*.js`, `js/profile-*.js`
