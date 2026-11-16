export function fmt(n: number | string | null | undefined, digits = 2): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function fmtInt(n: number | string | null | undefined): string {
  return Math.floor(Number(n ?? 0)).toLocaleString("en-US");
}
export function fmtCompact(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (a >= 1e4) return (v / 1e3).toFixed(1).replace(/\.?0+$/, "") + "K";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
export function fmtMult(n: number | string): string {
  return Number(n).toFixed(2) + "×";
}
export function errMsg(e: unknown): string {
  if (!e) return "Something went wrong";
  if (typeof e === "string") return e;
  const m = (e as { message?: string }).message ?? String(e);
  return m.replace(/^Error:\s*/, "");
}
export function timeLeft(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}:${String(sec).padStart(2, "0")}`;
  return `${sec}s`;
}
