# Consultant sign-in and teams

Consultants belong to a firm and sign in at `/admin` with an emailed link (Supabase Auth). To reach `/dashboard`, a person needs both:

1. **A Supabase Auth user.** The sign-in form never creates accounts. Invitations do.
2. **A row in `firm_members`.** Middleware checks it on every visit to `/dashboard`.

Firm admins manage their team at `/dashboard/team`, linked from the profile menu.

## One-time setup

Do these once per Supabase project.

1. In the SQL Editor, run the migrations in order: `002_consultants.sql`, `003_row_level_security.sql`, then `004_firms.sql`. Run 004 before deploying the app code that goes with it. It moves everyone in `consultants` who has a confirmed Auth user into a first firm, as admins. Check your own row is there before deploying, or you'll be locked out.
2. Under **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**. Keep **Confirm email** on. Otherwise someone could register a teammate's address before they do.
3. Under **Authentication → URL Configuration**:
   - Set **Site URL** to the production URL.
   - Add these to **Redirect URLs**: `https://<production-domain>/admin/callback` and `http://localhost:3000/admin/callback`. Add a pattern for Netlify deploy previews if you sign in on them.
4. Under **Authentication → Emails → SMTP Settings**, set up custom SMTP. Supabase's built-in sender is heavily rate-limited and only delivers to members of your Supabase organization, so invitations to anyone else won't arrive without this.
5. Under **Authentication → Emails → Templates**, change the link in two templates. Invitations are often opened in a different browser than the admin's, and these links work in any browser:
   - **Invite user:** `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">Accept your invitation</a>`
   - **Magic Link:** `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Sign in</a>`
6. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and to the Netlify site settings, from **Project Settings → API Keys**. It can read and change everything in the project, so never give it a `NEXT_PUBLIC_` name or commit it. Without it, the Team page still lists people, but sending invitations shows an error.

## Add someone to a firm

A firm admin goes to **Team → Invite someone** and enters a name, email and role. The invitation lasts 14 days. Opening the link adds them to the firm, and after that they sign in at `/admin`.

- **Admins** can also invite people, change roles and remove people.
- **Consultants** can't open the Team page.

A person can belong to one firm. To allow several, drop the `firm_members_one_firm` index and add a way to switch firms.

## Remove someone

A firm admin uses **Remove** on the Team page. The person loses access on their next page load, and the middleware signs them out. A dashboard tab they already have open keeps running until it reloads. To block them from signing in at all, also delete the user under **Authentication → Users**.

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

## What this does not protect

Firms aren't separated for client data yet. `organizations`, `applications` and the grant catalog have no `firm_id`, and much of the dashboard still lives in `localStorage`, so don't onboard an outside firm until that work is done.

The sign-in guards the `/dashboard` page only. The tables from `001_foundation.sql` don't have row level security policies, so anyone with the public anon key can still query them directly, and the `/api/*` routes don't check for a session. Locking those down has to account for the applicant pages, which use the same anon key.
