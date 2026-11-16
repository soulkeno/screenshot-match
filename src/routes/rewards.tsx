import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Amount, PageHeader } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { DAILY_REWARDS, RANKS, getRank } from "@/lib/ranks";
import { errMsg, fmt, timeLeft } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rewards")({
  head: () => ({ meta: [{ title: "Daily Rewards — Keno Casino" }, { name: "description", content: "Claim free coins every 24 hours on Keno Casino. Higher ranks and VIP earn more." }, { property: "og:title", content: "Daily Rewards — Keno Casino" }, { property: "og:description", content: "Claim free coins every 24 hours on Keno Casino. Higher ranks and VIP earn more." }] }),
  component: Page,
});

function Page() {
  const { profile, wallet, refresh } = useApp();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const rank = getRank(profile?.total_wagered);
  const vip = !!profile?.is_vip;
  const amount = DAILY_REWARDS[rank.index] * (vip ? 2 : 1);
  const readyAt = wallet?.last_daily_at ? new Date(wallet.last_daily_at).getTime() + 86_400_000 : 0;
  const left = readyAt - now;
  async function claim() {
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_daily");
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    sfx.win(); toast.success(`+${fmt(data)} coins claimed!`); void refresh();
  }
  return (
    <div className="animate-fade-up">
      <PageHeader icon={Gift} title="Daily Rewards" subtitle="Free coins every 24 hours. Rank up for bigger rewards." />
      <div className="panel relative overflow-hidden p-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <Gift className="relative mx-auto size-16 text-primary animate-float" />
        <p className="relative mt-4 text-sm text-muted-foreground">Today's reward as {rank.name}{vip ? " · VIP 2×" : ""}</p>
        <Amount value={amount} className="relative mt-1 text-4xl" />
        <div className="relative mt-6">
          <Button variant="play" size="xl" disabled={busy || left > 0} onClick={claim}>{busy ? <Loader2 className="animate-spin" /> : left > 0 ? `Ready in ${timeLeft(left)}` : "Claim reward"}</Button>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {RANKS.map((r) => (
          <div key={r.name} className={cn("panel flex flex-col items-center p-3 text-center", r.index === rank.index && "ring-2 ring-primary")}>
            <img src={r.icon} alt={r.name} className="size-12" />
            <p className="mt-1 text-xs font-bold" style={{ color: r.tone }}>{r.name}</p>
            <Amount value={DAILY_REWARDS[r.index] * (vip ? 2 : 1)} compact className="text-xs" />
          </div>
        ))}
      </div>
    </div>
  );
}
