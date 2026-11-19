import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Lock, Loader2, Vault, Percent, Clock, Sparkles, TrendingUp, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Amount, Coin, PageHeader } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useApp } from "@/lib/app-context";
import { rankProgress } from "@/lib/ranks";
import { vaultRate } from "@/lib/rewards";
import { errMsg, fmt, timeLeft } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vault")({
  head: () => ({ meta: [{ title: "Vault — Keno Casino" }, { name: "description", content: "Store coins safely in your Keno vault and lock it for 24 hours." }, { property: "og:title", content: "Vault — Keno Casino" }, { property: "og:description", content: "Store coins safely in your Keno vault and lock it for 24 hours." }] }),
  component: Page,
});

function Page() {
  const { wallet, balance, refresh, profile } = useApp();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const vault = Number(wallet?.vault ?? 0);
  const lockLeft = wallet?.vault_locked_until ? new Date(wallet.vault_locked_until).getTime() - now : 0;
  const locked = lockLeft > 0;
  const max = mode === "deposit" ? balance : vault;

  // Vault Daily Interest calculations
  const prog = rankProgress(profile?.total_wagered);
  const rate = vaultRate(prog.cur.index, !!profile?.is_vip);
  const ratePct = (rate * 100).toFixed(2);
  const vaultSince = (wallet as any)?.vault_since ? new Date((wallet as any).vault_since).getTime() : null;
  const elapsedMs = vaultSince && vault > 0 ? Math.max(0, now - vaultSince) : 0;
  const daysUntouched = Math.floor(elapsedMs / 86_400_000);
  const nextPayoutIn = vault > 0 ? Math.max(0, 86_400_000 - (elapsedMs % 86_400_000)) : 86_400_000;
  const accruedEst = daysUntouched >= 1 && vault > 0 ? Math.floor(vault * (Math.pow(1 + rate, daysUntouched) - 1) * 100) / 100 : 0;
  const totalInterestEarned = Number((wallet as any)?.vault_interest_total ?? 0);

  async function submit() {
    const a = Number(amt);
    if (!(a > 0)) return toast.error("Enter an amount");
    setBusy(true);
    const { error } = mode === "deposit" ? await supabase.rpc("vault_deposit", { p_amount: a }) : await supabase.rpc("vault_withdraw", { p_amount: a });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success(mode === "deposit" ? "Moved to vault" : "Withdrawn to balance");
    setAmt(""); void refresh();
  }
  async function lock() {
    const { error } = await supabase.rpc("vault_lock");
    if (error) return toast.error(errMsg(error));
    toast.success("Vault locked for 24 hours"); void refresh();
  }
  async function collectInterest() {
    setCollecting(true);
    const { data, error } = await supabase.rpc("vault_collect");
    setCollecting(false);
    if (error) return toast.error(errMsg(error));
    const gained = Number(data ?? 0);
    if (gained > 0) {
      try { sfx.win(); } catch {}
      toast.success(`Collected +${fmt(gained)} coins interest directly into your vault! 🎉`);
    } else {
      toast.info("Keep coins untouched in your vault for 24h to accrue interest.");
    }
    void refresh();
  }
  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <PageHeader icon={Vault} title="Vault" subtitle="Store coins safely and earn 1% to 2% daily interest every 24 hours." />

      {/* 24h Interest Card */}
      <div className="panel mb-4 overflow-hidden border-success/30 bg-gradient-to-br from-success/10 via-surface to-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid size-12 place-items-center rounded-2xl bg-success/20 text-success shadow-inner">
              <TrendingUp className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-extrabold text-foreground">Vault Daily Interest</p>
                <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-black text-success">
                  {ratePct}% / 24h
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Earn 1% to 2% interest automatically on vault coins kept untouched for 24 hours.
              </p>
            </div>
          </div>
          {accruedEst > 0 ? (
            <Button
              variant="success"
              size="sm"
              disabled={collecting}
              onClick={collectInterest}
              className="gap-1.5 font-bold shadow-glow"
            >
              {collecting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 fill-current" />}
              Collect +{fmt(accruedEst)}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={collecting || vault <= 0}
              onClick={collectInterest}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              {collecting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-3.5" />}
              Collect Interest
            </Button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5 rounded-xl border border-border/80 bg-surface/60 p-3 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
            <p className="mt-0.5 font-bold text-foreground">
              {vault <= 0 ? "Deposit coins to start" : daysUntouched >= 1 ? `${daysUntouched} day(s) ready` : "Accruing"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Interest In</p>
            <p className="mt-0.5 font-bold tabular text-primary">
              {vault > 0 ? timeLeft(nextPayoutIn) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Earned</p>
            <p className="mt-0.5 font-bold tabular text-success">
              +{fmt(totalInterestEarned)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="panel p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Balance</p><Amount value={balance} className="mt-1 text-2xl" /></div>
        <div className="panel p-5"><p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Vault {locked && <Lock className="size-3 text-primary" />}</p><Amount value={vault} className="mt-1 text-2xl" /></div>
      </div>
      <div className="panel mt-4 p-5">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1">
          {(["deposit", "withdraw"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={cn("rounded-md py-2 text-sm font-bold capitalize", mode === m ? "bg-surface-2 ring-1 ring-primary/40" : "text-muted-foreground")}>{m}</button>)}
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex flex-1 items-center gap-2 px-3"><Coin /><input type="number" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" className="h-12 w-full bg-transparent font-bold tabular outline-none" /></div>
          <button onClick={() => setAmt(String(Math.floor(max * 100) / 100))} className="border-l border-border px-4 text-xs font-bold text-muted-foreground hover:text-foreground">MAX</button>
        </div>
        <Button variant="play" size="xl" className="mt-4 w-full" disabled={busy || (mode === "withdraw" && locked)} onClick={submit}>
          {busy ? <Loader2 className="animate-spin" /> : mode === "withdraw" && locked ? `Locked for ${timeLeft(lockLeft)}` : mode === "deposit" ? "Deposit to vault" : "Withdraw to balance"}
        </Button>
      </div>
      <div className="panel mt-4 flex items-center gap-4 p-5">
        <Lock className="size-8 shrink-0 text-primary" />
        <div className="flex-1"><p className="font-bold">{locked ? `Locked — ${timeLeft(lockLeft)} left` : "Lock your vault"}</p><p className="text-sm text-muted-foreground">Stops all withdrawals from your vault for 24 hours.</p></div>
        <Button variant="surface" onClick={() => setConfirm(true)}>{locked ? "Extend" : "Lock 24h"}</Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>Locking your vault means you cannot withdraw any coins from it for the next 24 hours. You can still deposit. This cannot be undone early.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={lock}>Lock vault</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
