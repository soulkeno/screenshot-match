/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bomb, Gem, Loader2, Swords, Timer } from "lucide-react";
import { GameLayout, BetInput, Segmented } from "@/components/games/GameLayout";
import { useBetAmount } from "@/components/games/useGame";
import { Button } from "@/components/ui/button";
import { duelClaimFn, duelRevealFn } from "@/lib/games.functions";
import { errMsg } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { LobbyRow, PlayerChip, usePvp, type PvpGame } from "./usePvp";

export default function MinesDuel() {
  const [bet, setBet] = useBetAmount("mines-duel");
  const [mines, setMines] = useState(3);
  const { games, userId, busy, create, join, cancel, reload } = usePvp("duel");
  const [watch, setWatch] = useState<string | null>(null);

  useEffect(() => {
    if (watch) return;
    const mine = games.find((g) => g.status === "active" && (g.creator_id === userId || g.joiner_id === userId));
    if (mine) setWatch(mine.id);
  }, [games, userId, watch]);

  const current = games.find((g) => g.id === watch) ?? null;
  return (
    <div className="space-y-6">
      <GameLayout slug="mines-duel" controls={
        <>
          <BetInput value={bet} onChange={setBet} disabled={busy === "create"} />
          <Segmented label="Mines on the board" value={mines} onChange={setMines} options={[1, 3, 5, 8].map((m) => ({ value: m, label: m }))} />
          <Button variant="play" size="xl" className="w-full" disabled={busy === "create"} onClick={() => void create({ wager: Number(bet), mines })}>
            {busy === "create" ? <Loader2 className="animate-spin" /> : <Swords />} Open duel
          </Button>
          <p className="text-xs text-muted-foreground">Take turns flipping tiles. Whoever hits a mine loses. If your opponent doesn't move within 45 seconds you can claim the win.</p>
        </>
      }>
        <div className="flex h-full min-h-[420px] items-center justify-center p-6">
          {current ? <DuelBoard g={current} me={userId} onChange={reload} onClose={() => setWatch(null)} /> : (
            <div className="text-center text-muted-foreground"><Bomb className="mx-auto size-16 opacity-40" /><p className="mt-4 text-sm">Open a duel or take one below.</p></div>
          )}
        </div>
      </GameLayout>
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Duels</h2>
        {games.length === 0 && <p className="panel p-6 text-center text-sm text-muted-foreground">No duels yet. Open the first one!</p>}
        {games.map((g) => (
          <LobbyRow key={g.id} g={g} me={userId} busy={busy} onJoin={async () => { const r = await join(g.id); if (r) setWatch(g.id); }} onCancel={() => void cancel(g.id)} onOpen={() => setWatch(g.id)}>
            <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><Bomb className="size-3.5" />{(g.config as any)?.mines} mines</span>
          </LobbyRow>
        ))}
      </div>
    </div>
  );
}

function DuelBoard({ g, me, onChange, onClose }: { g: PvpGame; me: string | null; onChange: () => void; onClose: () => void }) {
  const reveal = useServerFn(duelRevealFn);
  const claim = useServerFn(duelClaimFn);
  const [pending, setPending] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const st = (g.state ?? {}) as any;
  const revealed: { tile: number; by: string; mine: boolean }[] = st.revealed ?? [];
  const mineTiles: number[] = st.mines ?? [];
  const myTurn = g.status === "active" && st.turn === me;
  const involved = me === g.creator_id || me === g.joiner_id;
  const left = st.turnAt ? 45 - Math.floor((now - st.turnAt) / 1000) : 45;

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (g.status === "done" && involved) { if (g.winner_id === me) sfx.win(); else sfx.lose(); }
  }, [g.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(i: number) {
    if (!myTurn || pending !== null) return;
    setPending(i);
    try { await reveal({ data: { id: g.id, tile: i } }); sfx.click?.(); onChange(); } catch (e) { toast.error(errMsg(e)); }
    setPending(null);
  }
  const turnName = st.turn === g.creator_id ? g.creator_name : g.joiner_name;
  const winnerName = g.winner_id === g.creator_id ? g.creator_name : g.joiner_name;

  return (
    <div className="w-full max-w-md animate-pop-in">
      <div className="mb-4 flex items-center justify-between">
        <PlayerChip name={g.creator_name} you={g.creator_id === me} className={cn(st.turn === g.creator_id && "text-primary")} />
        <span className="font-display text-xl text-muted-foreground">VS</span>
        <PlayerChip name={g.joiner_name} you={g.joiner_id === me} className={cn(st.turn === g.joiner_id && "text-primary")} />
      </div>
      <div className="mb-3 text-center text-sm font-semibold">
        {g.status === "open" && <span className="text-muted-foreground">Waiting for an opponent…</span>}
        {g.status === "active" && (myTurn ? <span className="text-primary">Your turn — pick a tile</span> : <span className="text-muted-foreground">{turnName}'s turn</span>)}
        {g.status === "active" && <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Timer className="size-3" />{Math.max(0, left)}s</span>}
        {g.status === "done" && <span className="font-display text-3xl tracking-wide text-success">{winnerName} wins{st.timeout ? " (timeout)" : ""}</span>}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 25 }, (_, i) => {
          const r = revealed.find((x) => x.tile === i);
          const isMine = r?.mine || (g.status === "done" && mineTiles.includes(i));
          return (
            <button key={i} disabled={!myTurn || !!r || pending !== null} onClick={() => void pick(i)}
              className={cn("grid aspect-square place-items-center rounded-lg border transition-all",
                r ? (r.mine ? "border-destructive bg-destructive/25 animate-pop-in" : r.by === g.creator_id ? "border-primary/50 bg-primary/15 animate-pop-in" : "border-accent/50 bg-accent/15 animate-pop-in")
                  : isMine ? "border-destructive/40 bg-destructive/10 opacity-70" : "border-border bg-surface-2 enabled:hover:-translate-y-0.5 enabled:hover:border-primary/50")}>
              {pending === i ? <Loader2 className="size-5 animate-spin" /> : isMine ? <Bomb className="size-6 text-destructive" /> : r ? <Gem className={cn("size-6", r.by === g.creator_id ? "text-primary" : "text-accent")} /> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {g.status === "active" && involved && !myTurn && left <= 0 && (
          <Button variant="success" size="sm" onClick={async () => { try { await claim({ data: { id: g.id } }); onChange(); } catch (e) { toast.error(errMsg(e)); } }}>Claim win</Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
