import { createFileRoute } from "@tanstack/react-router";
import { Gift, Percent, Sparkles, Rocket, Check } from "lucide-react";
import { PageHeader } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
const promoVip = "/vip-club-icon.png";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vip")({
  head: () => ({ meta: [{ title: "VIP Club — Keno Casino" }, { name: "description", content: "Keno VIP perks: boosted daily rewards, boosted rakeback and custom cosmetics." }, { property: "og:title", content: "VIP Club — Keno Casino" }, { property: "og:description", content: "Keno VIP perks: boosted daily rewards, boosted rakeback and custom cosmetics." }] }),
  component: Page,
});

const PERKS = [
  { icon: Gift, t: "2× Daily Rewards", d: "Every daily claim is doubled." },
  { icon: Percent, t: "2× Rakeback", d: "0.6% back on every wager instead of 0.3%." },
  { icon: Sparkles, t: "Custom cosmetics", d: "Gold VIP tag in chat, on your profile and in live bets." },
  { icon: Rocket, t: "More to come", d: "New perks arrive with future updates." },
];

function VipIconHeader() {
  return <img src="/vip-club-icon.png" alt="VIP" className="size-7 object-contain" />;
}

function Page() {
  const { profile } = useApp();
  const vip = !!profile?.is_vip;
  return (
    <div className="animate-fade-up">
      <PageHeader icon={VipIconHeader} title="VIP Club" subtitle="VIP is awarded by the Keno team — it can't be bought." />
      <div className="relative h-56 overflow-hidden rounded-2xl border border-border shadow-card">
        <img src={promoVip} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-center p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your status</p>
          <p className={cn("font-display text-5xl tracking-wide", vip ? "text-gradient-gold" : "text-foreground")}>{vip ? "VIP Member" : "Not subscribed"}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{vip ? "All perks below are active on your account." : "Keep playing and being part of the community — admins hand out VIP."}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PERKS.map((p) => (
          <div key={p.t} className="panel p-5">
            <div className="mb-3 flex items-center justify-between"><p.icon className="size-7 text-gold" />{vip && <Check className="size-4 text-success" />}</div>
            <p className="font-bold">{p.t}</p><p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
