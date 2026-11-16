import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Lock, Loader2, Vault } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Amount, Coin, PageHeader } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useApp } from "@/lib/app-context";
import { errMsg, timeLeft } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vault")({
  head: () => ({ meta: [{ title: "Vault — Ember Casino" }, { name: "description", content: "Store coins safely in your Ember vault and lock it for 24 hours." }, { property: "og:title", content: "Vault — Ember Casino" }, { property: "og:description", content: "Store coins safely in your Ember vault and lock it for 24 hours." }] }),
  component: Page,
});

function Page() {
  const { wallet, balance, refresh } = useApp();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const vault = Number(wallet?.vault ?? 0);
  const lockLeft = wallet?.vault_locked_until ? new Date(wallet.vault_locked_until).getTime() - now : 0;
  const locked = lockLeft > 0;
  const max = mode === "deposit" ? balance : vault;

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
  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <PageHeader icon={Vault} title="Vault" subtitle="Coins in your vault can't be played with." />
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
