# Consultant sign-in

Consultants sign in at `/admin` with an emailed magic link (Supabase Auth). To reach `/dashboard`, the database or the `/api/*` routes, a person needs both:

1. **A Supabase Auth user** with a confirmed email. The sign-in form never creates accounts.
2. **A row in the `consultants` table.** This is the allowlist. Middleware checks it on every visit to `/dashboard`, the API routes check it on every request, and row level security checks it on every query.

## One-time setup

Do these once per Supabase project.

1. In the SQL Editor, run `supabase/migrations/002_consultants.sql`.
2. Under **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**. Keep **Confirm email** on. Otherwise someone could register a teammate's address before they do.
3. Under **Authentication → URL Configuration**:
   - Set **Site URL** to the production URL.
   - Add these to **Redirect URLs**: `https://<production-domain>/admin/callback` and `http://localhost:3000/admin/callback`. Add a pattern for Netlify deploy previews if you sign in on them.
4. Under **Authentication → Emails → SMTP Settings**, set up custom SMTP. Supabase's built-in sender is heavily rate-limited and only delivers to members of your Supabase organization.
5. Lock down the database, in this order. The dashboard loses its data if you run the migration before the code is live.
   1. Deploy the app code that includes `supabase/migrations/003_row_level_security.sql`.
   2. Add at least one consultant (below) and confirm they can sign in.
   3. In the SQL Editor, run `003_row_level_security.sql`.

## Add a consultant

1. In **Authentication → Users → Add user → Create new user**, enter their email, set any strong password (it won't be used), and tick **Auto Confirm User**.
2. In the SQL Editor, run the following with the email in lowercase:

   ```sql
   insert into consultants (email, name) values ('jordan@example.com', 'Jordan Lee');
   ```

They can now request a link at `/admin`. The `name` shows in the dashboard header.

## Remove a consultant

```sql
delete from consultants where email = 'jordan@example.com';
```

The database and the API routes refuse them right away. The middleware signs them out on their next page load. A dashboard tab they already have open still shows what's in that browser's `localStorage` until it reloads. To block them from signing in at all, also delete the user under **Authentication → Users**.

## Without Supabase env vars

The app still builds and runs when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.

| Where | What `/admin` shows | `/dashboard` |
| --- | --- | --- |
| `next dev` | A labeled dev mode with a "Continue as Dev Consultant" button | Opens after that button, with a dev mode banner |
| Any `next build` (Netlify included) | "Sign-in isn't available" | Always redirects to `/admin` |

## Who can reach what

| | Anyone with the anon key | Signed in, not on the allowlist | Consultant |
| --- | --- | --- | --- |
| `organizations`, `grant_engagements`, `applications` | No access | No rows, no writes | Read and write |
| `funders`, `grant_opportunities` | No access | No rows, no writes | Read only |
| `consultants` | No access | Own row only, so none | Own row only |
| Any other table in `public` | No access | No access | No access |
| `/api/analyze`, `/api/search`, `/api/logo` | 401 | 403 | Allowed |

Applicants don't appear here because `/`, `/get-started` and `/portal` make no database or API calls. They use `localStorage`, including the `/portal` lookup by email.

New tables start with no access for the anon or signed-in roles. A migration that adds one must grant access and add a policy, as `003_row_level_security.sql` does.

To test the policies, start a fresh local stack with the migrations applied (`supabase start`), then run the following. It rolls back everything it does.

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/rls_policies.sql
```

## What this does not protect

- **Applicant data.** Applications stay in the applicant's browser, so they don't reach the database and a consultant only sees them in the same browser. Moving `/portal` to Supabase needs a way to prove the applicant owns the email, such as a magic link. An anon policy or RPC that looks applications up by email would let anyone read an application by guessing the address.
- **Data within the team.** Every consultant can read and edit every organization and engagement.
- **The service role key and the SQL Editor.** Both bypass row level security.
- **What a consultant can fetch.** `/api/analyze` and `/api/logo` still fetch whatever URL or domain they're given, without blocking private addresses, so a signed-in consultant can point them anywhere the server can reach.
