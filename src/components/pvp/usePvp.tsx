/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { pvpCancelFn, pvpCreateFn, pvpJoinFn } from "@/lib/games.functions";
import { useApp } from "@/lib/app-context";
import { errMsg } from "@/lib/format";
import { Amount, UserAvatar } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PvpGame = Tables<"pvp_games">;

export function usePvp(kind: string) {
  const { userId } = useApp();
  const [games, setGames] = useState<PvpGame[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const create = useServerFn(pvpCreateFn);
  const join = useServerFn(pvpJoinFn);
  const cancel = useServerFn(pvpCancelFn);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data } = await supabase.from("pvp_games").select("*").eq("kind", kind)
      .or(`status.in.(open,active),and(status.eq.done,updated_at.gte.${since})`)
      .order("created_at", { ascending: false }).limit(40);
    setGames(data ?? []);
  }, [kind]);

  useEffect(() => {
    void load();
    const ch = supabase.channel(`pvp-${kind}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pvp_games", filter: `kind=eq.${kind}` }, (pl) => {
        const g = pl.new as PvpGame;
        if (!g?.id) return;
        setGames((prev) => {
          const rest = prev.filter((x) => x.id !== g.id);
          if (g.status === "cancelled") return rest;
          return [g, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at));
        });
      })
      .subscribe();
    const t = setInterval(load, 15000);
    return () => { void supabase.removeChannel(ch); clearInterval(t); };
  }, [kind, load]);

  const run = useCallback(async (key: string, f: () => Promise<any>) => {
    setBusy(key);
    try { const r = await f(); await load(); return r; } catch (e) { toast.error(errMsg(e)); return null; } finally { setBusy(null); }
  }, [load]);

  return {
    games, userId, busy, reload: load,
    create: (params: any) => run("create", () => create({ data: { kind, params } })),
    join: (id: string) => run(id, () => join({ data: { id } })),
    cancel: (id: string) => run(id, () => cancel({ data: { id } })),
  };
}

export function PlayerChip({ name, you, className }: { name: string | null; you?: boolean; className?: string }) {
  if (!name) return <span className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}><span className="grid size-8 place-items-center rounded-lg border border-dashed border-border">?</span>Waiting…</span>;
  return <span className={cn("flex items-center gap-2 text-sm font-semibold", className)}><UserAvatar name={name} size={32} />{name}{you && <span className="text-[10px] text-primary">(you)</span>}</span>;
}

export function LobbyRow({ g, me, busy, onJoin, onCancel, onOpen, children }: { g: PvpGame; me: string | null; busy: string | null; onJoin: () => void; onCancel: () => void; onOpen?: () => void; children?: ReactNode }) {
  const mine = g.creator_id === me;
  const involved = mine || g.joiner_id === me;
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 animate-fade-up", involved && "border-primary/40")}>
      <PlayerChip name={g.creator_name} you={mine} />
      <span className="font-display text-lg text-muted-foreground">VS</span>
      <PlayerChip name={g.joiner_name} you={g.joiner_id === me} />
      <div className="flex-1">{children}</div>
      <Amount value={g.wager} compact />
      {g.status === "open" && (mine
        ? <Button size="sm" variant="surface" disabled={busy === g.id} onClick={onCancel}>{busy === g.id ? <Loader2 className="animate-spin" /> : <X />}Cancel</Button>
        : <Button size="sm" disabled={busy === g.id} onClick={onJoin}>{busy === g.id ? <Loader2 className="animate-spin" /> : "Join"}</Button>)}
      {g.status !== "open" && onOpen && <Button size="sm" variant={involved && g.status === "active" ? "default" : "surface"} onClick={onOpen}>{g.status === "active" ? (involved ? "Play" : "Watch") : "View"}</Button>}
    </div>
  );
}
