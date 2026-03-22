# hellotalent.ai — Project Context

## Tech Stack
- Frontend: Static HTML/CSS/JS (vanilla, no framework)
- Backend: Supabase (PostgreSQL + Auth + Storage + RLS)
- Hosting: GitHub Pages (custom domain: hellotalent.ai)
- Repo: github.com/tunkef/hellotalent

## Design System
- Fonts: Bricolage Grotesque (headings), Plus Jakarta Sans (body), DM Mono (data)
- Colors: Vermillion #C94E28, Navy #1E2D5E, Background #F7F6F4
- Forbidden: Inter, Roboto, purple gradients, röportaj
- Always use mulakat or is gorusmesi for interviews

## Key Rules
- Homepage = index.html (never index_new.html)
- No console.log in production (only console.error/warn)
- candidates.id = bigint, companies.id = bigint (NOT uuid)
- hr_profiles.id = uuid (FK to auth.users)
- Always use .maybeSingle() not .single() for new user queries
- UI language: Turkish throughout

## Current State
- See docs/handoff.md for full project state
- P2 COMPLETE (all tasks #7-#10 done)
- Next: P3 (Employer Onboarding & Team System)

## Learned User Preferences
- Scope edits to the files the user specifies; do not modify other files unless asked. When the user gives exact paths, selectors, or line-level instructions, implement at those locations rather than approximating.
- In legacy HTML/JS files (e.g. ik.html), keep existing code style: use var, not const/let.
- Prefer permanent, maintainable fixes over quick workarounds; remove root cause and prevent recurrence.
- For Turkish UI strings, apply copy rules the user states explicitly (e.g. greetings like "Merhaba İsim!" without a comma before the name; capitalize proper names).

## Learned Workspace Facts
- Use docs/handoff.md as the phase checklist and written project state when planning migrations, RPCs, and cross-page work; keep implementation aligned with it.
- For stacked CSS 3D flip cards using perspective, lift the hovered card with a higher z-index so pointer events do not leak to cards below.
- When the user references a local HTML mockup (often under ~/Downloads/), treat it as the visual reference for layout and styling parity.

## Context7
Always use context7 when working with Supabase API, CSS, or any library docs.

## 🚨 CRITICAL AI DIRECTIVE (READ THIS FIRST)
Before you write ANY HTML, CSS, or JS for a new feature, you MUST forcefully read and load these two files into your context:
1. `.agents/skills/bento-grid-design/SKILL.md` -> Contains the EXACT HTML/CSS templates for Bento grids and cards. 
2. `.agents/skills/hellotalent-dev/SKILL.md` -> Contains architecture and component rules.
**DO NOT generate any UI code from scratch without reading the Bento Grid SKILL.md file first.**
