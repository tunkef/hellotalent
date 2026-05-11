# Spec: candidates.email + telefon UNIQUE Constraint (M1)

> **Tarih:** 2026-05-11 | **Tier:** T3 (migration) | **Status:** draft
> **Reform v3.4 MEDIUM #M1**

## Context

`candidates` tablosunda `email` ve `telefon` UNIQUE constraint YOK. Audit'te 9 toplam UNIQUE constraint var ama bu candidates'da değil. Bu:

- Duplicate kayıt riski (aynı kişi farklı user_id ile 2 candidate row açabilir)
- KVKK md.4 doğruluk ilkesi ihlali (aynı kişi farklı veri)
- İşveren arama (`search_employer_candidates`) duplicate sonuç gösterir
- Email/SMS notification spam riski (aynı kişiye 2× gönderim)

`auth.users.email` UNIQUE'tir ama `candidates.email` ekstra alan — kullanıcı signup sonrası farklı email girebilir.

## Migration

```sql
BEGIN;

-- 1. Mevcut duplicate detect (audit log)
DO $$
DECLARE
  dup_email INT;
  dup_phone INT;
BEGIN
  SELECT COUNT(*) INTO dup_email FROM (
    SELECT email FROM candidates WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1
  ) x;
  SELECT COUNT(*) INTO dup_phone FROM (
    SELECT telefon FROM candidates WHERE telefon IS NOT NULL GROUP BY telefon HAVING COUNT(*) > 1
  ) y;
  RAISE NOTICE '[M1] Duplicates: email=%, phone=%', dup_email, dup_phone;
  IF dup_email > 0 OR dup_phone > 0 THEN
    RAISE EXCEPTION '[M1] Mevcut duplicate var, önce manuel cleanup gerek. email=% phone=%', dup_email, dup_phone;
  END IF;
END $$;

-- 2. Email UNIQUE (NULL allowed çünkü account oluşur sonra email girilir)
CREATE UNIQUE INDEX IF NOT EXISTS candidates_email_unique_idx
  ON candidates (lower(email))
  WHERE email IS NOT NULL AND email <> '';

-- 3. Telefon UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS candidates_telefon_unique_idx
  ON candidates (telefon)
  WHERE telefon IS NOT NULL AND telefon <> '';

COMMIT;
```

## Rollback

```sql
DROP INDEX IF EXISTS candidates_email_unique_idx;
DROP INDEX IF EXISTS candidates_telefon_unique_idx;
```

## Pre-apply check

```sql
-- Duplicate var mı?
SELECT email, COUNT(*) FROM candidates WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1;
SELECT telefon, COUNT(*) FROM candidates WHERE telefon IS NOT NULL GROUP BY telefon HAVING COUNT(*) > 1;
```

Eğer duplicate varsa:
1. En son güncellenmiş (`updated_at DESC`) hariç soft-delete
2. KVKK md.7 erasure path
3. Sonra migration apply

## Verify post-apply

```sql
SELECT
  COUNT(*) FILTER (WHERE i.indisunique AND i.indrelid::regclass::text = 'candidates') AS unique_indexes,
  array_agg(DISTINCT pg_get_indexdef(i.indexrelid)) AS defs
FROM pg_index i
JOIN pg_class c ON c.oid = i.indrelid
WHERE c.relname = 'candidates';
```

## Tier zinciri

T3 — supabase-agent (migration yazıldı) → reviewer (audit mode) → Codex auto-trigger pre-commit.

## Approved? (Tuna)

- [ ] Onayla → migration timestamp ekle + commit
- [ ] Reddet
- [ ] Önce duplicate audit (production DB query)
