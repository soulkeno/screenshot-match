import { Gem } from "lucide-react";
import { RANK_LABEL, SUITS, type Card } from "@/lib/games/logic";
import { cn } from "@/lib/utils";

export function PlayingCard({ card, className, delay = 0, from, small }: { card: Card | null; className?: string; delay?: number; from?: { x: number; y: number }; small?: boolean }) {
  const style = { animationDelay: `${delay}ms`, ...(from ? { "--deal-x": `${from.x}px`, "--deal-y": `${from.y}px` } : {}) } as React.CSSProperties;
  const size = small ? "h-[84px] w-[60px]" : "h-[124px] w-[88px] md:h-[140px] md:w-[100px]";
  if (!card) {
    return (
      <div style={style} className={cn(size, "relative shrink-0 rounded-xl border-2 border-accent/30 bg-felt-deep shadow-card animate-deal", className)}>
        <div className="absolute inset-1.5 grid place-items-center rounded-lg border border-accent/20" style={{ backgroundImage: "repeating-linear-gradient(45deg, color-mix(in oklab, var(--accent) 8%, transparent) 0 6px, transparent 6px 12px)" }}>
          <Gem className="size-8 text-accent drop-shadow" />
        </div>
      </div>
    );
  }
  const red = card.suit === 1 || card.suit === 2;
  return (
    <div style={style} className={cn(size, "relative shrink-0 rounded-xl bg-playing-card shadow-card animate-deal", red ? "text-suit-red" : "text-suit-black", className)}>
      <div className="absolute left-2 top-1.5 flex flex-col items-center leading-none">
        <span className={cn("font-black", small ? "text-base" : "text-xl md:text-2xl")}>{RANK_LABEL[card.rank]}</span>
        <span className={small ? "text-sm" : "text-lg"}>{SUITS[card.suit]}</span>
      </div>
      <span className={cn("absolute bottom-2 right-2.5", small ? "text-3xl" : "text-5xl md:text-6xl")}>{SUITS[card.suit]}</span>
    </div>
  );
}
