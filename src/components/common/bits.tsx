import { cn } from "@/lib/utils";
import { getRank } from "@/lib/ranks";
import { fmt, fmtCompact } from "@/lib/format";
import { getFontFamily, getGlowClass } from "@/lib/cosmetics";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <img src="/logo-keno.png" alt="Keno" className="size-8 object-contain" />
      {!compact && <span className="font-display text-2xl leading-none tracking-wider">KENO</span>}
    </div>
  );
}

const AVATAR_TONES = ["tone-orange", "tone-blue", "tone-violet", "tone-green", "tone-magenta", "tone-cyan", "tone-red", "tone-teal"];
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function UserAvatar({
  name,
  url,
  size = 32,
  className,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
  frame?: string | null;
}) {
  const style = { width: size, height: size, fontSize: size * 0.45 };
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none", className)}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt={name} style={style} className="size-full rounded-full object-cover" />
      ) : (
        <div
          style={style}
          className={cn("grid size-full place-items-center rounded-full font-bold text-foreground", AVATAR_TONES[hash(name || "?") % AVATAR_TONES.length])}
        >
          {(name || "?").charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

import { resolveFontFamily, resolveGlowClass, getLocalCosmetics } from "@/lib/cosmetics";

export function UserName({
  name,
  className,
  font,
  glow,
  userId,
  style,
}: {
  name: string;
  className?: string;
  font?: string | null;
  glow?: string | null;
  userId?: string | null;
  style?: React.CSSProperties;
}) {
  let f = font;
  let g = glow;
  if ((!f || f === "font-default") && (!g || g === "glow-default")) {
    const c = getLocalCosmetics(userId ?? null);
    if (!f || f === "font-default") f = c.equipped.font;
    if (!g || g === "glow-default") g = c.equipped.glow;
  }

  const fontFamily = resolveFontFamily(f);
  const glowClass = resolveGlowClass(g);

  return (
    <span
      className={cn("truncate font-medium transition-all inline-block", glowClass, className)}
      style={{ ...style, ...(fontFamily ? { fontFamily } : {}) }}
    >
      {name}
    </span>
  );
}

export function RankIcon({ wagered, size = 20, className }: { wagered: number | string | null | undefined; size?: number; className?: string }) {
  const r = getRank(wagered);
  return <img src={r.icon} alt={r.name} title={r.name} width={size} height={size} style={{ width: size, height: size }} className={cn("shrink-0 object-contain", className)} />;
}

export function RankTag({ wagered, className }: { wagered: number | string | null | undefined; className?: string }) {
  const r = getRank(wagered);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", className)} style={{ color: r.tone }}>
      <RankIcon wagered={wagered} size={14} />
      {r.name}
    </span>
  );
}

export function SnowCap({ className, withLights = true }: { className?: string; withLights?: boolean }) {
  return (
    <div className={cn("pointer-events-none absolute top-0 left-0 right-0 z-20 overflow-hidden leading-none select-none", className)}>
      <svg
        viewBox="0 0 100 16"
        preserveAspectRatio="none"
        className="h-3.5 w-full filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
      >
        <defs>
          <linearGradient id="snowBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="snowFrost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Shaded Frost Underlayer with Organic Soft Drips */}
        <path
          d="M0,0 L100,0 L100,3 C96,4 94,7 91,7 C88,7 86,3 83,3 C80,3 78,10 75,10 C72,10 70,4 67,4 C64,4 62,8 59,8 C56,8 54,3 51,3 C48,3 46,11 43,11 C40,11 38,4 35,4 C32,4 30,8 27,8 C24,8 22,3 19,3 C16,3 14,10 11,10 C8,10 6,4 3,4 C1,4 0,3 0,3 Z"
          fill="url(#snowFrost)"
        />

        {/* Fluffy Snow Pillows Draping Over the Top Edge */}
        <path
          d="M0,0 L100,0 L100,2.5 C97,3.5 95,6 92,6 C89,6 87,2.5 84,2.5 C81,2.5 79,8.5 76,8.5 C73,8.5 71,3 68,3 C65,3 63,6.5 60,6.5 C57,6.5 55,2.5 52,2.5 C49,2.5 47,9.5 44,9.5 C41,9.5 39,3 36,3 C33,3 31,6.5 28,6.5 C25,6.5 23,2.5 20,2.5 C17,2.5 15,8.5 12,8.5 C9,8.5 7,3 4,3 C2,3 0,2.5 0,2.5 Z"
          fill="url(#snowBase)"
        />

        {/* Sparkles */}
        <circle cx="20" cy="2.5" r="0.6" fill="#ffffff" />
        <circle cx="48" cy="3" r="0.6" fill="#ffffff" />
        <circle cx="74" cy="2.5" r="0.6" fill="#ffffff" />

        {/* Festive Christmas Bulbs along the snow edge */}
        {withLights && (
          <g>
            <circle cx="12" cy="5" r="1.1" fill="#ef4444" className="filter drop-shadow-[0_0_2px_#ef4444]" />
            <circle cx="28" cy="4.5" r="1.1" fill="#10b981" className="filter drop-shadow-[0_0_2px_#10b981]" />
            <circle cx="44" cy="6" r="1.1" fill="#eab308" className="filter drop-shadow-[0_0_2px_#eab308]" />
            <circle cx="60" cy="4.5" r="1.1" fill="#38bdf8" className="filter drop-shadow-[0_0_2px_#38bdf8]" />
            <circle cx="76" cy="5.5" r="1.1" fill="#ec4899" className="filter drop-shadow-[0_0_2px_#ec4899]" />
            <circle cx="92" cy="4.5" r="1.1" fill="#eab308" className="filter drop-shadow-[0_0_2px_#eab308]" />
          </g>
        )}
      </svg>
    </div>
  );
}

export function VipTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gradient-gold px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground shadow-sm">
      <img src="/vip-badge.png" alt="VIP" className="size-4 object-contain drop-shadow-sm" />
      VIP
    </span>
  );
}

export function Coin({ className }: { className?: string }) {
  return (
    <img
      src="/coin.png"
      alt="Coins"
      className={cn("inline-block size-4 shrink-0 object-contain drop-shadow-sm select-none", className)}
    />
  );
}

export function Amount({ value, compact, className, signed }: { value: number | string; compact?: boolean; className?: string; signed?: boolean }) {
  const v = Number(value);
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold tabular", className)}>
      <Coin />
      {signed && v > 0 ? "+" : ""}
      {compact ? fmtCompact(v) : fmt(v)}
    </span>
  );
}

export function SectionTitle({ icon: Icon, children, right }: { icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        {Icon && <Icon className="size-5 text-primary" />}
        {children}
      </h2>
      {right}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      {Icon && (
        <div className="grid size-12 place-items-center rounded-xl bg-surface-2 border border-border">
          <Icon className="size-6 text-primary" />
        </div>
      )}
      <div>
        <h1 className="font-display text-4xl leading-none tracking-wide">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export async function fileToAvatarDataUrl(file: File, size = 128): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d")!;
    const s = Math.min(img.width, img.height);
    g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
