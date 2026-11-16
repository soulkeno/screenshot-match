/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Loader2, Swords } from "lucide-react";
import { GameLayout, BetInput, Segmented } from "@/components/games/GameLayout";
import { useBetAmount } from "@/components/games/useGame";
import { Coin3D } from "@/components/games/Coinflip";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LobbyRow, PlayerChip, usePvp, type PvpGame } from "./usePvp";

export default function PvpCoinflip() {
  const [bet, setBet] = useBetAmount("pvp-coinflip");
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const { games, userId, busy, create, join, cancel } = usePvp("coinflip");
  const [watch, setWatch] = useState<string | null>(null);
  const { refresh } = useApp();
  const seen = useRef<Set<string>>(new Set());

  // auto-open my games when they finish
  useEffect(() => {
    for (const g of games) {
      if (g.status === "done" && (g.creator_id === userId || g.joiner_id === userId) && !seen.current.has(g.id)) {
        seen.current.add(g.id);
        if (Date.now() - new Date(g.updated_at).getTime() < 15000) setWatch(g.id);
      }
    }
  }, [games, userId]);

  const current = games.find((g) => g.id === watch) ?? null;
  return (
    <div className="space-y-6">
      <GameLayout slug="pvp-coinflip" controls={
        <>
          <BetInput value={bet} onChange={setBet} disabled={busy === "create"} />
          <Segmented label="Your side" value={side} onChange={setSide} options={[{ value: "heads", label: "Heads" }, { value: "tails", label: "Tails" }]} />
          <Button variant="play" size="xl" className="w-full" disabled={busy === "create"} onClick={async () => { const r = await create({ wager: Number(bet), side }); if (r) { sfx.click?.(); void refresh(); } }}>
            {busy === "create" ? <Loader2 className="animate-spin" /> : <Swords />} Create flip
          </Button>
          <p className="text-xs text-muted-foreground">Winner takes the pot minus a 2% fee. Results come from the provably fair server seed revealed after the flip.</p>
        </>
      }>
        <div className="flex h-full min-h-[420px] items-center justify-center p-6">
          {current ? <FlipView g={current} me={userId} onClose={() => setWatch(null)} /> : (
            <div className="text-center text-muted-foreground">
              <Coin3D rotation={0} spinning={false} size={160} />
              <p className="mt-6 text-sm">Create a flip or join one below.</p>
            </div>
          )}
        </div>
      </GameLayout>
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Open flips</h2>
        {games.length === 0 && <p className="panel p-6 text-center text-sm text-muted-foreground">No flips yet. Create the first one!</p>}
        {games.map((g) => (
          <LobbyRow key={g.id} g={g} me={userId} busy={busy} onJoin={async () => { const r = await join(g.id); if (r) { setWatch(g.id); seen.current.add(g.id); } }} onCancel={() => void cancel(g.id)} onOpen={() => setWatch(g.id)}>
            <span className="text-xs font-bold capitalize text-muted-foreground">{g.creator_name} picks {(g.config as any)?.side}</span>
            {g.status === "done" && <span className="ml-2 text-xs font-bold text-success">→ {(g.state as any)?.result}</span>}
          </LobbyRow>
        ))}
      </div>
    </div>
  );
}

function FlipView({ g, me, onClose }: { g: PvpGame; me: string | null; onClose: () => void }) {
  const res = (g.state as any)?.result as "heads" | "tails" | undefined;
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!res) return;
    setSpinning(true);
    setShown(false);
    const t0 = setTimeout(() => setRot(1800 + (res === "tails" ? 180 : 0)), 50);
    const t = setTimeout(() => { setSpinning(false); setShown(true); if (g.winner_id === me) sfx.win(); else if (me === g.creator_id || me === g.joiner_id) sfx.lose(); }, 2200);
    return () => { clearTimeout(t0); clearTimeout(t); };
  }, [g.id, res]); // eslint-disable-line react-hooks/exhaustive-deps
  const winnerName = g.winner_id === g.creator_id ? g.creator_name : g.joiner_name;
  return (
    <div className="w-full max-w-lg text-center animate-pop-in">
      <div className="mb-6 flex items-center justify-between">
        <PlayerChip name={g.creator_name} you={g.creator_id === me} className={cn(shown && g.winner_id === g.creator_id && "text-success")} />
        <span className="font-display text-2xl text-muted-foreground">VS</span>
        <PlayerChip name={g.joiner_name} you={g.joiner_id === me} className={cn(shown && g.winner_id === g.joiner_id && "text-success")} />
      </div>
      <Coin3D rotation={rot} spinning={spinning} size={200} />
      <div className="mt-6 h-16">
        {g.status !== "done" ? <p className="text-sm text-muted-foreground">Waiting for an opponent…</p> : shown && (
          <div className="animate-fade-up">
            <p className="font-display text-4xl tracking-wide text-success">{winnerName} wins</p>
            <p className="text-sm text-muted-foreground">Landed on {res} · pot {fmt(Number(g.wager) * 2 * 0.98)}</p>
          </div>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
    </div>
  );
}
