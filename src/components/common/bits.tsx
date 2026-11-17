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
  frame,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
  frame?: string | null;
}) {
  const hasFrame = !!frame;
  // When a frame is present, the inner circle pfp scales to ~82% so the frame's ring
  // cleanly borders it with 1-2px overlap, keeping the overall avatar compact and normal-sized.
  const pfpSize = hasFrame ? Math.round(size * 0.82) : size;
  const pfpStyle = { width: pfpSize, height: pfpSize, fontSize: pfpSize * 0.45 };

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* PFP (circular so it fits cleanly inside the frame ring) */}
      <div
        className={cn(
          "overflow-hidden rounded-full shrink-0 flex items-center justify-center",
          hasFrame ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0" : "size-full",
          className
        )}
        style={{ width: pfpSize, height: pfpSize }}
      >
        {url ? (
          <img
            src={url}
            alt={name}
            className="size-full object-cover rounded-full"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div
            style={pfpStyle}
            className={cn(
              "grid size-full place-items-center font-bold text-foreground rounded-full",
              AVATAR_TONES[hash(name || "?") % AVATAR_TONES.length]
            )}
          >
            {(name || "?").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Frame overlay - natural, proportional size with subtle overflow for decorations */}
      {frame && (
        <img
          src={frame}
          alt=""
          className="pointer-events-none absolute -inset-[8%] size-[116%] max-w-none object-contain z-10 select-none drop-shadow-sm"
        />
      )}
    </div>
  );
}

export function UserName({
  name,
  className,
  font,
  glow,
  style,
}: {
  name: string;
  className?: string;
  font?: string | null;
  glow?: string | null;
  style?: React.CSSProperties;
}) {
  const fontFamily = font && font !== "font-default" ? getFontFamily(font) : undefined;
  const glowClass = glow && glow !== "glow-default" ? getGlowClass(glow) : "";

  return (
    <span
      className={cn("truncate font-medium transition-all", glowClass, className)}
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

export function SnowCap({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute -top-0.5 left-0 right-0 z-10 overflow-hidden leading-none", className)}>
      <svg viewBox="0 0 100 16" preserveAspectRatio="none" className="h-4 w-full fill-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">
        <path d="M0,0 L100,0 L100,5 Q92,12 84,5 Q76,14 68,6 Q60,15 50,6 Q40,14 30,5 Q20,13 12,6 Q6,11 0,4 Z" />
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
