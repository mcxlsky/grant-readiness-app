# Consultant sign-in

Consultants sign in at `/admin` with an emailed magic link (Supabase Auth). To reach `/dashboard`, a person needs both:

1. **A Supabase Auth user.** The sign-in form never creates accounts.
2. **A row in the `consultants` table.** This is the allowlist. Middleware checks it on every visit to `/dashboard`.

## One-time setup

Do these once per Supabase project.

1. In the SQL Editor, run `supabase/migrations/002_consultants.sql`.
2. Under **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**. Keep **Confirm email** on. Otherwise someone could register a teammate's address before they do.
3. Under **Authentication → URL Configuration**:
   - Set **Site URL** to the production URL.
   - Add these to **Redirect URLs**: `https://<production-domain>/admin/callback` and `http://localhost:3000/admin/callback`. Add a pattern for Netlify deploy previews if you sign in on them.
4. Under **Authentication → Emails → SMTP Settings**, set up custom SMTP. Supabase's built-in sender is heavily rate-limited and only delivers to members of your Supabase organization.

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

They lose access on their next page load, and the middleware signs them out. A dashboard tab they already have open keeps running until it reloads. To block them from signing in at all, also delete the user under **Authentication → Users**.

## Without Supabase env vars

The app still builds and runs when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.

| Where | What `/admin` shows | `/dashboard` |
| --- | --- | --- |
| `next dev` | A labeled dev mode with a "Continue as Dev Consultant" button | Opens after that button, with a dev mode banner |
| Any `next build` (Netlify included) | "Sign-in isn't available" | Always redirects to `/admin` |

## What this does not protect

The sign-in guards the `/dashboard` page only. The tables from `001_foundation.sql` don't have row level security policies, so anyone with the public anon key can still query them directly, and the `/api/*` routes don't check for a session. Locking those down has to account for the applicant pages, which use the same anon key.
