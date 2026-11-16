/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Boxes, Loader2 } from "lucide-react";
import { GameLayout, Segmented } from "@/components/games/GameLayout";
import { CaseReel } from "@/components/games/CaseReel";
import { Button } from "@/components/ui/button";
import { CASES, type CaseItem } from "@/lib/games/logic";
import { Amount } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { LobbyRow, PlayerChip, usePvp, type PvpGame } from "./usePvp";

export default function CaseBattles() {
  const [caseId, setCaseId] = useState(CASES[0].id);
  const [rounds, setRounds] = useState(1);
  const { games, userId, busy, create, join, cancel } = usePvp("battle");
  const [watch, setWatch] = useState<string | null>(null);
  const { refresh } = useApp();
  const def = CASES.find((c) => c.id === caseId)!;
  const current = games.find((g) => g.id === watch) ?? null;

  return (
    <div className="space-y-6">
      <GameLayout slug="case-battles" controls={
        <>
          <div>
            <p className="mb-1.5 text-xs font-semibold">Case</p>
            <div className="grid grid-cols-2 gap-2">
              {CASES.map((c) => (
                <button key={c.id} onClick={() => setCaseId(c.id)} className={cn("rounded-lg border p-2 text-left transition-all", c.id === caseId ? "border-primary bg-surface-2" : "border-border bg-background hover:border-primary/40")}>
                  <p className="text-xs font-bold">{c.name}</p><Amount value={c.price} compact className="text-xs" />
                </button>
              ))}
            </div>
          </div>
          <Segmented label="Rounds" value={rounds} onChange={setRounds} options={[1, 2, 3, 5].map((r) => ({ value: r, label: r }))} />
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"><span className="text-muted-foreground">Entry</span><Amount value={def.price * rounds} /></div>
          <Button variant="play" size="xl" className="w-full" disabled={busy === "create"} onClick={async () => { const r = await create({ caseId, rounds }); if (r) { setWatch(r.id); void refresh(); } }}>
            {busy === "create" ? <Loader2 className="animate-spin" /> : <Boxes />} Create battle
          </Button>
          <p className="text-xs text-muted-foreground">Both players open the same cases. Highest total value takes everything.</p>
        </>
      }>
        <div className="flex h-full min-h-[420px] items-center justify-center p-4">
          {current ? <BattleView key={current.id + current.status} g={current} me={userId} onClose={() => setWatch(null)} /> : (
            <div className="text-center text-muted-foreground"><Boxes className="mx-auto size-16 opacity-40" /><p className="mt-4 text-sm">Create a battle or join one below.</p></div>
          )}
        </div>
      </GameLayout>
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Battles</h2>
        {games.length === 0 && <p className="panel p-6 text-center text-sm text-muted-foreground">No battles yet. Create the first one!</p>}
        {games.map((g) => {
          const c = CASES.find((x) => x.id === (g.config as any)?.caseId);
          return (
            <LobbyRow key={g.id} g={g} me={userId} busy={busy} onJoin={async () => { const r = await join(g.id); if (r) setWatch(g.id); }} onCancel={() => void cancel(g.id)} onOpen={() => setWatch(g.id)}>
              <span className="text-xs font-bold text-muted-foreground">{(g.config as any)?.rounds}× {c?.name}</span>
            </LobbyRow>
          );
        })}
      </div>
    </div>
  );
}

function BattleView({ g, me, onClose }: { g: PvpGame; me: string | null; onClose: () => void }) {
  const cfg = g.config as any;
  const st = g.state as any;
  const def = CASES.find((c) => c.id === cfg.caseId)!;
  const rounds: { creator: CaseItem; joiner: CaseItem }[] = st?.rounds ?? [];
  const [round, setRound] = useState(0);
  const [spin, setSpin] = useState(0);
  const [done, setDone] = useState(false);
  const fresh = Date.now() - new Date(g.updated_at).getTime() < 20000;

  useEffect(() => {
    if (g.status !== "done") return;
    if (!fresh) { setRound(rounds.length - 1); setDone(true); return; }
    setSpin(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    if (round + 1 < rounds.length) { setRound(round + 1); setSpin((s) => s + 1); }
    else { setDone(true); if (g.winner_id === me) sfx.win(); else if (me === g.creator_id || me === g.joiner_id) sfx.lose(); }
  };
  const sum = (who: "creator" | "joiner", upto: number) => rounds.slice(0, upto + 1).reduce((s, r) => s + def.price * r[who].mult, 0);
  const r = rounds[round];
  const winnerName = g.winner_id === g.creator_id ? g.creator_name : g.winner_id ? g.joiner_name : null;

  return (
    <div className="w-full animate-pop-in">
      <p className="mb-3 text-center text-sm text-muted-foreground">{def.name} · round {Math.min(round + 1, Math.max(1, rounds.length))}/{cfg.rounds}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {(["creator", "joiner"] as const).map((who, i) => (
          <div key={who} className={cn("rounded-xl border border-border bg-surface p-3", done && g.winner_id === (who === "creator" ? g.creator_id : g.joiner_id) && "border-success")}>
            <div className="mb-2 flex items-center justify-between">
              <PlayerChip name={who === "creator" ? g.creator_name : g.joiner_name} you={(who === "creator" ? g.creator_id : g.joiner_id) === me} />
              {rounds.length > 0 && <Amount value={sum(who, done ? rounds.length - 1 : round)} compact />}
            </div>
            {g.status === "done" && r ? <CaseReel def={def} result={r[who]} spinKey={spin} compact duration={3200} onDone={i === 0 ? next : undefined} />
              : <div className="grid h-40 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">Waiting…</div>}
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        {done && <p className="font-display text-3xl tracking-wide text-success animate-fade-up">{winnerName ? `${winnerName} wins` : "It's a tie"}</p>}
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
