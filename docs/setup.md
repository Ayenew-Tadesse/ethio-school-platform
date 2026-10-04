# Running it on your computer

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev          # then open http://localhost:3000
```

With no Supabase settings the site runs as a **demo in your browser**. On the
sign-in page you can pick a role, sign in with a demo account (password
`Demo@2026`), or press **Take a guided tour**: ten short stops across the four
roles. Nothing you do in the demo leaves your browser; **Reset demo data**
starts over.

## Tests

```bash
npm test             # unit tests: grading, insights, demo rules, Amharic coverage
npm run test:db      # database tests: security rules and the demo seed (needs PostgreSQL 15+)
npm run test:e2e     # browser tests at 375, 390, 412, 768 and 1280 px wide
npm run lint && npm run typecheck
```

`npm run test:db` builds throwaway databases on the local PostgreSQL (it never
touches a real project). `npm run test:e2e` builds the site and starts it on
port 3100.

## Where things are

| | |
| --- | --- |
| `src/app` | the pages (signed-in screens under `/app`) |
| `src/lib/data` | the `Store`: `SupabaseStore` (real) and `DemoStore` (browser demo) |
| `src/lib/demo` | the fictional demo school and the guided tour's stops |
| `src/lib/i18n` | English and Amharic text (`en.ts`, `am.ts`) |
| `supabase/migrations` | the database: tables, security rules, automatic rules |
| `scripts/seed.ts` | loads the demo school into a real Supabase project |
| `docs/` | this documentation |
