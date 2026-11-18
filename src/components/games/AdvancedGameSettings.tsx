import { useState, useEffect } from "react";
import { Sliders, Zap, Keyboard, Eye, ShieldAlert, Sparkles, Volume2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export type AdvancedSettingsState = {
  turbo: boolean;
  hotkeys: boolean;
  trollMode: boolean;
};

export function getAdvancedSettings(): AdvancedSettingsState {
  if (typeof window === "undefined") return { turbo: false, hotkeys: true, trollMode: false };
  return {
    turbo: localStorage.getItem("keno:game:turbo") === "1",
    hotkeys: localStorage.getItem("keno:game:hotkeys") !== "0",
    trollMode: localStorage.getItem("keno:admin:troll") === "1",
  };
}

export function AdvancedGameSettingsButton({ slug }: { slug: string }) {
  const { isAdmin } = useApp();
  const [open, setOpen] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [hotkeys, setHotkeys] = useState(true);
  const [trollMode, setTrollMode] = useState(false);

  useEffect(() => {
    const s = getAdvancedSettings();
    setTurbo(s.turbo);
    setHotkeys(s.hotkeys);
    setTrollMode(s.trollMode);
  }, [open]);

  const updateTurbo = (v: boolean) => {
    setTurbo(v);
    localStorage.setItem("keno:game:turbo", v ? "1" : "0");
    window.dispatchEvent(new CustomEvent("keno:settings-change", { detail: { turbo: v } }));
  };

  const updateHotkeys = (v: boolean) => {
    setHotkeys(v);
    localStorage.setItem("keno:game:hotkeys", v ? "1" : "0");
    window.dispatchEvent(new CustomEvent("keno:settings-change", { detail: { hotkeys: v } }));
  };

  const updateTrollMode = (v: boolean) => {
    setTrollMode(v);
    localStorage.setItem("keno:admin:troll", v ? "1" : "0");
    window.dispatchEvent(new CustomEvent("keno:settings-change", { detail: { trollMode: v } }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition hover:bg-surface-2",
            trollMode && isAdmin
              ? "border-destructive/60 bg-destructive/15 text-destructive animate-pulse"
              : "border-border bg-surface text-muted-foreground hover:text-foreground"
          )}
          title="Advanced Game Settings"
        >
          <Sliders className="size-3.5" />
          <span>Advanced</span>
          {trollMode && isAdmin && <span className="text-[10px] uppercase font-black tracking-widest text-destructive">Troll</span>}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md border-border bg-popover/95 backdrop-blur-xl p-5 shadow-2xl rounded-2xl animate-fade-up">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <Sliders className="size-4 text-primary" /> Advanced Game Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Turbo Play Mode */}
          <div className="flex items-center justify-between rounded-xl bg-surface-2/60 p-3">
            <div className="space-y-0.5 pr-4">
              <label htmlFor="turbo-mode" className="text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                <Zap className="size-3.5 text-gold" /> Turbo / Instant Play
              </label>
              <p className="text-xs text-muted-foreground">
                Skips reveal animations so tiles, cards, and multipliers resolve with near zero latency.
              </p>
            </div>
            <Switch id="turbo-mode" checked={turbo} onCheckedChange={updateTurbo} />
          </div>

          {/* Keyboard Hotkeys */}
          <div className="flex items-center justify-between rounded-xl bg-surface-2/60 p-3">
            <div className="space-y-0.5 pr-4">
              <label htmlFor="hotkeys-mode" className="text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                <Keyboard className="size-3.5 text-primary" /> Keyboard Hotkeys
              </label>
              <p className="text-xs text-muted-foreground">
                Use <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">Space</kbd> to Bet, <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">C</kbd> to Cash out, <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">A</kbd>/<kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">S</kbd> to halve or double.
              </p>
            </div>
            <Switch id="hotkeys-mode" checked={hotkeys} onCheckedChange={updateHotkeys} />
          </div>

          {/* Admin Troll / X-Ray Mode */}
          {isAdmin && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="troll-mode" className="text-sm font-black flex items-center gap-1.5 text-destructive cursor-pointer">
                  <ShieldAlert className="size-4" /> Troll / X-Ray Mode (Admin Only)
                </label>
                <Switch id="troll-mode" checked={trollMode} onCheckedChange={updateTrollMode} />
              </div>
              <p className="text-xs text-destructive/85 leading-relaxed">
                Reveals the secret bomb locations in Mines and dangerous trap tiles in Towers so you can troll and impress friends on stream or screen-share.
              </p>
              <div className="rounded-lg bg-black/30 p-2 text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                <Check className="size-3 text-success shrink-0" />
                <span>Verified: Rigged preview strictly activates for YOUR games only. Other players games are never affected.</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
