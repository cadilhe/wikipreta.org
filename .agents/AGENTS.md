# Wikipreta.org Development Guidelines

This document outlines the architecture, tech stack constraints, and development guidelines for Wikipreta.org. All developers and agents must adhere to these rules when working on this codebase.

## Tech Stack Constraints
- **Frontend**: React 19, Vite, and Tailwind CSS.
- **Backend**: Express.js (Node.js) located in `/api` (entrypoint is `api/index.js`).
- **Database & Auth**: Supabase (PostgreSQL) using the `@supabase/supabase-js` client.
- **AI Services**: Text generation with DeepSeek (principal) and fallback to Gemini 1.5 Flash. Image generation using local random assets under `public/assets/images/random/` or customized URLs stored in Supabase.

## Key Architectural Patterns

### 1. Topic/Verbete Caching Flow
Before fetching content from external APIs, check Supabase:
1. Lookup the topic by its slug in the `topics` table.
2. **Cache Hit**: If present, return it immediately to ensure performance.
3. **Cache Miss**: If not present, request generation from DeepSeek or Gemini, store the generated topic in Supabase, and return it.

### 2. Custom Slug System (Busca Inteligente)
Slugs are generated in a case-insensitive manner, normalization removes accents, and common Portuguese articles (`a`, `e`, `da`, `do`, `na`, `no`) are filtered out.
- Implemented in: `api/utils.js` (function `slugify`).
- Example: "Menina da Bahia" and "Menina Bahia" both resolve to `menina-bahia`.

### 3. Bold Text Auto-Linking (Navegação Infinita)
- Any term formatted as bold (e.g. `**termo**`) in a topic's body text is automatically converted by the frontend into a link to that topic/slug, facilitating infinite discovery.

### 4. Moderation & Banned Terms
- Topics must be checked against banned/restricted terms.
- Local static list is in `api/utils.js` (function `isBanned`).
- Dynamic banned terms are loaded and cached from the `banned_terms` table in Supabase.
- Always use the validation flow when creating/updating topics to prevent non-encyclopedic or inappropriate content.
