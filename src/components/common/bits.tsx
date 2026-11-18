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
    <div className={cn("pointer-events-none absolute -top-1 left-0 right-0 z-20 overflow-visible leading-none select-none", className)}>
      <svg
        viewBox="0 0 100 22"
        preserveAspectRatio="none"
        className="h-5 w-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
      >
        <defs>
          <linearGradient id="snowBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="snowFrost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Shaded Frost Underlayer with Icicle Drips */}
        <path
          d="M0,0 L100,0 L100,5 C96,6 94,11 92,11 C90,11 88,6 85,6 C82,6 80,16 77,16 C75,16 73,7 70,7 C67,7 65,13 63,13 C61,13 59,6 56,6 C53,6 50,19 47,19 C45,19 43,8 40,8 C37,8 35,14 33,14 C31,14 29,6 26,6 C23,6 21,17 18,17 C16,17 14,7 11,7 C8,7 6,13 4,13 C2,13 1,6 0,6 Z"
          fill="url(#snowFrost)"
        />

        {/* Fluffy Snow Pillows with Sculpted Organic Icicles */}
        <path
          d="M0,0 L100,0 L100,4 C97,5 95,9 93,9 C91,9 89,5 86,5 C83,5 81,14 78,14 C76,14 74,6 71,6 C68,6 66,11 64,11 C62,11 60,5 57,5 C54,5 51,17 48,17 C46,17 44,7 41,7 C38,7 36,12 34,12 C32,12 30,5 27,5 C24,5 22,15 19,15 C17,15 15,6 12,6 C9,6 7,11 5,11 C3,11 2,5 0,5 Z"
          fill="url(#snowBase)"
        />

        {/* Snow Sparkles on Drifts */}
        <circle cx="15" cy="4" r="0.8" fill="#ffffff" />
        <circle cx="37" cy="5" r="0.7" fill="#ffffff" />
        <circle cx="61" cy="4" r="0.8" fill="#ffffff" />
        <circle cx="83" cy="5" r="0.7" fill="#ffffff" />

        {/* Festive Christmas Bulbs along the snow edge */}
        {withLights && (
          <g>
            <circle cx="12" cy="7" r="1.2" fill="#ef4444" className="filter drop-shadow-[0_0_3px_#ef4444]" />
            <circle cx="27" cy="6" r="1.2" fill="#10b981" className="filter drop-shadow-[0_0_3px_#10b981]" />
            <circle cx="41" cy="8" r="1.2" fill="#eab308" className="filter drop-shadow-[0_0_3px_#eab308]" />
            <circle cx="57" cy="6" r="1.2" fill="#38bdf8" className="filter drop-shadow-[0_0_3px_#38bdf8]" />
            <circle cx="71" cy="7" r="1.2" fill="#ec4899" className="filter drop-shadow-[0_0_3px_#ec4899]" />
            <circle cx="86" cy="6" r="1.2" fill="#eab308" className="filter drop-shadow-[0_0_3px_#eab308]" />
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
