# Hellotalent

**The world's first retail talent marketplace — built entirely with Claude by a non-technical founder.**

[![Live](https://img.shields.io/badge/Live-hellotalent.ai-C94E28?style=flat-square)](https://hellotalent.ai)
[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude-7B61FF?style=flat-square)](https://claude.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-102%20passing-brightgreen?style=flat-square)](#testing)

---

## What is Hellotalent?

Hellotalent is a **retail talent marketplace** that connects retail workers with employers through AI-powered matching — not job applications.

There is no LinkedIn for retail. No platform where a store manager in Istanbul can be discovered by a brand in London. No career development infrastructure for the millions of people who work in stores every day. Hellotalent is built to change that.

### How it works

- **Retail workers** build rich career profiles — experience, competencies, target roles, location preferences
- **Employers** define positions with specific filters in their dashboard
- **AI matching engine** (12-signal scoring algorithm) automatically surfaces the right candidates
- **No job postings. No blind applications.** Workers get discovered based on who they are

### Key features

| Feature | Status | Description |
|---------|--------|-------------|
| **Candidate Profiles** | ✅ Live | 5-step wizard, experience, education, languages, certificates, target roles |
| **Employer Dashboard** | ✅ Live | Live candidate list, position-aware 12-signal scoring, match reasons |
| **AI Matching** | ✅ Live | Role, segment, city, experience, availability, brand ecosystem, recency scoring |
| **Messaging** | ✅ Live | Bi-directional DM (employer ↔ candidate), read receipts, realtime |
| **Coach Studio** | ✅ Live | Editorial platform for retail career coaches, content publishing |
| **Interview Coaching** | ✅ Live | 7-screen guided interview preparation with journaling |
| **Competency Framework** | ✅ Live | 29 Korn Ferry competencies, self-assessment, development paths |
| **Brand Following** | ✅ Live | 32 retail brands with company hierarchy (holdings → brands) |
| **Team Management** | ✅ Live | Multi-user employer accounts (admin/recruiter/viewer roles) |
| **Dark Mode** | ✅ Live | 51 CSS tokens, full theme support |
| **Premium Tiers** | 🔄 Schema ready | 3 plan cards, freemium gating, payment integration pending |

## The Story

This project was created by a retail operations professional with **11 years of experience** across Apple, Prada, Chanel, LC Waikiki, Boyner, GAP, Inditex (Massimo Dutti, Pull&Bear), and Kiğılı in Turkey — and the founder of [Peoplein HR & Consultancy](https://peoplein.co).

**Every single commit in this repository was created through collaboration with [Claude](https://claude.ai).** The founder has zero coding experience. This is living proof that AI can be the great equalizer — enabling domain experts who deeply understand a problem to build the solution themselves.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML / CSS / JavaScript — no framework, no build step |
| **Backend** | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS + Storage + Edge Functions) |
| **Email** | [Resend](https://resend.com) via email outbox queue + Edge Functions |
| **Hosting** | GitHub Pages + Cloudflare |
| **Testing** | [Playwright](https://playwright.dev) — 102 passing E2E tests |
| **Database** | 64 applied migrations, Row-Level Security on all tables |
| **AI Collaboration** | Claude — architecture, code, debugging, deployment, testing |

### Why no framework?

Deliberate choice. No React, no Next.js, no build step. Every HTML file is served as-is. This makes the codebase accessible to non-technical contributors and eliminates build complexity. The modular JavaScript architecture (16 `profil-*.js` files) provides separation of concerns without framework overhead.

## Architecture

```
hellotalent/
├── index.html              # Homepage + auth gate
├── profil.html             # Candidate dashboard (5,900+ lines)
├── ik.html                 # Employer dashboard
├── coach-studio.html       # Coach editorial workspace
├── admin.html              # Admin panel
├── shared.js               # Supabase config, header/footer, utilities
├── shared.css              # Design tokens, responsive, dark mode
├── profil-*.js (16 files)  # Modular candidate logic
├── admin-*.js (5 files)    # Modular admin logic
├── supabase/
│   └── migrations/         # 64 SQL migrations
├── tests/                  # Playwright E2E suite
├── docs/
│   ├── handoff.md          # Session handoff (2,100+ lines)
│   └── PROJECT_OPERATING_MAP.md
└── .claude/
    ├── rules/              # 5 rule files (architecture, code quality, deploy, Supabase, Turkish UI)
    └── skills/             # Development skills and conventions
```

## Design System

- **Primary**: Vermillion `#C94E28` — CTAs, hero cards
- **Secondary**: Navy `#1E2D5E` — authority, headings
- **Typography**: Bricolage Grotesque (headings) + Plus Jakarta Sans (body)
- **Grid**: Bento grid system — 3-column responsive, editorial luxury aesthetic
- **Language**: Turkish-first UI (all user-facing text in Turkish)

## Testing

```bash
npm run test              # All 102 tests
npm run test:smoke        # Basic smoke tests
npm run test:p3           # P3 regression guard
```

- Mobile viewport: 390×844 (iPhone)
- Desktop viewport: 1440×900
- 102 passing tests across smoke, dark mode, and regression suites

## Development

```bash
# Clone
git clone https://github.com/tunkef/hellotalent.git
cd hellotalent

# Install dependencies (testing only)
npm install

# Run tests
npm test

# Database migrations (requires Supabase CLI)
npm run db:status
npm run db:push
```

No build step required. Open any HTML file directly or serve via any static file server.

## Roadmap

- [ ] Payment integration (premium subscriptions)
- [ ] AI-powered career coaching (Claude-assisted competency development)
- [ ] Mobile app (PWA)
- [ ] Multi-language support (English, Arabic)
- [ ] Global expansion beyond Turkey

## Contributing

Contributions are welcome. Please read the existing `.claude/rules/` files for code conventions and architecture decisions before submitting PRs.

## License

[MIT](LICENSE)

---

<p align="center">
  <strong>Built with zero coding experience, powered by Claude</strong><br>
  <a href="https://hellotalent.ai">hellotalent.ai</a>
</p>
