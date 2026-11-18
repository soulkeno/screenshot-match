import { useState, useEffect } from "react";
import { Sliders, Zap, Keyboard, Eye, ShieldAlert, Sparkles, Volume2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export type AdvancedSettingsState = {
  turbo: boolean;
  hotkeys: boolean;
  trollMode: boolean;
  trollKey: string;
};

export function getAdvancedSettings(): AdvancedSettingsState {
  if (typeof window === "undefined") return { turbo: false, hotkeys: true, trollMode: false, trollKey: "x" };
  return {
    turbo: localStorage.getItem("keno:game:turbo") === "1",
    hotkeys: localStorage.getItem("keno:game:hotkeys") !== "0",
    trollMode: localStorage.getItem("keno:admin:troll") === "1",
    trollKey: (localStorage.getItem("keno:admin:troll_key") || "x").toLowerCase(),
  };
}

export function AdvancedGameSettingsButton({ slug }: { slug: string }) {
  const { isAdmin } = useApp();
  const [open, setOpen] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [hotkeys, setHotkeys] = useState(true);
  const [trollMode, setTrollMode] = useState(false);
  const [trollKey, setTrollKey] = useState("x");
  const [recordingKey, setRecordingKey] = useState(false);

  useEffect(() => {
    const s = getAdvancedSettings();
    setTurbo(s.turbo);
    setHotkeys(s.hotkeys);
    setTrollMode(s.trollMode);
    setTrollKey(s.trollKey);
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

  const updateTrollKey = (k: string) => {
    const clean = k.trim().toLowerCase() || "x";
    setTrollKey(clean);
    localStorage.setItem("keno:admin:troll_key", clean);
    window.dispatchEvent(new CustomEvent("keno:settings-change", { detail: { trollKey: clean } }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Discreet button with ZERO giveaways or red indicators */}
        <button
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          title="Advanced Game Settings"
        >
          <Sliders className="size-3.5" />
          <span>Advanced</span>
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
            <div className="rounded-xl border border-border/80 bg-surface-2/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="troll-mode" className="text-sm font-black flex items-center gap-1.5 text-foreground cursor-pointer">
                  <Eye className="size-4 text-primary" /> Stealth X-Ray Mode (Admin Only)
                </label>
                <Switch id="troll-mode" checked={trollMode} onCheckedChange={updateTrollMode} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When enabled, bombs are never permanently visible on your screen. You can tap or hold your secret keybind to momentarily flash-peek the bomb locations, memorize them, and release to keep your screen 100% normal on Discord / stream.
              </p>

              {/* Keybind configuration */}
              <div className="flex items-center justify-between rounded-lg bg-background/80 p-2 border border-border/60">
                <span className="text-xs font-bold text-foreground">Peek Keybind</span>
                <div className="flex items-center gap-2">
                  {recordingKey ? (
                    <button
                      autoFocus
                      onKeyDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateTrollKey(e.key);
                        setRecordingKey(false);
                      }}
                      onBlur={() => setRecordingKey(false)}
                      className="rounded-lg bg-primary/20 px-3 py-1 text-xs font-black text-primary border border-primary animate-pulse"
                    >
                      Press any key...
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRecordingKey(true)}
                      title="Click to change keybind"
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs font-mono font-bold text-foreground hover:border-primary/50"
                    >
                      <span>Key:</span>
                      <kbd className="rounded bg-muted px-1.5 py-0.5 uppercase text-primary font-black">
                        {trollKey}
                      </kbd>
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-black/30 p-2 text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                <Check className="size-3 text-success shrink-0" />
                <span>Private & safe: Only applies to your games. The UI will never reveal this mode to viewers.</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
