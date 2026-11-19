import { createFileRoute } from "@tanstack/react-router";
import { Crown, Sparkles, Check, Zap, Shield, Flame, Star } from "lucide-react";
import { PageHeader } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { CLUBS, getClubTier, type ClubTier } from "@/lib/clubs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clubs")({
  head: () => ({
    meta: [
      { title: "Clubs — Keno Casino" },
      { name: "description", content: "Keno Clubs: VIP, VIP+, MVP, MVP+, and Premium elite member clubs with up to 5.0x rewards." },
    ],
  }),
  component: ClubsPage,
});

export default function ClubsPage() {
  const { profile } = useApp();
  const currentTier = getClubTier(profile);
  const currentMeta = CLUBS[currentTier];

  const TIERS: ClubTier[] = ["vip", "vip_plus", "mvp", "mvp_plus", "premium"];

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        icon={() => <Crown className="size-7 text-gold" />}
        title="Keno Elite Clubs"
        subtitle="Exclusive member clubs unlocking up to 5.0× rewards, highest rakeback, and custom flairs."
      />

      {/* Hero Status Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-background p-6 md:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-10 -bottom-10 opacity-20 pointer-events-none">
          <Crown className="size-80 text-primary" />
        </div>

        <div className="relative z-10 max-w-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-black tracking-widest text-primary uppercase">
            <Sparkles className="size-4 text-gold" />
            <span>Your Active Club Membership</span>
          </div>

          <div className="flex items-center gap-3">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
              {currentMeta.name}
            </h2>
            <span className={cn("px-3 py-1 rounded-full text-xs font-black uppercase border shadow-md", currentMeta.bg, currentMeta.tone, currentMeta.border)}>
              {currentMeta.multiplier}× Multiplier
            </span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentTier === "none"
              ? "You are currently on Standard status. Obtain Club passes from the Lucky Wheel or receive grants directly from Keno Admins."
              : `You are enjoying the benefits of ${currentMeta.name} with ${currentMeta.multiplier}× boost active across daily rewards and rakeback!`}
          </p>
        </div>
      </div>

      {/* 5 Club Tiers Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-foreground flex items-center gap-2">
            <Flame className="size-5 text-gold" /> Club Tiers & Multipliers
          </h3>
          <span className="text-xs text-muted-foreground">Obtainable via Wheel Spins & Admin Grants</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {TIERS.map((tierKey) => {
            const meta = CLUBS[tierKey];
            const isCurrent = currentTier === tierKey;

            return (
              <div
                key={tierKey}
                className={cn(
                  "relative rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 backdrop-blur-md",
                  meta.bg,
                  meta.border,
                  isCurrent ? "ring-2 ring-gold shadow-glow" : "shadow-card"
                )}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-0.5 text-[10px] font-black uppercase text-black shadow-md flex items-center gap-1">
                    <Check className="size-3" /> ACTIVE CLUB
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-black px-2 py-0.5 rounded-md border", meta.tone, meta.border, "bg-black/40")}>
                      {meta.badge}
                    </span>
                    <span className="font-mono font-black text-lg text-gold">
                      {meta.multiplier.toFixed(1)}×
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-foreground">{meta.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{meta.desc}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Perks Included
                    </span>
                    <ul className="space-y-1.5 text-xs">
                      {meta.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-foreground/90 font-medium">
                          <Check className="size-3 text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-[11px]">{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/30 text-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {meta.multiplier}× Rewards Yield
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
