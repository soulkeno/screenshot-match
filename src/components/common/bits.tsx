import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRank } from "@/lib/ranks";
import { fmt, fmtCompact } from "@/lib/format";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="grid size-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
        <Flame className="size-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      {!compact && <span className="font-display text-2xl leading-none tracking-wider">EMBER</span>}
    </div>
  );
}

const AVATAR_TONES = ["tone-orange", "tone-blue", "tone-violet", "tone-green", "tone-magenta", "tone-cyan", "tone-red", "tone-teal"];
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function UserAvatar({ name, url, size = 32, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.45 };
  if (url) return <img src={url} alt={name} style={style} className={cn("shrink-0 rounded-lg object-cover", className)} />;
  return (
    <div style={style} className={cn("grid shrink-0 place-items-center rounded-lg font-bold text-foreground", AVATAR_TONES[hash(name || "?") % AVATAR_TONES.length], className)}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
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

export function VipTag() {
  return <span className="rounded-md bg-gradient-gold px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">VIP</span>;
}

export function Coin({ className }: { className?: string }) {
  return (
    <span className={cn("inline-grid size-4 shrink-0 place-items-center rounded-full bg-gradient-gold shadow-press", className)}>
      <span className="size-1.5 rounded-full bg-primary-foreground/30" />
    </span>
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
