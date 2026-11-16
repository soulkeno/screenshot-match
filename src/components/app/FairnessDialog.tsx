import { useEffect, useState } from "react";
import { Copy, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useApp } from "@/lib/app-context";
import { getFairnessFn, rotateSeedFn } from "@/lib/games.functions";
import { floats, sha256Hex } from "@/lib/fair";
import * as L from "@/lib/games/logic";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { errMsg } from "@/lib/format";

type F = { hash: string; clientSeed: string; nonce: number; prev: { serverSeed: string; hash: string; clientSeed: string; nonce: number } | null };

export function FairnessDialog() {
  const { fairOpen, setFairOpen } = useApp();
  const getF = useServerFn(getFairnessFn);
  const rotate = useServerFn(rotateSeedFn);
  const [f, setF] = useState<F | null>(null);
  const [cs, setCs] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!fairOpen) return;
    getF().then((r: F) => { setF(r); setCs(r.clientSeed); }).catch((e) => toast.error(errMsg(e)));
  }, [fairOpen, getF]);

  async function doRotate() {
    setBusy(true);
    try {
      const r: F = await rotate({ data: { clientSeed: cs } });
      setF(r); setCs(r.clientSeed);
      toast.success("New seed pair active. Your previous server seed is now revealed.");
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }

  return (
    <Dialog open={fairOpen} onOpenChange={setFairOpen}>
      <DialogContent className="border-border bg-popover sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-success" /> Provably fair</DialogTitle>
          <DialogDescription>Every result comes from HMAC-SHA256(server seed, client seed:nonce:round). You see the server seed's hash before you play, and the seed itself once you rotate it, so you can check that nothing was changed.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="seeds">
          <TabsList className="grid w-full grid-cols-2 bg-surface">
            <TabsTrigger value="seeds">Seeds</TabsTrigger>
            <TabsTrigger value="verify">Verify</TabsTrigger>
          </TabsList>
          <TabsContent value="seeds" className="space-y-3 pt-3">
            {!f ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" /></div> : (
              <>
                <Field label="Active server seed (hashed)" value={f.hash} />
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Client seed</p>
                  <div className="flex gap-2">
                    <Input value={cs} onChange={(e) => setCs(e.target.value)} className="h-10 bg-surface font-mono text-xs" />
                    <Button onClick={doRotate} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Rotate</Button>
                  </div>
                </div>
                <Field label="Bets made with this pair (nonce)" value={String(f.nonce)} />
                {f.prev && (
                  <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Previous pair (revealed)</p>
                    <Field label="Server seed" value={f.prev.serverSeed} />
                    <Field label="Hash" value={f.prev.hash} />
                    <Field label="Client seed" value={f.prev.clientSeed} />
                    <Field label="Total bets" value={String(f.prev.nonce)} />
                  </div>
                )}
              </>
            )}
          </TabsContent>
          <TabsContent value="verify" className="pt-3"><Verifier prev={f?.prev ?? null} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
        <button onClick={() => { void navigator.clipboard.writeText(value); toast.success("Copied"); }} className="text-muted-foreground hover:text-foreground" aria-label="Copy"><Copy className="size-3.5" /></button>
      </div>
    </div>
  );
}

const GAMES_V = ["dice", "limbo", "crash", "coinflip", "roulette", "plinko", "keno", "mines", "slots"] as const;

function Verifier({ prev }: { prev: F["prev"] }) {
  const [game, setGame] = useState<(typeof GAMES_V)[number]>("dice");
  const [ss, setSs] = useState(prev?.serverSeed ?? "");
  const [cs, setCs] = useState(prev?.clientSeed ?? "");
  const [nonce, setNonce] = useState("0");
  const [extra, setExtra] = useState("3");
  const [out, setOut] = useState<string | null>(null);
  const [hash, setHash] = useState("");

  async function run() {
    const n = Number(nonce);
    setHash(await sha256Hex(ss));
    const f = (c: number) => floats(ss, cs, n, c);
    let r = "";
    if (game === "dice") r = `Roll: ${L.diceRoll((await f(1))[0]).toFixed(2)}`;
    if (game === "limbo" || game === "crash") r = `Result: ${L.limboResult((await f(1))[0]).toFixed(2)}×`;
    if (game === "coinflip") r = `Result: ${L.coinResult((await f(1))[0])}`;
    if (game === "roulette") r = `Number: ${L.rouletteNumber((await f(1))[0])}`;
    if (game === "plinko") { const rows = Number(extra) || 16; const p = L.plinkoPath(await f(rows), rows); r = `Path: ${p.map((x) => (x ? "R" : "L")).join("")} → slot ${p.reduce((a, b) => a + b, 0)}`; }
    if (game === "keno") r = `Drawn: ${L.kenoDraw(await f(10)).join(", ")}`;
    if (game === "mines") { const m = Number(extra) || 3; r = `Mines at tiles: ${L.minesPositions(await f(m), m).map((x) => x + 1).sort((a, b) => a - b).join(", ")}`; }
    if (game === "slots") { const s = L.slotSpin(await f(15)); r = `Pays ${s.mult}× · Reels: ${s.grid.map((c) => c.join("/")).join(" | ")}`; }
    setOut(r);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select value={game} onChange={(e) => setGame(e.target.value as typeof game)} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm">
          {GAMES_V.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <Input value={nonce} onChange={(e) => setNonce(e.target.value)} placeholder="Nonce" className="h-10 bg-surface" />
      </div>
      <Input value={ss} onChange={(e) => setSs(e.target.value)} placeholder="Server seed (revealed)" className="h-10 bg-surface font-mono text-xs" />
      <Input value={cs} onChange={(e) => setCs(e.target.value)} placeholder="Client seed" className="h-10 bg-surface font-mono text-xs" />
      {(game === "plinko" || game === "mines") && <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={game === "plinko" ? "Rows (8/12/16)" : "Mines count"} className="h-10 bg-surface" />}
      <Button className="w-full" onClick={run} disabled={!ss || !cs}>Verify</Button>
      {out && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm animate-fade-up">
          <p className="font-semibold text-success">{out}</p>
          <p className="mt-1 break-all text-[11px] text-muted-foreground">SHA-256 of seed: {hash}</p>
        </div>
      )}
    </div>
  );
}
