# Turkish UI Conventions

## Language
- All user-facing text MUST be in Turkish
- Never use "röportaj" — always "mülakat" or "iş görüşmesi"
- Use proper Turkish characters: ç, ğ, ı, İ, ö, ş, ü

## Text Casing
- Turkish toLowerCase is special: I → ı (not i), İ → i
- Use trLower() and titleCaseTR() helpers in profil.html for safe casing
- PRESERVE_CASE array exists for acronyms: LVMH, H&M, COS, YSL, CEO, HR, AVM, TL

## Button Labels
- Primary action: verb + noun (e.g., "Profili Kaydet", "Değişiklikleri Uygula")
- Cancel: "Vazgeç" or "İptal"
- Delete: "Sil" (red styling)
- Confirm: "Onayla" or "Evet"

## Error Messages
- Format: "Hata: " + error.message
- Success: green text, auto-hide after 3-4 seconds
- Use var(--verm) for action colors, var(--muted) for secondary text

## Form Labels
- Always Turkish, no English mixed in labels
- Placeholder text: instructional ("Şirket adı yazın...", "0555 123 4567")
- Required field marker: red asterisk convention

## Industry Terms
- Aday = Candidate
- İşveren = Employer
- İK = HR (İnsan Kaynakları)
- Mülakat = Interview (NEVER röportaj)
- Pozisyon = Position/Role
- Deneyim = Experience
- Maaş = Salary (feature deliberately removed — don't reintroduce)
