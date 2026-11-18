# Consultant sign-in and teams

Consultants belong to a firm and sign in at `/admin` with an emailed link (Supabase Auth). To reach `/dashboard`, the database or the `/api/*` routes, a person needs both:

1. **A Supabase Auth user** with a confirmed email. The sign-in form never creates accounts. Invitations do.
2. **A row in `firm_members`.** Middleware checks it on every visit to `/dashboard`, the API routes check it on every request, and row level security checks it on every query.

Firm admins manage their team at `/dashboard/team`, linked from the profile menu.

## One-time setup

Do these once per Supabase project.

1. Under **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**. Keep **Confirm email** on. Otherwise someone could register a teammate's address before they do.
2. Under **Authentication → URL Configuration**:
   - Set **Site URL** to the production URL.
   - Add these to **Redirect URLs**: `https://<production-domain>/admin/callback` and `http://localhost:3000/admin/callback`. Add a pattern for Netlify deploy previews if you sign in on them.
3. Under **Authentication → Emails → SMTP Settings**, set up custom SMTP. Supabase's built-in sender is heavily rate-limited and only delivers to members of your Supabase organization, so invitations to anyone else won't arrive without this.
4. Under **Authentication → Emails → Templates**, change the link in two templates. Invitations are often opened in a different browser than the admin's, and these links work in any browser:
   - **Invite user:** `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">Accept your invitation</a>`
   - **Magic Link:** `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Sign in</a>`
5. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and to the Netlify site settings, from **Project Settings → API Keys**. It can read and change everything in the project, so never give it a `NEXT_PUBLIC_` name or commit it. Without it, the Team page still lists people, but sending invitations shows an error.
6. Run the migrations and deploy, close together. Older app code queries the database as anon, so it loses its data once `003` runs. The current code reads `firm_members`, so sign-in fails until `004` runs. Either way, the gap lasts only as long as the steps below take.
   1. Make sure you have a confirmed Auth user and a `consultants` row, because `004` turns those into the first firm's admins.
   2. In the SQL Editor, run `002_consultants.sql` if it hasn't been run, then `003_row_level_security.sql`, then `004_firms.sql`. `004` refuses to run before `003`.
   3. Check your row is there with `select * from firm_members;`. Without it you'll be locked out.
   4. Deploy the app code.

## Add someone to a firm

A firm admin goes to **Team → Invite someone** and enters a name, email and role. The invitation lasts 14 days. Opening the link adds them to the firm, and after that they sign in at `/admin`.

- **Admins** can also invite people, change roles and remove people.
- **Consultants** can't open the Team page.

A person can belong to one firm. To allow several, drop the `firm_members_one_firm` index and add a way to switch firms.

## Remove someone

A firm admin uses **Remove** on the Team page. The database and the API routes refuse them right away, and the middleware signs them out on their next page load. A dashboard tab they already have open still shows what's in that browser's `localStorage` until it reloads. To block them from signing in at all, also delete the user under **Authentication → Users**.

A firm always keeps at least one admin. The database refuses to remove or demote the last one, including by deleting their Auth user, so make someone else an admin first.

## Add a firm

There's no firm signup yet. In the SQL Editor, create the firm and invite its first admin. Then, under **Authentication → Users → Add user**, create their user with **Auto Confirm User** ticked, and have them sign in at `/admin`, which accepts the invitation.

```sql
with new_firm as (
  insert into firms (name, slug) values ('Acme Grants', 'acme-grants') returning id
)
insert into firm_invitations (firm_id, email, name, role)
select id, 'jordan@example.com', 'Jordan Lee', 'admin' from new_firm;
```

Client data isn't separated by firm yet. See "What this does not protect".

## Without Supabase env vars

The app still builds and runs when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.

| Where | What `/admin` shows | `/dashboard` |
| --- | --- | --- |
| `next dev` | A labeled dev mode with a "Continue as Dev Consultant" button | Opens after that button, with a dev mode banner |
| Any `next build` (Netlify included) | "Sign-in isn't available" | Always redirects to `/admin` |

## Who can reach what

| | Anyone with the anon key | Signed in, not in a firm | Consultant | Firm admin |
| --- | --- | --- | --- | --- |
| `organizations`, `grant_engagements`, `applications` | No access | No rows, no writes | Read and write | Read and write |
| `funders`, `grant_opportunities` | No access | No rows, no writes | Read only | Read only |
| `firms`, `firm_members` | No access | No rows | Own firm, read only | Own firm; can change roles and remove people |
| `firm_invitations` | No access | No rows | No rows | Own firm; can invite, extend and cancel |
| `consultants` (replaced by `firm_members`) | No access | Own row only, so none | Own row only | Own row only |
| Any other table in `public` | No access | No access | No access | No access |
| `/api/analyze`, `/api/search`, `/api/logo` | 401 | 403 | Allowed | Allowed |
| `/api/team/invitations` | 401 | 403 | 403 | Allowed |

Applicants don't appear here because `/`, `/get-started` and `/portal` make no database or API calls. They use `localStorage`, including the `/portal` lookup by email.

New tables start with no access for the anon or signed-in roles. A migration that adds one must grant access and add a policy, as `003_row_level_security.sql` and `004_firms.sql` do.

To test the policies, start a fresh local stack with the migrations applied (`supabase start`), then run the following. It rolls back everything it does.

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/rls_policies.sql
```

## What this does not protect

- **Separation between firms.** `organizations`, `applications` and the grant catalog have no `firm_id`, so every consultant in every firm can read and edit all of them. Much of the dashboard also still lives in `localStorage`. Don't onboard an outside firm until that work is done.
- **Applicant data.** Applications stay in the applicant's browser, so they don't reach the database and a consultant only sees them in the same browser. Moving `/portal` to Supabase needs a way to prove the applicant owns the email, such as a magic link. An anon policy or RPC that looks applications up by email would let anyone read an application by guessing the address.
- **The service role key and the SQL Editor.** Both bypass row level security.
- **What a consultant can fetch.** `/api/analyze` and `/api/logo` still fetch whatever URL or domain they're given, without blocking private addresses, so a signed-in consultant can point them anywhere the server can reach.
