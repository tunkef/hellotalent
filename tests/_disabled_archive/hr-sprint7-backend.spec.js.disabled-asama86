/* HR Sprint 7 — Backend (T3 migration + RPC + RLS) testi
   Kapsam:
   - Migration dosyasi: pipeline_stage ENUM + 2 tablo + 5 RPC
   - RLS policy varligi (4 policy/tablo)
   - GRANT statements
   - Idempotent migration (DO IF NOT EXISTS)
   - is_paid_employer() helper
   - Adapter real mode RPC parameterizasyonu

   NOT: Bu test dosya-bazli statik kontrol yapar (migration dogrulugu).
   Live integration testi MVP 2'de Supabase test DB ile yapilacak.
*/
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = '20260426012144_hr_pipeline_notes_mvp2.sql';
const MIG_PATH = path.join(ROOT, 'supabase/migrations/', MIGRATION);

function readFile(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

test.describe('FAZ B Sprint 7 — Backend (T3 migration + RPC + RLS)', () => {

  test('Migration dosyasi diskte', () => {
    expect(fs.existsSync(MIG_PATH)).toBeTruthy();
  });

  test('Migration dosyasi minimum 6KB', () => {
    var stat = fs.statSync(MIG_PATH);
    expect(stat.size).toBeGreaterThan(6000);
  });

  /* ════════════════════════════════════════════════
     Sema: ENUM + 2 tablo
     ════════════════════════════════════════════════ */
  test('pipeline_stage ENUM tanımlanmış', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE TYPE pipeline_stage AS ENUM/);
    // 6 stage: yeni, gorustum, mulakat, teklif, kapandi_win, kapandi_loss
    ['yeni', 'gorustum', 'mulakat', 'teklif', 'kapandi_win', 'kapandi_loss'].forEach((s) => {
      expect(sql, 'stage: ' + s).toMatch(new RegExp("'" + s + "'"));
    });
  });

  test('candidate_pipeline_state tablosu', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS candidate_pipeline_state/);
    expect(sql).toMatch(/UNIQUE \(position_id, candidate_id\)/);
    expect(sql).toMatch(/REFERENCES positions\(id\) ON DELETE CASCADE/);
    expect(sql).toMatch(/REFERENCES candidates\(id\) ON DELETE CASCADE/);
  });

  test('employer_candidate_notes tablosu', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS employer_candidate_notes/);
    expect(sql).toMatch(/CHECK \(char_length\(body\) BETWEEN 1 AND 4000\)/);
  });

  test('Index varligi', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/idx_pipeline_state_position/);
    expect(sql).toMatch(/idx_pipeline_state_candidate/);
    expect(sql).toMatch(/idx_pipeline_state_stage/);
    expect(sql).toMatch(/idx_notes_candidate/);
    expect(sql).toMatch(/idx_notes_author/);
  });

  /* ════════════════════════════════════════════════
     RLS + GRANT (T3 zorunlu)
     ════════════════════════════════════════════════ */
  test('candidate_pipeline_state RLS aktif + 4 policy', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/ALTER TABLE candidate_pipeline_state ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY pipeline_state_select_team/);
    expect(sql).toMatch(/CREATE POLICY pipeline_state_insert_team/);
    expect(sql).toMatch(/CREATE POLICY pipeline_state_update_team/);
    expect(sql).toMatch(/CREATE POLICY pipeline_state_delete_admin/);
  });

  test('employer_candidate_notes RLS aktif + 4 policy', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/ALTER TABLE employer_candidate_notes ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY notes_select_team/);
    expect(sql).toMatch(/CREATE POLICY notes_insert_self/);
    expect(sql).toMatch(/CREATE POLICY notes_update_self/);
    expect(sql).toMatch(/CREATE POLICY notes_delete_self_or_admin/);
  });

  test('GRANT statements (authenticated)', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE\s+ON candidate_pipeline_state TO authenticated/);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE\s+ON employer_candidate_notes TO authenticated/);
  });

  test('RLS policy auth.users direkt query yapmiyor (auth.jwt yerine auth.uid kullanim)', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    // FROM auth.users kullanimi YASAK (CLAUDE.md kurali)
    expect(sql).not.toMatch(/FROM auth\.users/i);
    // auth.uid() veya auth.jwt() kullanilmali
    expect(sql).toMatch(/auth\.uid\(\)/);
  });

  /* ════════════════════════════════════════════════
     5 RPC (auth + KVKK + RLS)
     ════════════════════════════════════════════════ */
  test('hr_get_pipeline RPC', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION hr_get_pipeline\(p_position_id uuid\)/);
    expect(sql).toMatch(/SECURITY INVOKER/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION hr_get_pipeline\(uuid\) TO authenticated/);
  });

  test('hr_move_pipeline_stage RPC', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION hr_move_pipeline_stage\(/);
    expect(sql).toMatch(/p_id uuid/);
    expect(sql).toMatch(/p_stage pipeline_stage/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION hr_move_pipeline_stage/);
  });

  test('hr_add_to_pipeline RPC (idempotent)', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION hr_add_to_pipeline\(/);
    expect(sql).toMatch(/ON CONFLICT \(position_id, candidate_id\)\s+DO NOTHING/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION hr_add_to_pipeline/);
  });

  test('hr_add_note RPC (body validation)', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION hr_add_note\(/);
    expect(sql).toMatch(/Not içeriği boş olamaz/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION hr_add_note/);
  });

  test('hr_list_notes RPC', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION hr_list_notes\(p_candidate_id bigint\)/);
    expect(sql).toMatch(/author_name text/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION hr_list_notes\(bigint\) TO authenticated/);
  });

  test('is_paid_employer() helper (Iyzico hazirligi)', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION is_paid_employer\(\)/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/feature_flags ->> 'paid'/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION is_paid_employer\(\) TO authenticated/);
  });

  /* ════════════════════════════════════════════════
     Schema extension: jsonb columns
     ════════════════════════════════════════════════ */
  test('hr_profiles.feature_flags jsonb column', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/ALTER TABLE hr_profiles ADD COLUMN feature_flags jsonb/);
  });

  test('companies.metadata jsonb column', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/ALTER TABLE companies ADD COLUMN metadata jsonb/);
  });

  /* ════════════════════════════════════════════════
     Idempotent migration (re-run safe)
     ════════════════════════════════════════════════ */
  test('Migration idempotent (DO IF NOT EXISTS / DROP IF EXISTS)', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    // ENUM
    expect(sql).toMatch(/IF NOT EXISTS \(SELECT 1 FROM pg_type WHERE typname = 'pipeline_stage'\)/);
    // Tables
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS/);
    // Policies
    expect(sql).toMatch(/DROP POLICY IF EXISTS/);
    // Triggers
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS/);
  });

  test('Trigger updated_at otomatik', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION trg_set_updated_at/);
    expect(sql).toMatch(/CREATE TRIGGER pipeline_state_updated_at/);
    expect(sql).toMatch(/CREATE TRIGGER notes_updated_at/);
  });

  test('search_path ayarlanmis (SECURITY)', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    // Tüm SECURITY DEFINER fonksiyonlarda search_path zorunlu
    expect(sql).toMatch(/SET search_path = public/);
  });

  /* ════════════════════════════════════════════════
     Adapter real mode contract
     ════════════════════════════════════════════════ */
  test('hr-data.js: getPipeline real RPC parametrize', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/sb\.rpc\('hr_get_pipeline', \{ p_position_id: positionId/);
  });

  test('hr-data.js: moveStage real RPC parametrize', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/sb\.rpc\('hr_move_pipeline_stage', \{ p_id: pipelineId, p_stage: newStage/);
  });

  test('hr-data.js: addToPipeline real RPC parametrize (3 param)', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/sb\.rpc\('hr_add_to_pipeline'/);
    expect(js).toMatch(/p_position_id: payload\.position_id/);
    expect(js).toMatch(/p_candidate_id: payload\.candidate_id/);
    expect(js).toMatch(/p_stage: payload\.stage/);
  });

  test('hr-data.js: addNote real RPC parametrize (3 param)', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/sb\.rpc\('hr_add_note'/);
    expect(js).toMatch(/p_candidate_id: candidateId/);
    expect(js).toMatch(/p_position_id: positionId/);
    expect(js).toMatch(/p_body: body/);
  });

  test('hr-data.js: real mode flag kapali (MVP 2 hazirligi)', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/HR_REAL_MODE_ENABLED === true/);
  });

  /* ════════════════════════════════════════════════
     Codex T3 review notu (manuel kontrol icin)
     ════════════════════════════════════════════════ */
  test('Migration baslangicta Codex T3 review notu', () => {
    const sql = fs.readFileSync(MIG_PATH, 'utf8');
    expect(sql).toMatch(/Tier: T3/);
    expect(sql).toMatch(/auditor.*supabase-agent.*Codex/i);
  });

});
