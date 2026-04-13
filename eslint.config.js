/**
 * ESLint flat config for hellotalent.ai
 *
 * Project conventions (see .claude/rules/code-quality.md):
 * - Use var (not const/let) — Safari SyntaxError prevention
 * - No console.log in production — only console.error/warn
 * - IIFE pattern: (function(){ ... })();
 * - Browser globals + Supabase CDN globals
 * - sourceType: "script" (no ES modules, vanilla script tags)
 */

module.exports = [
  /* ── Global ignores ── */
  {
    ignores: [
      'node_modules/**',
      'tests/**',
      'docs/**',
      '*.min.js',
      'playwright.config.js',
      'playwright-*.config.js',
      'eslint.config.js'
    ]
  },

  /* ── Main config for all .js files ── */
  {
    files: ['*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        /* Browser globals */
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        getComputedStyle: 'readonly',
        matchMedia: 'readonly',
        structuredClone: 'readonly',
        queueMicrotask: 'readonly',
        AbortController: 'readonly',

        /* CDN / external library globals */
        jspdf: 'readonly',      /* jsPDF CDN */
        jsPDF: 'readonly',      /* jsPDF CDN (alternate) */
        Sentry: 'readonly',     /* Sentry CDN */

        /*
         * Note: `supabase` is NOT listed here because profil-core.js
         * redeclares it as `var supabase = window.supabase.createClient(...)`.
         * Each file that uses it should declare `\/* global supabase *\/`.
         *
         * Cross-file globals (currentUser, switchPanel, _loadedDBData, etc.)
         * are declared per-file with `\/* global ... *\/` comments at the top.
         * This makes dependencies explicit and auditable.
         */
      }
    },
    rules: {
      /* ── Errors (block commit) ── */
      'no-undef': 'error',
      'no-console': ['error', { allow: ['error', 'warn'] }],
      'no-redeclare': ['warn', { builtinGlobals: true }],
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-inner-declarations': 'error',
      'no-irregular-whitespace': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-self-assign': 'error',

      /* ── Warnings (visible but won't block with --max-warnings=0) ── */
      'no-unused-vars': ['warn', {
        vars: 'local',
        args: 'none',
        varsIgnorePattern: '^_',
        caughtErrors: 'none'          /* catch(e) with unused e is common in this codebase */
      }],

      /* ── Supabase safety guards ── */
      'no-restricted-syntax': [
        'error',
        {
          /* Block .single() — always use .maybeSingle() instead.
           * .single() throws when 0 rows returned (e.g. new users),
           * silently corrupting auth flows. .maybeSingle() returns null safely. */
          selector: 'CallExpression[callee.property.name="single"]',
          message: "Supabase .single() yasak — .maybeSingle() kullan. (Yeni kullanici veya bos satir durumunda .single() hata firlatiyor.)"
        }
      ],

      /* ── Off (respect project conventions) ── */
      'no-var': 'off',           /* project uses var deliberately */
      'prefer-const': 'off',     /* not applicable — no const/let */
      'strict': 'off',           /* IIFEs use 'use strict' internally */
      'no-prototype-builtins': 'off' /* safe for this codebase */
    }
  }
];
