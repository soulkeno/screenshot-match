import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Ban, Crown, Loader2, Minus, Plus, Search, ShieldCheck, Ticket, Trash2, UserX, Users,
  History, ShieldAlert, Sparkles, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  adminWipeUserFn,
  adminDeleteUserFn,
  adminGetAuditLogsFn,
  adminRecordActionFn,
} from "@/lib/games.functions";
import { Amount, PageHeader, RankTag, UserAvatar, VipTag, ClubTag } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApp } from "@/lib/app-context";
import { errMsg, fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CLUBS, getClubTier, setClubTierLocal, type ClubTier } from "@/lib/clubs";

export const Route = createFileRoute("/admin")({
  validateSearch: (s: Record<string, unknown>): { user?: string } => (typeof s["user"] === "string" ? { user: s["user"] } : {}),
  head: () => ({
    meta: [
      { title: "Admin Panel — Keno Casino" },
      { name: "description", content: "Keno staff tools and security audit." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

type P = Tables<"profiles">;

function Page() {
  const { isAdmin, profile } = useApp();
  const [tab, setTab] = useState<"users" | "codes" | "audit">("users");

  const isOwnerKeno = profile?.username?.toLowerCase() === "keno";

  if (!isAdmin) {
    return <div className="panel p-10 text-center text-muted-foreground">You don't have access to this page.</div>;
  }

  const tabs: { key: "users" | "codes" | "audit"; label: string; icon: any }[] = [
    { key: "users", label: "Users", icon: Users },
    { key: "codes", label: "Codes", icon: Ticket },
  ];

  // Audit Logs exclusively for owner Keno
  if (isOwnerKeno) {
    tabs.push({ key: "audit", label: "Audit Logs", icon: ShieldAlert });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader icon={ShieldCheck} title="Admin Panel" subtitle="System controls, player management, and moderation" />
      <div className="flex w-fit gap-1 rounded-xl border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-all",
              tab === t.key ? "bg-surface-2 ring-1 ring-primary/40 text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "codes" && <CodesTab />}
      {tab === "audit" && isOwnerKeno && <AuditTab />}
    </div>
  );
}

function UsersTab() {
  const search = Route.useSearch();
  const [q, setQ] = useState("");
  const [list, setList] = useState<P[]>([]);
  const [sel, setSel] = useState<string | null>(search.user ?? null);

  const load = useCallback(async () => {
    let r = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    if (q.trim()) r = r.ilike("username", `%${q.trim()}%`);
    const { data } = await r;
    setList(data ?? []);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="panel overflow-hidden">
        <div className="relative border-b border-border p-3">
          <Search className="absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" className="pl-9" />
        </div>
        <div className="max-h-[640px] overflow-y-auto">
          {list.map((p) => {
            const tier = getClubTier(p);
            return (
              <button
                key={p.id}
                onClick={() => setSel(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-border/50 px-3 py-2.5 text-left text-sm hover:bg-surface-2",
                  sel === p.id && "bg-primary/10"
                )}
              >
                <UserAvatar name={p.username} url={p.avatar_url} size={32} />
                <span className="flex-1 truncate font-semibold">{p.username}</span>
                {tier !== "none" && <ClubTag tier={tier} />}
                {p.banned_until && new Date(p.banned_until) > new Date() && <Ban className="size-4 text-destructive" />}
              </button>
            );
          })}
          {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No users found</p>}
        </div>
      </div>
      {sel ? (
        <UserPanel key={sel} id={sel} onChanged={load} />
      ) : (
        <div className="panel grid place-items-center p-10 text-sm text-muted-foreground">Pick a user to manage</div>
      )}
    </div>
  );
}

function UserPanel({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { userId } = useApp();
  const wipeUser = useServerFn(adminWipeUserFn);
  const deleteUser = useServerFn(adminDeleteUserFn);
  const recordAction = useServerFn(adminRecordActionFn);

  const [p, setP] = useState<P | null>(null);
  const [bal, setBal] = useState<number | null>(null);
  const [admin, setAdmin] = useState(false);
  const [amt, setAmt] = useState("10000");
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentTier = getClubTier(p);

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("wallets").select("balance").eq("user_id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
    ]);
    setP(a.data);
    setBal(b.data ? Number(b.data.balance) : null);
    setAdmin(!!c.data?.some((r) => r.role === "admin"));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(key: string, f: () => PromiseLike<{ error: unknown }>, ok: string, auditAction?: string, auditDetails?: string) {
    setBusy(key);
    const { error } = await f();
    setBusy(null);
    if (error) return toast.error(errMsg(error));
    toast.success(ok);

    if (auditAction && p) {
      try {
        await recordAction({
          data: { action: auditAction, targetId: p.username, details: auditDetails || ok },
        });
      } catch (err) {
        console.error("Failed to record audit:", err);
      }
    }

    await load();
    onChanged();
  }

  if (!p) {
    return (
      <div className="panel grid place-items-center p-10">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const banned = p.banned_until && new Date(p.banned_until) > new Date();
  const a = Number(amt) || 0;

  const handleClubChange = async (newTier: ClubTier) => {
    setClubTierLocal(id, newTier);
    const isVipTier = newTier !== "none";
    await act(
      "club",
      () => supabase.rpc("admin_set_vip", { p_user: id, p_vip: isVipTier }),
      `Assigned ${CLUBS[newTier].name}`,
      "CLUB_TIER_GRANT",
      `Changed club tier to ${newTier.toUpperCase()}`
    );
  };

  return (
    <div className="panel space-y-5 p-5 animate-fade-up">
      <div className="flex items-center gap-4">
        <UserAvatar name={p.username} url={p.avatar_url} size={56} className="rounded-xl" />
        <div className="flex-1">
          <p className="flex items-center gap-2 text-xl font-bold">
            {p.username}
            <ClubTag tier={currentTier} />
            {admin && <span className="rounded bg-primary/20 px-1.5 text-[10px] font-bold text-primary">ADMIN</span>}
          </p>
          <RankTag wagered={p.total_wagered} />
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Balance</p>
          {bal !== null ? <Amount value={bal} /> : "—"}
        </div>
      </div>

      <Section title="Coins">
        <div className="flex gap-2">
          <Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} className="max-w-48" />
          <Button
            variant="success"
            disabled={!!busy || a <= 0}
            onClick={() =>
              act(
                "give",
                () => supabase.rpc("admin_adjust_balance", { p_user: id, p_delta: a }),
                `Gave ${fmt(a)} coins`,
                "BALANCE_ADD",
                `Added ${fmt(a)} Coins`
              )
            }
          >
            <Plus /> Give
          </Button>
          <Button
            variant="destructive"
            disabled={!!busy || a <= 0}
            onClick={() =>
              act(
                "take",
                () => supabase.rpc("admin_adjust_balance", { p_user: id, p_delta: -a }),
                `Removed ${fmt(a)} coins`,
                "BALANCE_REMOVE",
                `Deducted ${fmt(a)} Coins`
              )
            }
          >
            <Minus /> Remove
          </Button>
        </div>
      </Section>

      <Section title="Club Membership">
        <div className="flex items-center gap-3">
          <select
            value={currentTier}
            disabled={!!busy}
            onChange={(e) => handleClubChange(e.target.value as ClubTier)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-xs font-bold text-foreground border border-border/60 focus:outline-none"
          >
            <option value="none">Standard (None)</option>
            <option value="vip">VIP Club (2.0x)</option>
            <option value="vip_plus">VIP+ Club (2.5x)</option>
            <option value="mvp">MVP Club (3.0x)</option>
            <option value="mvp_plus">MVP+ Club (4.0x)</option>
            <option value="premium">Premium Club (5.0x)</option>
          </select>
          <ClubTag tier={currentTier} />
        </div>
      </Section>

      <Section title="Ban">
        {banned ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <span>
              Banned until {new Date(p.banned_until!).getFullYear() > 9000 ? "forever" : new Date(p.banned_until!).toLocaleString()}
              {p.ban_reason ? ` — "${p.ban_reason}"` : ""}
            </span>
            <Button
              size="sm"
              variant="surface"
              onClick={() =>
                act(
                  "unban",
                  () => supabase.rpc("admin_unban", { p_user: id }),
                  "Unbanned",
                  "UNBAN",
                  "Lifted ban"
                )
              }
            >
              Unban
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ban message shown to the player" />
            <div className="flex flex-wrap gap-2">
              <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="max-w-60" />
              <Button
                variant="destructive"
                disabled={!!busy || !until || p.id === userId}
                onClick={() =>
                  act(
                    "ban",
                    () =>
                      supabase.rpc("admin_ban", {
                        p_user: id,
                        p_until: new Date(until).toISOString(),
                        p_reason: reason,
                      }),
                    "User banned",
                    "BAN_TEMPORARY",
                    `Banned until ${until}: ${reason}`
                  )
                }
              >
                <Ban /> Ban until date
              </Button>
              <Button
                variant="destructive"
                disabled={!!busy || p.id === userId}
                onClick={() =>
                  act(
                    "perm",
                    () =>
                      supabase.rpc("admin_ban", {
                        p_user: id,
                        p_until: "9999-12-31T00:00:00Z",
                        p_reason: reason,
                      }),
                    "User permanently banned",
                    "BAN_PERMANENT",
                    `Permanent ban: ${reason}`
                  )
                }
              >
                <Ban /> Permanent ban
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Admin Permissions">
        {admin ? (
          <Button
            variant="surface"
            disabled={!!busy || p.id === userId}
            onClick={() =>
              act(
                "unadmin",
                () => supabase.rpc("admin_set_admin", { p_user: id, p_admin: false }),
                "Admin removed",
                "ADMIN_REVOKED",
                "Revoked admin role"
              )
            }
          >
            Remove admin
          </Button>
        ) : (
          <Button variant="surface" disabled={!!busy} onClick={() => setConfirmAdmin(true)}>
            <ShieldCheck /> Give admin
          </Button>
        )}
      </Section>

      <Section title="Wipe Player">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-muted-foreground mb-2">
          Wipes coins balance to 0, resets vault & rakeback, and resets all stats. This cannot be undone.
        </div>
        <Button variant="destructive" disabled={!!busy} onClick={() => setConfirmWipe(true)}>
          <Trash2 /> Wipe Player
        </Button>
      </Section>

      <Section title="Delete Account (Spam / Alts)">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-muted-foreground mb-2">
          Permanently deletes this player account and authentication credentials. They will be completely removed and won't show up on your Admin Panel anymore.
        </div>
        <Button
          variant="destructive"
          disabled={!!busy || p.id === userId || p.username.toLowerCase() === "keno"}
          onClick={() => setConfirmDelete(true)}
        >
          <UserX /> Permanently Delete Account
        </Button>
      </Section>

      <AlertDialog open={confirmAdmin} onOpenChange={setConfirmAdmin}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {p.username} will get full access to the Admin Panel, including coins, bans and codes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                act(
                  "admin",
                  () => supabase.rpc("admin_set_admin", { p_user: id, p_admin: true }),
                  "Admin given",
                  "ADMIN_GRANTED",
                  "Granted admin access"
                )
              }
            >
              Give admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmWipe} onOpenChange={setConfirmWipe}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wipe {p.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will zero their coin balance, empty their vault & rakeback, and reset all stats. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                setBusy("wipe");
                try {
                  await wipeUser({ data: { targetUserId: id } });
                  await recordAction({
                    data: { action: "WIPE_PLAYER", targetId: p.username, details: "Wiped all balances and statistics" },
                  });
                  setConfirmWipe(false);
                  toast.success(`${p.username} wiped successfully`);
                  await load();
                  onChanged();
                } catch (err) {
                  toast.error(errMsg(err));
                } finally {
                  setBusy(null);
                }
              }}
            >
              Wipe Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {p.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will PERMANENTLY remove this account from both authentication and the database. The user will be gone and will NOT show up on your Admin Panel anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                setBusy("delete");
                try {
                  await deleteUser({ data: { targetUserId: id } });
                  await recordAction({
                    data: { action: "DELETE_USER", targetId: p.username, details: "Permanently deleted user account" },
                  });
                  setConfirmDelete(false);
                  toast.success(`Account ${p.username} permanently deleted`);
                  onChanged();
                } catch (err) {
                  toast.error(errMsg(err));
                } finally {
                  setBusy(null);
                }
              }}
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function CodesTab() {
  const recordAction = useServerFn(adminRecordActionFn);
  const [codes, setCodes] = useState<Tables<"promo_codes">[]>([]);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("5000");
  const [hours, setHours] = useState("24");
  const [limited, setLimited] = useState(false);
  const [max, setMax] = useState("10");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setCodes(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!code.trim()) return toast.error("Enter a code");
    setBusy(true);
    const h = Number(hours);
    const { error } = await supabase.rpc("admin_create_code", {
      p_code: code.trim(),
      p_amount: Number(amount),
      p_expires: h > 0 ? new Date(Date.now() + h * 3_600_000).toISOString() : (null as unknown as string),
      p_max: limited ? Number(max) : (null as unknown as number),
    });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    await recordAction({
      data: { action: "CREATE_PROMO_CODE", details: `Code ${code.trim()} for ${amount} Coins` },
    });
    toast.success("Code created");
    setCode("");
    void load();
  }

  async function del(id: string, codeName: string) {
    const { error } = await supabase.rpc("admin_delete_code", { p_id: id });
    if (error) return toast.error(errMsg(error));
    await recordAction({
      data: { action: "DELETE_PROMO_CODE", details: `Deleted code ${codeName}` },
    });
    void load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="panel space-y-3 p-5">
        <p className="font-bold">Create code</p>
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE" />
        <label className="block text-xs font-semibold">
          Coins
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
        </label>
        <label className="block text-xs font-semibold">
          Duration (hours, 0 = never expires)
          <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={limited} onCheckedChange={setLimited} /> Limited redemptions
        </label>
        {limited && (
          <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max redemptions" />
        )}
        <Button className="w-full" disabled={busy} onClick={create}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />} Create code
        </Button>
      </div>
      <div className="panel overflow-hidden">
        {codes.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No codes yet</p>}
        {codes.map((c) => {
          const expired = c.expires_at && new Date(c.expires_at) < new Date();
          return (
            <div key={c.id} className="flex items-center gap-4 border-b border-border/60 px-4 py-3 text-sm last:border-0">
              <span className={cn("font-mono font-bold", expired && "text-muted-foreground line-through")}>{c.code}</span>
              <Amount value={c.amount} compact />
              <span className="flex-1 text-xs text-muted-foreground">
                {c.redemptions}
                {c.max_redemptions ? ` / ${c.max_redemptions}` : ""} used ·{" "}
                {c.expires_at ? (expired ? "expired" : `expires ${new Date(c.expires_at).toLocaleString()}`) : "never expires"}
              </span>
              <Button size="icon" variant="ghost" onClick={() => del(c.id, c.code)} aria-label="Delete">
                <Trash2 />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Strictly for user "Keno" ----------------
function AuditTab() {
  const getLogs = useServerFn(adminGetAuditLogsFn);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getLogs();
      setLogs(data ?? []);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div>
          <h3 className="text-base font-black flex items-center gap-2 text-foreground">
            <ShieldAlert className="size-5 text-gold" /> Admin Panel History Logger
          </h3>
          <p className="text-xs text-muted-foreground">
            Strictly confidential log visible ONLY to user "Keno" to monitor all admin panel actions and prevent abuse.
          </p>
        </div>
        <Button variant="surface" size="sm" onClick={loadLogs} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <History className="size-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No admin panel actions recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/70 text-muted-foreground font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Admin</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-2/60 transition-colors">
                  <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-bold text-foreground">
                    <span className="rounded bg-primary/20 px-1.5 py-0.5 text-primary text-[11px]">
                      {log.admin_username}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-gold uppercase">
                    {log.action}
                  </td>
                  <td className="py-3 px-3 font-semibold text-foreground">
                    {log.target_user || "—"}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground max-w-xs truncate" title={log.details}>
                    {log.details || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
