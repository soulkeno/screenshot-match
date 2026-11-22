import { useEffect, useState, type CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Sparkles, Check, Zap, Flame, Star, Gem, Disc3, ShieldCheck, ArrowRight, Lock, type LucideIcon } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { CLUBS, getClubTier, type ClubTier } from "@/lib/clubs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clubs")({
  head: () => ({
    meta: [
      { title: "Elite Clubs — Keno Casino" },
      { name: "description", content: "Keno Elite Clubs: VIP, VIP+, MVP, MVP+ and Premium. Boost your daily rewards and rakeback up to 5.0×." },
      { property: "og:title", content: "Elite Clubs — Keno Casino" },
      { property: "og:description", content: "Five member clubs boosting daily rewards and rakeback up to 5.0×." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClubsPage,
});

const TIERS: ClubTier[] = ["vip", "vip_plus", "mvp", "mvp_plus", "premium"];

const LOOK: Record<ClubTier, { color: string; icon: LucideIcon; tagline: string }> = {
  none: { color: "var(--muted-foreground)", icon: ShieldCheck, tagline: "Standard player" },
  vip: { color: "var(--club-vip)", icon: Star, tagline: "The golden entry" },
  vip_plus: { color: "var(--club-vip-plus)", icon: Flame, tagline: "Turning up the heat" },
  mvp: { color: "var(--club-mvp)", icon: Zap, tagline: "Neon elite" },
  mvp_plus: { color: "var(--club-mvp-plus)", icon: Gem, tagline: "Amethyst high roller" },
  premium: { color: "var(--club-premium)", icon: Crown, tagline: "Royal status" },
};

function useClubTier() {
  const { profile } = useApp();
  const [tier, setTier] = useState<ClubTier>("none");
  useEffect(() => {
    const read = () => setTier(getClubTier(profile));
    read();
    window.addEventListener("keno:club-change", read);
    return () => window.removeEventListener("keno:club-change", read);
  }, [profile]);
  return tier;
}

function Emblem({ tier, size = 120, spin = false }: { tier: ClubTier; size?: number; spin?: boolean }) {
  const { color, icon: Icon } = LOOK[tier];
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size, "--c": color } as CSSProperties}>
      {spin && (
        <div
          className="absolute -inset-6 rounded-full opacity-70 blur-xl animate-[spin_9s_linear_infinite]"
          style={{ background: "conic-gradient(from 0deg, var(--c), transparent 30%, var(--c) 55%, transparent 80%, var(--c))" }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
          background: "linear-gradient(160deg, var(--c), color-mix(in oklab, var(--c) 25%, var(--background)))",
        }}
      />
      <div
        className="absolute inset-[6%]"
        style={{
          clipPath: "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
          background: "radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--c) 35%, var(--card)), var(--background) 80%)",
        }}
      />
      <Icon className="relative" style={{ width: size * 0.4, height: size * 0.4, color: "var(--c)", filter: "drop-shadow(0 0 10px var(--c))" }} />
    </div>
  );
}

export default function ClubsPage() {
  const tier = useClubTier();
  const meta = CLUBS[tier];
  const look = LOOK[tier];
  const level = TIERS.indexOf(tier); // -1 for none
  const next = TIERS[level + 1] ?? null;

  return (
    <div className="space-y-10 pb-16 animate-fade-up">
      {/* ───── Hero ───── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-background to-background p-6 shadow-[var(--shadow-card)] md:p-10"
        style={{ "--c": look.color } as CSSProperties}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full opacity-30 blur-[110px]" style={{ background: "var(--c)" }} />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-club-mvp-plus/20 blur-[110px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "repeating-linear-gradient(115deg, var(--foreground) 0 1px, transparent 1px 22px)" }}
        />

        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5 text-gold" /> Keno Elite Clubs
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your membership</p>
              <h1 className="mt-1 font-display text-5xl font-black tracking-tight md:text-7xl" style={{ color: "var(--c)", textShadow: "0 0 40px color-mix(in oklab, var(--c) 45%, transparent)" }}>
                {meta.name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-foreground/70">{look.tagline}</p>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="font-mono text-5xl font-black text-foreground">
                  {meta.multiplier.toFixed(1)}
                  <span className="text-3xl" style={{ color: "var(--c)" }}>×</span>
                </p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Rewards & rakeback boost</p>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                {tier === "none"
                  ? "You're on Standard status. Win a Club pass from the Lucky Wheel or get one granted by a Keno admin to start boosting."
                  : `Your ${meta.multiplier}× boost is live on daily rewards and rakeback.`}
              </p>
            </div>

            {/* ladder */}
            <div className="max-w-lg">
              <div className="flex items-center">
                {TIERS.map((t, i) => {
                  const reached = i <= level;
                  return (
                    <div key={t} className="flex flex-1 items-center last:flex-none">
                      <div
                        className={cn("grid size-8 place-items-center rounded-full border-2 text-[10px] font-black transition", !reached && "border-border bg-secondary text-muted-foreground")}
                        style={reached ? { borderColor: LOOK[t].color, background: `color-mix(in oklab, ${LOOK[t].color} 25%, var(--background))`, color: LOOK[t].color, boxShadow: `0 0 14px -2px ${LOOK[t].color}` } : undefined}
                        title={CLUBS[t].name}
                      >
                        {reached ? <Check className="size-3.5" /> : i + 1}
                      </div>
                      {i < TIERS.length - 1 && (
                        <div className="mx-1 h-1 flex-1 rounded-full bg-secondary">
                          <div className="h-full rounded-full transition-all" style={{ width: i < level ? "100%" : "0%", background: `linear-gradient(90deg, ${LOOK[t].color}, ${LOOK[TIERS[i + 1]].color})` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {TIERS.map((t) => (
                  <span key={t}>{CLUBS[t].badge}</span>
                ))}
              </div>
              {next && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Next up: <span className="font-bold" style={{ color: LOOK[next].color }}>{CLUBS[next].name}</span> · {CLUBS[next].multiplier.toFixed(1)}× boost
                </p>
              )}
            </div>
          </div>

          <div className="mx-auto md:mx-0 md:pr-6">
            <div className="animate-float">
              <Emblem tier={tier} size={190} spin />
            </div>
          </div>
        </div>
      </section>

      {/* ───── Tier cards ───── */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-foreground">
              <Flame className="size-6 text-gold" /> Pick your club
            </h2>
            <p className="text-sm text-muted-foreground">Every tier stacks a bigger boost on top of your rank perks.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((t, i) => {
            const m = CLUBS[t];
            const L = LOOK[t];
            const active = tier === t;
            const owned = i <= level;
            const top = t === "premium";
            return (
              <div
                key={t}
                className={cn("group relative rounded-3xl p-[1.5px] transition duration-300 hover:-translate-y-2", top && "lg:-mt-4")}
                style={{
                  "--c": L.color,
                  background: top
                    ? "conic-gradient(from 180deg, var(--club-vip), var(--club-vip-plus), var(--club-mvp-plus), var(--club-mvp), var(--club-premium), var(--club-vip))"
                    : "linear-gradient(180deg, color-mix(in oklab, var(--c) 70%, transparent), var(--border) 60%)",
                  boxShadow: active ? "0 0 40px -6px var(--c)" : undefined,
                } as CSSProperties}
              >
                <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-card">
                  {/* top glow + shine sweep */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40" style={{ background: "radial-gradient(ellipse at 50% 0%, var(--c), transparent 70%)" }} />
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                  {(active || top) && (
                    <span
                      className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-background"
                      style={{ background: "var(--c)" }}
                    >
                      {active ? <><Check className="size-3" /> Active</> : <><Crown className="size-3" /> Top tier</>}
                    </span>
                  )}

                  <div className="relative flex flex-col items-center px-5 pt-7 text-center">
                    <div className="transition duration-500 group-hover:scale-110 group-hover:rotate-3">
                      <Emblem tier={t} size={84} />
                    </div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: "var(--c)" }}>
                      {m.badge}
                    </p>
                    <h3 className="text-lg font-black text-foreground">{m.name}</h3>
                    <p className="text-xs text-muted-foreground">{L.tagline}</p>
                    <p className="mt-3 font-mono text-4xl font-black text-foreground">
                      {m.multiplier.toFixed(1)}
                      <span style={{ color: "var(--c)" }}>×</span>
                    </p>
                  </div>

                  <ul className="relative mt-4 flex-1 space-y-2 border-t border-border px-5 py-4 text-xs">
                    {m.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 font-medium text-foreground/90">
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full" style={{ background: "color-mix(in oklab, var(--c) 22%, transparent)" }}>
                          <Check className="size-2.5" style={{ color: "var(--c)" }} />
                        </span>
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <div className="relative px-5 pb-5">
                    <div
                      className={cn("flex items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-black uppercase tracking-wider", !owned && "bg-secondary text-muted-foreground")}
                      style={owned ? { background: "color-mix(in oklab, var(--c) 18%, transparent)", color: "var(--c)" } : undefined}
                    >
                      {owned ? <><Check className="size-3.5" /> {active ? "Your club" : "Unlocked"}</> : <><Lock className="size-3.5" /> Locked</>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───── How to join ───── */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/rewards"
          className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition hover:border-gold/50"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-gold/20 blur-3xl" />
          <Disc3 className="size-9 text-gold transition duration-700 group-hover:rotate-180" />
          <h3 className="mt-3 text-lg font-black text-foreground">Spin the Lucky Wheel</h3>
          <p className="mt-1 text-sm text-muted-foreground">Club passes hide in the rare slices of the daily wheel. Higher ranks get better wheels.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-gold">
            Go spin <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-club-mvp/20 blur-3xl" />
          <ShieldCheck className="size-9 text-club-mvp" />
          <h3 className="mt-3 text-lg font-black text-foreground">Admin grants</h3>
          <p className="mt-1 text-sm text-muted-foreground">Keno admins hand out club memberships to standout players, event winners and community legends.</p>
        </div>
      </section>
    </div>
  );
}
