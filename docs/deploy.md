# Putting it online (Vercel + Supabase)

The site runs on **Vercel**; the data, logins and files are in **Supabase**.
Without Supabase it still works, as the browser demo.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (pick a region close to Ethiopia, e.g. Frankfurt).
2. **SQL Editor:** run each file in `supabase/migrations`, **in order** (oldest first).
3. **Authentication → Sign In / Providers:** keep **Email** on and turn
   **Allow new users to sign up** **off**. Schools create accounts; people don't sign themselves up.
4. **Authentication → URL Configuration:** set the Site URL to your Vercel address.
5. **Project Settings → API:** you'll need the **Project URL**, the **anon key**
   and the **service_role key** below. Keep the service_role key private.

## 2. Vercel

1. Import the GitHub repository into Vercel (framework: Next.js; the defaults are right).
2. **Settings → Environment Variables** (for Production):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key (server only) |
   | `NEXT_PUBLIC_DEMO_REQUEST_EMAIL` | optional: where "Request a School Demo" goes |

3. **Redeploy** so the new settings take effect.

## 3. Optional: the demo school in your project

To show the platform with realistic data on the real system:

1. On your computer, copy `.env.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. (`.env.local`
   is never committed.)
2. Run `npm run seed`. It creates the demo logins and writes
   `supabase/seed/demo-school.sql`, and prints the four demo sign-ins with fresh
   passwords, **once**. Keep them private.
3. Paste that SQL file into the **SQL Editor** and run it once.
4. Sign in on your site with each demo account and check what each one sees.

To take it out again: `npm run seed -- --remove` (deletes the demo school, all
its data and its logins). Running the seed twice is refused.

## 4. Check

Sign in as each role and follow `docs/demo-script.md`. Then follow
`docs/adding-a-school.md` for a real school.
