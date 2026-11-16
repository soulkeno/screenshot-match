import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Amount, PageHeader } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { RAKEBACK_RATE } from "@/lib/ranks";
import { errMsg, fmt } from "@/lib/format";
import { sfx } from "@/lib/sound";

export const Route = createFileRoute("/rakeback")({
  head: () => ({ meta: [{ title: "Rakeback — Ember Casino" }, { name: "description", content: "Earn a share of every bet back on Ember Casino, win or lose." }, { property: "og:title", content: "Rakeback — Ember Casino" }, { property: "og:description", content: "Earn a share of every bet back on Ember Casino, win or lose." }] }),
  component: Page,
});

function Page() {
  const { profile, wallet, refresh } = useApp();
  const [busy, setBusy] = useState(false);
  const vip = !!profile?.is_vip;
  const rate = vip ? RAKEBACK_RATE.vip : RAKEBACK_RATE.normal;
  const pending = Math.floor(Number(wallet?.rakeback ?? 0) * 100) / 100;
  async function claim() {
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_rakeback");
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    sfx.cashout(); toast.success(`+${fmt(data)} rakeback claimed!`); void refresh();
  }
  return (
    <div className="animate-fade-up">
      <PageHeader icon={Percent} title="Rakeback" subtitle="A slice of every bet comes back to you." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-8 text-center">
          <p className="text-sm text-muted-foreground">Ready to claim</p>
          <Amount value={pending} className="mt-2 text-4xl" />
          <div className="mt-6"><Button variant="play" size="xl" disabled={busy || pending < 1} onClick={claim}>{busy ? <Loader2 className="animate-spin" /> : "Claim rakeback"}</Button></div>
          {pending < 1 && <p className="mt-3 text-xs text-muted-foreground">You can claim once you have at least 1 coin.</p>}
        </div>
        <div className="panel p-8">
          <p className="text-sm text-muted-foreground">Your rate</p>
          <p className="font-display text-6xl text-gradient-primary">{(rate * 100).toFixed(1)}%</p>
          <p className="mt-2 text-sm text-muted-foreground">of every coin you wager{vip ? " — boosted by VIP" : ". VIP members get " + (RAKEBACK_RATE.vip * 100).toFixed(1) + "%"}.</p>
        </div>
      </div>
    </div>
  );
}
