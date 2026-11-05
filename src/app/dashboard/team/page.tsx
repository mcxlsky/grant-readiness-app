"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconPlus } from "@tabler/icons-react";
import { getConsultantSession, onConsultantSignedOut, type Consultant } from "@/lib/admin-session";
import { isAuthConfigured } from "@/lib/auth/config";
import { ROLE_LABELS, type FirmRole } from "@/lib/auth/consultant";
import { useTheme } from "@/lib/theme";
import {
  cancelInvitation,
  loadTeam,
  removeMember,
  resendInvitation,
  sendInvitation,
  setMemberRole,
  type TeamInvitation,
  type TeamMember,
} from "@/lib/team";

const ROLES = Object.keys(ROLE_LABELS) as FirmRole[];

const CHANGE_FAILED = "That didn't save. Refresh the page and try again.";
const LAST_ADMIN = "Your firm needs at least one admin. Make someone else an admin first.";

const INVITE_ERRORS: Record<string, string> = {
  invalid: "Enter a name and a valid email address.",
  already_member: "That person is already on your team.",
  already_invited: "That person already has an open invitation. You can resend it from the list below.",
  other_firm: "That email already belongs to another firm.",
  rate_limited: "Too many emails sent recently. Wait a few minutes, then try again.",
  not_configured: "Invitations aren't set up on this site yet. See docs/consultant-auth.md.",
  signed_out: "Your session ended. Refresh the page and sign in again.",
  not_admin: "Only firm admins can invite people.",
  not_found: "That invitation no longer exists. Refresh the page.",
};
const inviteError = (key: string) =>
  INVITE_ERRORS[key] ?? "We couldn't send that invitation. Try again in a few minutes.";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand-sky-deep focus:ring-1 focus:ring-brand-sky/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";
const primaryCls =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-indigo-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600";
const quietCls =
  "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800";
const dangerCls =
  "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/40";
const cardCls = "rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";
const rowCls =
  "flex flex-col gap-3 border-t border-gray-100 px-5 py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800";

export default function TeamPage() {
  useTheme();
  const router = useRouter();
  const [consultant, setConsultant] = useState<Consultant | null>(null);

  useEffect(() => {
    let active = true;
    getConsultantSession().then((current) => {
      if (!active) return;
      if (!current) router.replace("/admin?error=check_failed");
      else if (current.role !== "admin") router.replace("/dashboard");
      else setConsultant(current);
    });
    const unsubscribe = onConsultantSignedOut(() => window.location.assign("/admin"));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-3xl">
        <a
          href="/dashboard"
          className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
        >
          <IconArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to dashboard
        </a>

        {!consultant ? (
          <p role="status" className="mt-8 text-sm text-gray-500 dark:text-neutral-400">
            Loading your team…
          </p>
        ) : isAuthConfigured ? (
          <TeamManager consultant={consultant} />
        ) : (
          <div className={`${cardCls} mt-8 p-5`}>
            <h1 className="font-display text-2xl font-medium tracking-tight text-gray-900 dark:text-white">Team</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-300">
              Dev mode: managing a team needs Supabase, which isn&apos;t configured on this machine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamManager({ consultant }: { consultant: Consultant }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const team = await loadTeam(consultant.firmId);
    if (!team) return setStatus("failed");
    setMembers(team.members);
    setInvitations(team.invitations);
    setStatus("ready");
  }, [consultant.firmId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const report = (message: string | null, success: string | null = null) => {
    setError(message);
    setNotice(message ? null : success);
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-gray-900 dark:text-white">Team</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">{consultant.firmName}</p>
        </div>
        {!inviting && (
          <button type="button" onClick={() => setInviting(true)} className={primaryCls}>
            <IconPlus aria-hidden="true" className="h-4 w-4" />
            Invite someone
          </button>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            {notice}
          </p>
        )}

        {inviting && (
          <InviteForm
            onClose={() => setInviting(false)}
            onSent={async (email) => {
              setInviting(false);
              report(null, `Invitation sent to ${email}.`);
              await refresh();
            }}
          />
        )}

        {status === "loading" && (
          <p role="status" className="text-sm text-gray-500 dark:text-neutral-400">
            Loading your team…
          </p>
        )}
        {status === "failed" && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            We couldn&apos;t load your team. Refresh the page, or try again in a few minutes.
          </p>
        )}

        {status === "ready" && (
          <section aria-labelledby="members-heading">
            <h2 id="members-heading" className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Members
            </h2>
            <ul className={cardCls}>
              {members.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  isYou={member.user_id === consultant.userId}
                  firmId={consultant.firmId}
                  onError={report}
                  onChanged={async (success) => {
                    report(null, success);
                    await refresh();
                  }}
                />
              ))}
            </ul>
          </section>
        )}

        {status === "ready" && invitations.length > 0 && (
          <section aria-labelledby="invitations-heading">
            <h2 id="invitations-heading" className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Pending invitations
            </h2>
            <ul className={cardCls}>
              {invitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  onError={report}
                  onChanged={async (success) => {
                    report(null, success);
                    await refresh();
                  }}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

function InviteForm({ onClose, onSent }: { onClose: () => void; onSent: (email: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FirmRole>("consultant");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    setSending(true);
    setError(null);
    const failure = await sendInvitation({ email: address, name: name.trim(), role });
    setSending(false);
    if (failure) setError(inviteError(failure));
    else await onSent(address);
  };

  return (
    <form onSubmit={handleSubmit} aria-labelledby="invite-heading" className={`${cardCls} space-y-4 p-5`}>
      <h2 id="invite-heading" className="text-base font-semibold text-gray-900 dark:text-white">
        Invite someone
      </h2>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-neutral-300">Name</span>
          <input
            required
            autoFocus
            maxLength={120}
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-neutral-300">Email</span>
          <input
            required
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-neutral-300">Role</span>
        <select value={role} onChange={(e) => setRole(e.target.value as FirmRole)} className={inputCls}>
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </select>
        <span className="mt-1.5 block text-xs text-gray-500 dark:text-neutral-400">
          Admins can also invite and remove people.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={sending} className={primaryCls}>
          {sending ? "Sending…" : "Send invitation"}
        </button>
        <button type="button" onClick={onClose} disabled={sending} className={quietCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}

type RowProps = {
  onError: (message: string) => void;
  onChanged: (success: string) => Promise<void>;
};

function MemberRow({
  member,
  isYou,
  firmId,
  onError,
  onChanged,
}: RowProps & { member: TeamMember; isYou: boolean; firmId: string }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleRole = async (role: FirmRole) => {
    setBusy(true);
    const result = await setMemberRole(firmId, member.user_id, role);
    setBusy(false);
    if (result !== "ok") return onError(result === "last_admin" ? LAST_ADMIN : CHANGE_FAILED);
    // Stepping down from admin means this page no longer applies to you.
    if (isYou && role !== "admin") return window.location.assign("/dashboard");
    await onChanged(`${member.name} is now ${role === "admin" ? "an admin" : "a consultant"}.`);
  };

  const handleRemove = async () => {
    setBusy(true);
    const result = await removeMember(firmId, member.user_id);
    setBusy(false);
    setConfirming(false);
    if (result !== "ok") return onError(result === "last_admin" ? LAST_ADMIN : CHANGE_FAILED);
    if (isYou) return window.location.assign("/dashboard");
    await onChanged(`${member.name} was removed from the team.`);
  };

  return (
    <li className={rowCls}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {member.name}
          {isYou && <span className="ml-1.5 font-normal text-gray-500 dark:text-neutral-400">(you)</span>}
        </p>
        <p className="truncate text-sm text-gray-500 dark:text-neutral-400">{member.email}</p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <span className="mr-1 text-sm text-gray-700 dark:text-neutral-300">
            {isYou ? "Remove yourself?" : `Remove ${member.name}?`}
          </span>
          <button type="button" disabled={busy} onClick={handleRemove} className={dangerCls}>
            {busy ? "Removing…" : "Remove"}
          </button>
          <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={quietCls}>
            Keep
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <select
            aria-label={`Role for ${member.name}`}
            value={member.role}
            disabled={busy}
            onChange={(e) => handleRole(e.target.value as FirmRole)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700 outline-none transition-colors focus:border-brand-sky-deep focus:ring-1 focus:ring-brand-sky/30 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            {ROLES.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label={`Remove ${member.name}`}
            disabled={busy}
            onClick={() => setConfirming(true)}
            className={quietCls}
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
}

function InvitationRow({ invitation, onError, onChanged }: RowProps & { invitation: TeamInvitation }) {
  const [busy, setBusy] = useState(false);
  const expired = new Date(invitation.expires_at).getTime() < Date.now();
  const expiry = new Date(invitation.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const handleResend = async () => {
    setBusy(true);
    const failure = await resendInvitation(invitation.id);
    setBusy(false);
    if (failure) return onError(inviteError(failure));
    await onChanged(`Invitation sent again to ${invitation.email}.`);
  };

  const handleCancel = async () => {
    setBusy(true);
    const result = await cancelInvitation(invitation.id);
    setBusy(false);
    if (result !== "ok") return onError(CHANGE_FAILED);
    await onChanged(`Invitation to ${invitation.email} was cancelled.`);
  };

  return (
    <li className={rowCls}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{invitation.name}</p>
        <p className="truncate text-sm text-gray-500 dark:text-neutral-400">{invitation.email}</p>
        <p className={`mt-0.5 text-xs ${expired ? "font-medium text-red-700 dark:text-red-300" : "text-gray-500 dark:text-neutral-400"}`}>
          {ROLE_LABELS[invitation.role]} · {expired ? `Expired ${expiry}` : `Expires ${expiry}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Resend invitation to ${invitation.email}`}
          disabled={busy}
          onClick={handleResend}
          className={quietCls}
        >
          Resend
        </button>
        <button
          type="button"
          aria-label={`Cancel invitation to ${invitation.email}`}
          disabled={busy}
          onClick={handleCancel}
          className={quietCls}
        >
          Cancel
        </button>
      </div>
    </li>
  );
}
