# Studio Freeze + Koç Decouple + Duyurular Feed — Design Spec

**Tarih:** 2026-04-13
**Karar:** K030 (vault/06-kararlar/karar-defteri.md)
**Durum:** Approved, writing-plans'e hazır
**Yazarlar:** Tuna (CEO) + Claude (CTO)

---

## 1. Amaç

Stüdyo yüzeyini geçici olarak dondurmak, Koç sistemini Stüdyo'dan ayırmak ve yerine admin-driven "HelloTalent'ten Bilgiler" duyuru feed sistemi kurmak.

**Stratejik gerekçe:**
- Stüdyo karmaşık, tamamlanmamış, MVP 1 kritik yoluna engel
- Koç sistemi uzun süre pasif kalacak, ama backend korunacak (geri gelebilir)
- Admin, adaylara hızlı haber/duyuru kanalı istiyor (şirket girişi, feature duyurusu, platform ipucu)
- İşleyiş Koç mantığına benzer ama içerik kaynağı ve editoryal süreç farklı

**Prensipler:**
- Asla silme. Dondur. Kod + DB + data dokunulmaz kalır.
- Unfreeze path her adımda dokümante.
- Regression sıfır hedef (820/820 test suite).
- Vanilla HTML/CSS/JS pattern (framework eklenmez).

---

## 2. Scope

**Kapsam içi:**
- Koç ↔ Stüdyo decouple (cross-link, teaser fn, global stub)
- Stüdyo paneli "yakında" grid'e dönüştürme
- Sidebar + bottom nav + admin.html Stüdyo tab disable + "Yakında" chip
- `coach-studio.html` direct ziyaret redirect + noindex
- Yeni `ht_announcements` tablo ailesi + RLS + RPC + storage policy
- `profil-duyurular.js` feed render + like + carousel + markdown
- `profil-genel.js` feed mount noktası
- Bildirimler sayfası toggle "Bildirimler | Duyurular"
- `admin-announcements.js` LinkedIn-style composer (text + multi-image carousel + video + link + preview)
- `admin.html` yeni Duyurular tab
- Vault K030 + D1-D18 task set
- Full test piramidi (unit 80 / integration 15 / e2e 5)

**Kapsam dışı:**
- Email notification worker (yapılmamış, ileride)
- Push notification (PK1-3 mevcut backlog)
- Coach rename UI işi (sadece "HelloTalent'ten Bilgiler" kavramı yeni feed'e taşınır; Koç kendi koduyla dormant)
- Full unfreeze implementasyonu (dokümante ama yapılmaz)
- Badge/streak sisteminin freeze-era davranışı için ayrı redesign (conditional render fallback yeterli)

---

## 3. Architecture

Üç ardışık faz, her biri ayrı PR + deploy + gözlem.

```
FAZ A — DECOUPLE  (PR 1, minimal)
  - profil-studio.js cross-link map dormant banner
  - profil-genel.js _htGenelCoachTeaser boşalt
  - window.openCoachDetail stub
  - Regression test

FAZ B — FREEZE STUDIO  (PR 2)
  - profil.html switchPanel('mulakat') guard
  - panel-soon.js + css (4 kart yakında grid)
  - profil-studio.js frozen banner (kod değişmez)
  - Sidebar + bottom nav chip
  - coach-studio.html noindex + redirect
  - admin.html Studio tab disable
  - Freeze test suite

FAZ C — DUYURULAR FEED  (PR 3, en büyük)
  - Migration: ht_announcements, _media, _likes + RLS + RPC + storage policy
  - profil-duyurular.js + css/duyurular.css
  - profil-genel.js feed mount
  - Bildirimler toggle
  - admin.html yeni tab + admin-announcements.js composer
  - Unit + integration + e2e test
```

**Katman haritası:**

| Katman | Dosya | Durum |
|---|---|---|
| UI — Feed | `profil-duyurular.js` | YENİ |
| UI — Composer | `admin-announcements.js` | YENİ |
| UI — Yakında grid | `panel-soon.js`, `css/panel-soon.css` | YENİ |
| UI — Feed style | `css/duyurular.css` | YENİ |
| UI — Mount | `profil-genel.js` | DEĞİŞİM |
| UI — Gate | `profil.html` switchPanel | DEĞİŞİM |
| UI — Admin tab | `admin.html` | DEĞİŞİM |
| UI — Bildirimler toggle | mevcut bildirimler paneli dosyası | DEĞİŞİM |
| UI — Frozen banner | `profil-studio.js` | COMMENT |
| Data — Schema | `supabase/migrations/20260413XXXXXX_ht_announcements.sql` | YENİ |
| Data — RPC | `get_announcements_feed`, `toggle_announcement_like`, `get_unread_announcement_count` | YENİ |
| Data — Policy | 8 RLS policy + storage bucket policy | YENİ |
| Data — Helper | `is_admin()` (yoksa create) | YENİ/IDEMPOTENT |
| Storage | `cvs` bucket `announcements/{admin_uuid}/{post_uuid}/{media_uuid}.{ext}` | YENİ PREFIX |
| Test — Unit | `tests/unit/duyurular-*.spec.js` | YENİ |
| Test — Integration | `tests/integration/duyurular-rls.spec.js` | YENİ |
| Test — E2E | `tests/e2e/duyurular-flow.spec.js` | YENİ |
| Test — Decouple | `tests/faz-a-decouple.spec.js` | YENİ |
| Test — Freeze | `tests/faz-b-freeze.spec.js` | YENİ |
| Doc | `docs/studio-foundation.md` FROZEN bölümü | DEĞİŞİM |
| Doc | `vault/06-kararlar/karar-defteri.md` K030 | DEĞİŞİM |
| Doc | `vault/02-urun/yapilacaklar.md` D1-D18 | DEĞİŞİM |

---

## 4. Components

### 4.1 FAZ A — Decouple detay

**`profil-studio.js` (dormant banner):**
Dosya başına frozen yorum bloğu. Cross-link map'lerin (`COMP_TO_COACH_CATEGORY`, `COACH_CAT_TO_COMP`, `MODULE_SLUG_TO_COMP`, `COMP_TO_MODULE_SLUG`) üstüne:
```js
// FROZEN 2026-04-13 (K030): cross-link maps dormant until unfreeze.
// Do not modify. See docs/studio-foundation.md unfreeze section.
```

**`profil-genel.js`:**
```js
// FROZEN 2026-04-13 (K030): backward-compat stub
window._htGenelCoachTeaser = function(){ /* noop */ };

window.openCoachDetail = function(){
  console.warn('[frozen:K030] openCoachDetail disabled');
};
```

Yeni fn (FAZ A'da iskelet, FAZ C'de dolar):
```js
window._htGenelMountDuyuruFeed = function(containerEl){
  // FAZ A: placeholder
  // FAZ C: _htLoadDuyuruFeed(containerEl, { limit: 10 });
};
```

### 4.2 FAZ B — Freeze detay

**`panel-soon.js`:**
```js
(function(){
  const CARDS = [
    { icon: 'mic', title: 'Mülakat demoları', desc: 'Gerçek senaryo, gerçek sorular.' },
    { icon: 'target', title: 'Yetkinlik bazlı çalışma', desc: 'Güçlü ve zayıf yönleri ayrıştır.' },
    { icon: 'book', title: 'Mülakat teknikleri', desc: 'STAR, soru tipleri, hazırlık rehberi.' },
    { icon: 'store', title: 'Mağaza bilgileri', desc: 'Sektör içgörüleri, KPI rehberi.' },
  ];

  window._htRenderPanelSoon = function(root){
    root.innerHTML = '';
    const header = document.createElement('header');
    header.className = 'ht-soon-header';
    header.innerHTML = '<h1>Stüdyo</h1><p>Yakında geliyor.</p>';

    const grid = document.createElement('div');
    grid.className = 'ht-soon-grid';
    grid.setAttribute('role', 'region');
    grid.setAttribute('aria-label', 'Stüdyo yakında — içerik önizleme');

    CARDS.forEach(c => {
      const card = document.createElement('article');
      card.className = 'ht-soon-card';
      card.innerHTML = `
        <span class="ht-soon-chip">Yakında</span>
        <div class="ht-soon-icon" aria-hidden="true">${c.icon}</div>
        <h3>${c.title}</h3>
        <p>${c.desc}</p>
      `;
      grid.appendChild(card);
    });

    root.appendChild(header);
    root.appendChild(grid);
  };
})();
```

**`css/panel-soon.css`:**
- `.ht-soon-grid` — CSS grid 2×2 desktop, 1 col mobile (@media 390px)
- `.ht-soon-card` — padding 24, radius 16, border var(--border), bg var(--bg)
- `.ht-soon-chip` — pill, var(--verm) bg, white text, upper-right absolute
- `.ht-soon-icon` — 32px, var(--navy)
- `cursor: default`, click handler yok
- Dark mode: `html[data-theme='dark']` semantic override

**`profil.html` switchPanel:**
```js
if (panelKey === 'mulakat') {
  var root = document.querySelector('[data-panel="mulakat"]');
  if (window._htRenderPanelSoon) {
    window._htRenderPanelSoon(root);
  }
  return;
}
```

`profil-studio.js` script tag kalır (dormant load). `_htLoadStudio` hiç çağrılmaz.

**Sidebar + bottom nav:**
```html
<a data-panel="mulakat">
  Stüdyo
  <span class="ht-chip ht-chip--soon">Yakında</span>
</a>
```

**`coach-studio.html` head:**
```html
<meta name="robots" content="noindex, nofollow">
<script>
  // Redirect to profil.html (canonical shell)
  if (window.self === window.top) {
    window.location.replace('profil.html#mulakat');
  }
</script>
```

**`admin.html`:**
- Studio tab `disabled` class + "Yakında" chip
- Event handler skip
- `admin-studio-modules.js` script tag kalır (dormant)
- Koç tab aktif kalır

**`profil-studio.js` frozen banner:**
```js
/* ============================================================
 * FROZEN — 2026-04-13 (K030)
 * Reason: Studio paused until further notice.
 * Status: Structure preserved, no runtime execution.
 *
 * Unfreeze steps (see docs/studio-foundation.md):
 *   1. profil.html switchPanel('mulakat') → restore _htLoadStudio
 *   2. Sidebar + bottom nav "Yakında" chip kaldır
 *   3. admin.html Studio tab enable
 *   4. panel-soon.js mount kaldır
 *   5. profil-genel.js _htGenelCoachTeaser restore (git blame pre-K030)
 *
 * DO NOT DELETE — structural preservation required.
 * ============================================================ */
```

### 4.3 FAZ C — Duyurular detay

**DB Schema (`supabase/migrations/20260413XXXXXX_ht_announcements.sql`):**

```sql
-- is_admin() helper (idempotent)
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT coalesce(
    (auth.jwt() ->> 'role') = 'admin',
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Main tables
CREATE TABLE IF NOT EXISTS ht_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body_md text NOT NULL CHECK (length(body_md) BETWEEN 1 AND 8000),
  category text CHECK (category IN ('feature','sirket','ipucu','genel')),
  cta_url text,
  cta_label text,
  pinned_until timestamptz,
  published_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  like_count int DEFAULT 0 CHECK (like_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ht_ann_feed ON ht_announcements
  (pinned_until DESC NULLS LAST, published_at DESC)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS ht_announcement_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES ht_announcements(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image','video','link')),
  storage_path text,
  external_url text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CHECK (
    (media_type IN ('image','video') AND storage_path IS NOT NULL AND external_url IS NULL) OR
    (media_type = 'link' AND external_url IS NOT NULL AND storage_path IS NULL)
  )
);

CREATE INDEX idx_ht_ann_media_parent ON ht_announcement_media(announcement_id, order_index);

CREATE TABLE IF NOT EXISTS ht_announcement_likes (
  announcement_id uuid NOT NULL REFERENCES ht_announcements(id) ON DELETE CASCADE,
  candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (announcement_id, candidate_id)
);

CREATE INDEX idx_ht_ann_likes_candidate ON ht_announcement_likes(candidate_id);

-- RLS
ALTER TABLE ht_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ht_announcement_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE ht_announcement_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY ht_ann_select_active ON ht_announcements
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY ht_ann_insert_admin ON ht_announcements
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND admin_id = auth.uid());

CREATE POLICY ht_ann_update_own ON ht_announcements
  FOR UPDATE TO authenticated
  USING (is_admin() AND admin_id = auth.uid())
  WITH CHECK (is_admin() AND admin_id = auth.uid());

CREATE POLICY ht_ann_delete_own ON ht_announcements
  FOR DELETE TO authenticated
  USING (is_admin() AND admin_id = auth.uid());

CREATE POLICY ht_ann_media_select ON ht_announcement_media
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ht_announcements a
    WHERE a.id = announcement_id AND a.is_active = true
  ));

CREATE POLICY ht_ann_media_write_admin ON ht_announcement_media
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ht_announcements a
    WHERE a.id = announcement_id AND a.admin_id = auth.uid() AND is_admin()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM ht_announcements a
    WHERE a.id = announcement_id AND a.admin_id = auth.uid() AND is_admin()
  ));

CREATE POLICY ht_ann_likes_select_own ON ht_announcement_likes
  FOR SELECT TO authenticated
  USING (candidate_id = get_my_candidate_id());

CREATE POLICY ht_ann_likes_write_own ON ht_announcement_likes
  FOR ALL TO authenticated
  USING (candidate_id = get_my_candidate_id())
  WITH CHECK (candidate_id = get_my_candidate_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON ht_announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ht_announcement_media TO authenticated;
GRANT SELECT, INSERT, DELETE ON ht_announcement_likes TO authenticated;

-- Like count sync trigger
CREATE OR REPLACE FUNCTION sync_ht_ann_like_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ht_announcements SET like_count = like_count + 1 WHERE id = NEW.announcement_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ht_announcements SET like_count = greatest(like_count - 1, 0) WHERE id = OLD.announcement_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ht_ann_like_count
  AFTER INSERT OR DELETE ON ht_announcement_likes
  FOR EACH ROW EXECUTE FUNCTION sync_ht_ann_like_count();

-- RPCs
CREATE OR REPLACE FUNCTION get_announcements_feed(p_limit int DEFAULT 10, p_offset int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  title text,
  body_md text,
  category text,
  cta_url text,
  cta_label text,
  published_at timestamptz,
  pinned_until timestamptz,
  like_count int,
  liked_by_me boolean,
  media jsonb
) AS $$
  SELECT
    a.id, a.title, a.body_md, a.category, a.cta_url, a.cta_label,
    a.published_at, a.pinned_until, a.like_count,
    EXISTS (
      SELECT 1 FROM ht_announcement_likes l
      WHERE l.announcement_id = a.id AND l.candidate_id = get_my_candidate_id()
    ) AS liked_by_me,
    coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id, 'type', m.media_type,
        'storage_path', m.storage_path, 'external_url', m.external_url,
        'order_index', m.order_index
      ) ORDER BY m.order_index)
      FROM ht_announcement_media m
      WHERE m.announcement_id = a.id
    ), '[]'::jsonb) AS media
  FROM ht_announcements a
  WHERE a.is_active = true
  ORDER BY
    CASE WHEN a.pinned_until IS NOT NULL AND a.pinned_until > now() THEN 0 ELSE 1 END,
    a.pinned_until DESC NULLS LAST,
    a.published_at DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION toggle_announcement_like(p_announcement_id uuid)
RETURNS boolean AS $$
DECLARE
  v_candidate_id bigint := get_my_candidate_id();
  v_liked boolean;
BEGIN
  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM ht_announcement_likes
    WHERE announcement_id = p_announcement_id AND candidate_id = v_candidate_id
  ) INTO v_liked;

  IF v_liked THEN
    DELETE FROM ht_announcement_likes
    WHERE announcement_id = p_announcement_id AND candidate_id = v_candidate_id;
    RETURN false;
  ELSE
    INSERT INTO ht_announcement_likes (announcement_id, candidate_id)
    VALUES (p_announcement_id, v_candidate_id);
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_announcement_count(p_since timestamptz)
RETURNS int AS $$
  SELECT count(*)::int FROM ht_announcements
  WHERE is_active = true AND published_at > coalesce(p_since, 'epoch'::timestamptz);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_announcements_feed(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_announcement_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_announcement_count(timestamptz) TO authenticated;

-- Storage policy (cvs bucket, announcements/ prefix, admin-only write)
-- Note: storage.objects policies applied via Supabase dashboard or separate SQL
-- Admin write: bucket_id='cvs' AND (storage.foldername(name))[1]='announcements' AND (storage.foldername(name))[2]=auth.uid()::text AND is_admin()
-- Authenticated read: bucket_id='cvs' AND (storage.foldername(name))[1]='announcements' (signed URL)
```

**`profil-duyurular.js` (feed client):**
- `_htLoadDuyuruFeed(containerEl, opts)` — RPC call, signed URL batch, render
- `_htRenderAnnouncementCard(post, signedUrls)` — header (tarih + author) + body + media + footer (like + CTA)
- `_htRenderMediaCarousel(mediaArray, signedUrls)` — swipeable, prev/next, dots, keyboard arrows
- `_htToggleAnnouncementLike(id, btn, countEl)` — optimistic + rollback
- `_htSanitizeMarkdown(body_md)` — DOMPurify + marked (CDN veya mevcut dep kontrol)
- `_htFormatRelativeDate(ts)` — "2 saat önce", "dün", "3 gün önce" (Turkish)

**`admin-announcements.js` (composer):**
- List view: tablo + pin/unpin/edit/archive/delete
- Composer modal:
  - Title input
  - Body textarea (markdown) + live preview pane
  - Category dropdown (4 value)
  - Media drop zone:
    - Multi-image drag-drop → thumbnail row + reorder
    - Video upload (single)
    - Link input (URL paste → preview card)
  - CTA url + label (opsiyonel)
  - Pin toggle + tarih seçici
  - Buttons: İptal / Taslak / Yayınla
  - Live candidate-side preview card (birebir feed render)

**`profil-genel.js` FAZ C güncelleme:**
```js
window._htGenelMountDuyuruFeed = function(containerEl){
  if (window._htLoadDuyuruFeed) {
    window._htLoadDuyuruFeed(containerEl, { limit: 10 });
  }
};
```

Genel Bakış panel'in bento grid altına yeni section:
```html
<section class="ht-duyuru-feed-section" data-mount="duyuru-feed"></section>
```

**Bildirimler paneli toggle:**
```html
<div class="ht-segment" role="tablist">
  <button role="tab" data-tab="bildirim" aria-selected="true">Bildirimler</button>
  <button role="tab" data-tab="duyuru" aria-selected="false">
    Duyurular <span class="ht-badge" data-unread-count></span>
  </button>
</div>
```

Duyurular tab click → `_htLoadDuyuruFeed(container, { limit: 50, full: true, infinite: true })` → localStorage `ht_last_duyuru_seen = now()` → badge reset.

---

## 5. Data Flow

### 5.1 Admin post yayınlama
1. Admin composer aç → title/body/category/media/cta doldur
2. Media her biri için `supabase.storage.upload('cvs', 'announcements/{admin_id}/tmp_{uuid}/{file}')`
3. "Yayınla" → INSERT ht_announcements → RETURNING id
4. Her tmp_ path rename: `announcements/{admin_id}/{post_id}/{media_uuid}.{ext}`
5. INSERT ht_announcement_media (order_index korunur)
6. UI list refresh + toast

### 5.2 Candidate feed okuma (Genel Bakış)
1. Panel açılır → `_htGenelMountDuyuruFeed(section)`
2. RPC `get_announcements_feed(10, 0)` → post rows + media jsonb + liked_by_me
3. Media storage paths topla → `signStorageUrls(paths)` batch signed URL map
4. Her post için `_htRenderAnnouncementCard` DOM mount
5. Intersection observer → viewport "seen" işaretle (localStorage timestamp)

### 5.3 Like
1. Click → optimistic UI toggle
2. RPC `toggle_announcement_like(id)` → trigger like_count sync
3. Dönen bool state doğrulama
4. Hata → rollback + toast + 1 retry

### 5.4 Bildirimler — Duyurular tab
1. Toggle click → container clear → `_htLoadDuyuruFeed({ limit: 50, full: true, infinite: true })`
2. Infinite scroll → offset += 50
3. localStorage `ht_last_duyuru_seen = now()`
4. Header avatar badge → `get_unread_announcement_count(since)` sıfırlanır

### 5.5 FAZ B — Studio panel yakında
1. `switchPanel('mulakat')` → `_htRenderPanelSoon(root)`
2. 4 statik kart render
3. `_htLoadStudio` çağrılmaz

### 5.6 FAZ A — Coach decouple
1. `_htGenelCoachTeaser()` → noop
2. `openCoachDetail()` → console.warn
3. Cross-link map'ler dormant (caller yok)

---

## 6. Error Handling + Edge Cases

### Admin composer
| Senaryo | Davranış |
|---|---|
| Upload network fail | Thumbnail kırmızı border + retry, diğerleri korunur |
| Storage quota | Toast "depolama limiti", rollback tmp_ cleanup |
| Büyük dosya (image>10MB, video>50MB) | Client reject + uyarı |
| RPC fail | tmp_ cleanup, form açık, error göster |
| Çoklu admin pin çakışması | Last-write-wins |
| Taslak kaydet | is_active=false, feed'de görünmez, admin "Taslak" chip |
| Markdown XSS | DOMPurify + marked, innerHTML yasak |
| Link preview fail | Raw URL gösterim |

### Candidate feed
| Senaryo | Davranış |
|---|---|
| get_announcements_feed fail | "Yüklenemedi" + retry, Genel Bakış panelinin geri kalanı çalışır |
| Signed URL fail (tek media) | Placeholder + ikon, post render eder |
| Signed URL batch fail | Metin-only render |
| Empty feed | "Henüz duyuru yok" empty state |
| Like fail | Rollback + toast + 1 retry |
| Like spam | 300ms debounce |
| Unauth | Feed render yok (panel auth-gated) |
| is_active=false cached | Refresh'te kaybolur, detay 404 fallback |

### Freeze / Decouple
| Senaryo | Davranış |
|---|---|
| Bookmark `profil.html#mulakat` | panel-soon render |
| `coach-studio.html` direct | noindex + redirect profil.html |
| candidate_studio_progress data | Dokunulmaz, insert yok |
| Badge issue | Freeze sırasında yeni yok, eski badge conditional render |
| Coach background data | Dormant, intact |
| Cross-link map'ler | Dormant, caller yok |
| Streak widget | Freeze'de gizlenir veya "Stüdyo yakında" fallback |

### Rail grid
| Senaryo | Davranış |
|---|---|
| Click | cursor default, no handler |
| Mobile 390 | 1 col |
| Dark mode | Semantic token override |
| A11y | `role="region"`, chip okunur |

### Bildirimler toggle
| Senaryo | Davranış |
|---|---|
| Önceden açılmış | Default Bildirimler tab, sessionStorage |
| Duyuru yok | Duyurular tab empty state |
| Unread 100+ | Badge "99+" cap |

### Migration/deploy
| Senaryo | Davranış |
|---|---|
| Migration deploy edilmeden frontend gider | RPC yok → feed error → Genel Bakış çalışır (graceful) |
| is_admin() yoksa | Migration idempotent oluşturur |
| Storage policy eksik | Composer upload fail |
| Rollback | Git revert + ROLLBACK migration |

### Güvenlik
- Body markdown: DOMPurify + marked sanitize
- Storage path traversal: RLS prefix check server-side
- Admin-only insert: is_admin() RLS
- Candidate like spoofing: get_my_candidate_id() RLS
- External link: rel="noopener noreferrer" target="_blank"
- CSP: signed URL domain image/video src ekle

---

## 7. Testing Strategy

### Piramid: unit 80 / integration 15 / e2e 5

**FAZ A:** `tests/faz-a-decouple.spec.js`
- Genel Bakış açılır, coach teaser DOM'da yok
- `openCoachDetail` çağrısı console.warn, error yok
- Studio paneli hala açılır (intermediate)
- `coach_posts` query Genel panelden gitmez
- Bento grid, profil completion, streak regression-free

**FAZ B:** `tests/faz-b-freeze.spec.js`
- `profil.html#mulakat` → ht-soon-grid render
- 4 kart + chip
- Tıklanamaz
- Sidebar + bottom nav chip
- Dark mode + mobile 390
- `_htLoadStudio` no-op
- `coach-studio.html` redirect
- Admin Studio tab disabled
- A11y role/aria

**FAZ C:**
- Unit: markdown sanitize, carousel order, like state machine, debounce, unread count, empty/error render
- Integration (Supabase test DB): RLS matrix (admin insert, candidate select, reject spoof), storage upload, migration idempotent, RPC feed order (pinned first)
- E2E smoke: admin post → candidate view → like → bildirimler duyuru tab → persisted

### Regression guard
- Full 820 suite her PR sonrası
- Studio/coach referanslı eski testler skip list + TODO unfreeze

### Manuel UAT (Gemini)
`docs/uat/studio-freeze-uat.md` 18 item checklist.

### TDD sıra
Red → green her fazda: guard test → implementation → integration → e2e.

### CI gate
- lint + typecheck
- playwright full suite
- DeepSeek review her faz
- Codex AI-COLLAB.md checkpoint

---

## 8. Rollback + Sequencing

### Sequencing (3 ardışık PR)

**PR 1 — FAZ A Decouple**
- Commit: `chore: decouple coach from studio (prep for K030 freeze)`
- Deploy ayrı, 24 saat gözlem
- Rollback: 1 commit revert

**PR 2 — FAZ B Freeze**
- Commit: `feat: freeze studio panel with "yakında" grid (K030)`
- Deploy + 24 saat gözlem
- Rollback: git revert, backend intact

**PR 3 — FAZ C Duyurular**
- Commit: `feat: ht announcements feed system (admin → candidate dashboard)`
- Deploy sıra: `npm run db:push` → frontend
- Rollback: frontend revert → rollback migration (son çare)

### Rollback seviyeleri

| Seviye | Tetikleyici | Adım | Süre |
|---|---|---|---|
| L0 | UI bug | direct commit | <10dk |
| L1 | FAZ C UI kırık | PR3 UI revert | ~5dk |
| L2 | FAZ C full revert | Frontend revert, tablolar kalır | ~10dk |
| L3 | Migration rollback | ROLLBACK SQL + pg_dump restore | ~20dk |
| L4 | FAZ B revert | PR2 revert | ~5dk |
| L5 | Acil unfreeze | PR1+PR2 revert, duyurular kalır | ~15dk |
| L6 | Nükleer | 3 PR + migration rollback | ~30dk |

**Veri kaybı riski:** FAZ C'de like/seen data birikmişse L3'te kayıp. Mitigasyon: pg_dump snapshot L3 öncesi.

### Rollback migration

`supabase/migrations/ROLLBACK_ht_announcements.sql` (deploy edilmez, elde tutulur):
- DROP TRIGGER, POLICY, TABLE CASCADE (3 tablo)
- DROP FUNCTION (get_feed, toggle_like, unread_count, sync trigger fn)
- Storage policy kaldır

### Vault updates

**K030** — `vault/06-kararlar/karar-defteri.md`:
```
## K030 — Stüdyo + Koç Dondurma + Duyurular Feed Sistemi
**Tarih:** 13 Nisan 2026
**Karar veren:** Tuna + Claude
**Karar:** Stüdyo paneli "yakında" grid ile dondurulur. Koç UI kapatılır, backend dormant kalır. Yerine admin-driven "HelloTalent'ten Bilgiler" duyuru feed sistemi kurulur (ht_announcements tablo ailesi, LinkedIn-style composer, Genel Bakış paneli mount + bildirimler toggle).
**Neden:** Stüdyo karmaşık ve tamamlanmamış, MVP 1 kritik yolu değil. Koç uzun süre pasif kalacak. Admin hızlı duyuru kanalı istiyor (şirket girişi, feature ipucu, platform rehberi).
**Uygulama:** 3 ardışık PR (FAZ A decouple → FAZ B freeze → FAZ C duyurular). Asla silme prensibi: tüm kod + DB + data korunur. Unfreeze path dokümante (docs/studio-foundation.md). Regression sıfır hedef.
**Elenen alternatifler:** Clean Archive (dosya taşıma, merge riski), Feature Flag + Lazy Load (vanilla JS pattern'e uymuyor), tam silme (prensip ihlali).
**Detay:** [[../../docs/superpowers/specs/2026-04-13-studio-freeze-duyurular-design]]
```

**`vault/02-urun/yapilacaklar.md`** → yeni bölüm D1-D18:
```
## D — Duyurular & Stüdyo Freeze (K030)
D1.  [FAZ A] profil-studio.js cross-link map dormant banner
D2.  [FAZ A] profil-genel.js _htGenelCoachTeaser boşalt + stub
D3.  [FAZ A] openCoachDetail global stub + console.warn
D4.  [FAZ A] tests/faz-a-decouple.spec.js regression guard
D5.  [FAZ B] panel-soon.js + css/panel-soon.css (4 kart grid)
D6.  [FAZ B] profil.html switchPanel('mulakat') guard
D7.  [FAZ B] Sidebar + bottom nav "Yakında" chip
D8.  [FAZ B] coach-studio.html noindex + redirect
D9.  [FAZ B] admin.html Studio tab disable
D10. [FAZ B] profil-studio.js FROZEN banner (yorum)
D11. [FAZ B] tests/faz-b-freeze.spec.js
D12. [FAZ C] Migration 20260413_ht_announcements.sql (schema + RLS + RPC + trigger)
D13. [FAZ C] Storage policy (cvs/announcements prefix)
D14. [FAZ C] profil-duyurular.js (feed render + like + carousel + markdown)
D15. [FAZ C] css/duyurular.css
D16. [FAZ C] profil-genel.js feed mount (_htGenelMountDuyuruFeed)
D17. [FAZ C] Bildirimler paneli toggle (Bildirimler | Duyurular)
D18. [FAZ C] admin.html yeni tab + admin-announcements.js composer
D19. [FAZ C] Unit + integration + e2e test suite
D20. [DOC] docs/studio-foundation.md FROZEN + unfreeze bölümü
D21. [DOC] vault K030 entry + D1-D22 backlog
D22. [DOC] docs/uat/studio-freeze-uat.md manuel checklist
```

---

## 9. Unfreeze Path (dokümante)

`docs/studio-foundation.md` altına:

```
## Unfreeze Adımları (K030 geri alma)
1. profil.html switchPanel('mulakat') → _htLoadStudio restore (panel-soon kaldır)
2. Sidebar + bottom nav "Yakında" chip kaldır
3. admin.html Studio tab enable
4. profil-genel.js _htGenelCoachTeaser restore (git blame → pre-K030 ref)
5. profil-studio.js FROZEN banner kaldır
6. Cross-link map yorumları kaldır (COMP_TO_COACH_CATEGORY vb.)
7. tests/faz-a + faz-b skip list temizle
8. coach-studio.html noindex + redirect kaldır
9. Freeze-era duyuru feed'i olduğu gibi bırak — ortak yaşar
10. AI-COLLAB.md'ye "Unfreeze K0XX" entry + karar defteri
```

---

## 10. Risk Matrisi

| Risk | Olasılık | Etki | Mitigasyon |
|---|---|---|---|
| Migration DB canlıda patlar | Düşük | Yüksek | Staging, idempotent, ROLLBACK sql hazır |
| Candidate progress bozulur | Çok düşük | Yüksek | FAZ A/B insert-free |
| Cross-link map yanlışlıkla silinir | Düşük | Orta | Banner + DeepSeek review |
| Badge/streak UI kırık | Orta | Düşük | Conditional fallback + test |
| Composer XSS | Düşük | Yüksek | DOMPurify + CSP + security-hardening review |
| Bildirimler toggle default yanlış | Orta | Düşük | sessionStorage test |
| Signed URL expire | Düşük | Orta | Auto-refresh, retry |
| 820 test regression | Düşük | Orta | Full suite her PR + DeepSeek |

---

## 11. Definition of Done

- [ ] FAZ A PR merge + 24h canlı gözlem
- [ ] FAZ B PR merge + 24h canlı gözlem
- [ ] FAZ C migration deploy + frontend merge
- [ ] 820 + yeni test suite geçer (0 regression)
- [ ] DeepSeek review her faz approved
- [ ] Gemini UAT checklist 22 item ✓
- [ ] docs/studio-foundation.md FROZEN + unfreeze bölümü güncel
- [ ] vault karar-defteri.md K030 entry
- [ ] vault yapilacaklar.md D1-D22 entry
- [ ] docs/AI-COLLAB.md her faz sonrası güncel
- [ ] docs/CURRENT-STATE.md K030 sonrası state
- [ ] Storage policy prod'da aktif (admin upload + candidate read test)
- [ ] Admin composer gerçek post ile smoke
- [ ] Candidate feed 5+ gerçek post ile smoke
- [ ] Like/unread badge full lifecycle smoke

---

## 12. Implementation notes

- **`is_admin()` helper:** Migration'da create-or-replace ile tanımlanır. İlk tercih: `auth.jwt() ->> 'role' = 'admin'`. Eğer Supabase project claims'de `role` yoksa fallback: `hr_profiles.employer_role='admin'` (candidate tarafı değil, HR admin ekibi için). Implementation sırasında mevcut pattern'ler grep edilir, aynı strateji benimsenir.
- **Migration timestamp:** `20260413XXXXXX` template. `npm run db:new` komutu zaten doğru timestamp üretir.
- **`signStorageUrls` helper:** shared.js'te mevcut (batch signing pattern). Yeni helper eklenmez.
- **DOMPurify + marked:** Mevcut dep kontrol. Yoksa CDN link profil.html head'e eklenir, yeni npm dep yok.
- **D22 ile D18 uyumu:** Section 8 D1-D22 kanonik liste, yapilacaklar.md ile senkron.

## 13. Açık Sorular

Yok — tüm kararlar alındı, spec implementation-ready.
