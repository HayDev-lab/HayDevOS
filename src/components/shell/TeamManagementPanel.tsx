"use client";

/**
 * TeamManagementPanel — OWNER-only UI to manage organization members.
 *
 * Lists current members (excluding the OWNER row, shown separately in
 * SettingsPanel), lets the OWNER invite a new member by email + role, change
 * an existing member's role, or remove a member. All mutations hit the
 * /api/team/members routes, which are scoped to the OWNER role server-side.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";

import { useAuth } from "@/components/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import type { TenantRole } from "@/lib/auth/types";
import { initials, cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: TenantRole;
  createdAt: string;
}

const INVITABLE_ROLES: TenantRole[] = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];

const ROLE_TONE: Record<string, string> = {
  OWNER: "border-primary/30 bg-primary/10 text-lime",
  ADMIN: "border-cyan/30 bg-cyan/10 text-cyan",
  MANAGER: "border-amber/30 bg-amber/10 text-amber",
  MEMBER: "border-border bg-muted text-muted-foreground",
  VIEWER: "border-border bg-muted text-muted-foreground",
};

export function TeamManagementPanel() {
  const { t } = useLocale();
  const { session } = useAuth();
  const activeOrg = session.activeOrganization;
  const isOwner = activeOrg.role === "OWNER";

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<TenantRole>("MEMBER");
  const [submitting, setSubmitting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/team/members", { method: "GET" });
        const payload = (await response.json().catch(() => null)) as
          | { members: TeamMember[] }
          | { error?: { message?: string } }
          | null;
        if (cancelled) return;
        if (!response.ok || !payload || !("members" in payload)) {
          throw new Error(
            payload && "error" in payload
              ? payload.error?.message ?? t("shell.team.failed")
              : t("shell.team.failed"),
          );
        }
        // Exclude the OWNER row — it is shown separately in the parent settings
        // panel and cannot be mutated here.
        setMembers(payload.members.filter((m) => m.role !== "OWNER"));
      } catch (loadError) {
        if (!cancelled) {
          toast.error(loadError instanceof Error ? loadError.message : t("shell.team.failed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner, t]);

  // Re-fetch members after a mutation. Never toggles `loading` (initial-load
  // skeleton only) so the table does not flash on every invite/role/remove.
  async function reloadMembers(): Promise<void> {
    try {
      const response = await fetch("/api/team/members", { method: "GET" });
      const payload = (await response.json().catch(() => null)) as
        | { members: TeamMember[] }
        | { error?: { message?: string } }
        | null;
      if (!response.ok || !payload || !("members" in payload)) {
        throw new Error(
          payload && "error" in payload
            ? payload.error?.message ?? t("shell.team.failed")
            : t("shell.team.failed"),
        );
      }
      setMembers(payload.members.filter((m) => m.role !== "OWNER"));
    } catch (reloadError) {
      toast.error(reloadError instanceof Error ? reloadError.message : t("shell.team.failed"));
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { member: TeamMember }
        | { error?: { message?: string } }
        | null;
      if (!response.ok || !payload || !("member" in payload)) {
        throw new Error(
          payload && "error" in payload
            ? payload.error?.message ?? t("shell.team.failed")
            : t("shell.team.failed"),
        );
      }
      toast.success(t("shell.team.added"));
      setInviteEmail("");
      setInviteName("");
      setInviteRole("MEMBER");
      await reloadMembers();
    } catch (inviteError) {
      toast.error(inviteError instanceof Error ? inviteError.message : t("shell.team.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangeRole(member: TeamMember, nextRole: TenantRole) {
    if (nextRole === member.role) return;
    setBusyMemberId(member.id);
    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? t("shell.team.failed"));
      }
      toast.success(t("shell.team.roleChanged"));
      await reloadMembers();
    } catch (changeError) {
      toast.error(changeError instanceof Error ? changeError.message : t("shell.team.failed"));
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleRemove(member: TeamMember) {
    setBusyMemberId(member.id);
    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? t("shell.team.failed"));
      }
      toast.success(t("shell.team.removed"));
      await reloadMembers();
    } catch (removeError) {
      toast.error(removeError instanceof Error ? removeError.message : t("shell.team.failed"));
    } finally {
      setBusyMemberId(null);
    }
  }

  if (!isOwner) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        {t("shell.team.ownerOnly")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite form */}
      <form
        onSubmit={handleInvite}
        className="space-y-3 rounded-lg border border-border bg-card/40 p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs text-muted-foreground">
              {t("shell.team.inviteEmail")}
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-9"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-name" className="text-xs text-muted-foreground">
              {t("shell.team.inviteName")}
            </Label>
            <Input
              id="invite-name"
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5 sm:w-48">
            <Label className="text-xs text-muted-foreground">
              {t("shell.team.inviteRole")}
            </Label>
            <Select value={inviteRole} onValueChange={(v: TenantRole) => setInviteRole(v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={submitting} className="h-9 gap-1.5">
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            {submitting ? t("shell.team.inviting") : t("shell.team.invite")}
          </Button>
        </div>
      </form>

      {/* Members list */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">{t("shell.settings.member")}</th>
              <th className="px-4 py-2 font-medium">{t("shell.settings.email")}</th>
              <th className="px-4 py-2 font-medium">{t("shell.settings.role")}</th>
              <th className="px-4 py-2 font-medium text-right">{t("shell.team.remove")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {t("shell.team.empty")}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 border border-border">
                        <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-lime">
                          {initials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{member.email}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border px-1.5 text-[9px] uppercase tracking-wider",
                          ROLE_TONE[member.role],
                        )}
                      >
                        {member.role}
                      </Badge>
                      <Select
                        value={member.role}
                        onValueChange={(v: TenantRole) => void handleChangeRole(member, v)}
                        disabled={busyMemberId === member.id}
                      >
                        <SelectTrigger className="h-7 w-[120px] text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVITABLE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRemove(member)}
                      disabled={busyMemberId === member.id}
                      className="h-8 gap-1.5 text-destructive hover:bg-destructive/10"
                    >
                      {busyMemberId === member.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {busyMemberId === member.id ? t("shell.team.removing") : t("shell.team.remove")}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TeamManagementPanel;