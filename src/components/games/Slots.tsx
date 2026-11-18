import { useState, useRef, useEffect } from "react";
import { Maximize2, Minimize2, Play, RefreshCw, Volume2, Coins, Trophy, Flame, Sparkles } from "lucide-react";
import { GameLayout, BetInput, ResultToast } from "./GameLayout";
import { useBetAmount, useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { fmt, fmtCompact } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export default function Slots() {
  const { balance } = useApp();
  const [bet, setBet] = useBetAmount("slots", "250");
  const { play, busy } = useInstant("slots");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastWin, setLastWin] = useState<{ mult: number; payout: number } | null>(null);
  const [sessionWagered, setSessionWagered] = useState(0);
  const [sessionWon, setSessionWon] = useState(0);
  const [bestMult, setBestMult] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const handleWagerSpin = async () => {
    const wager = Number(bet);
    if (!wager || wager <= 0) return;
    const r = await play(wager, {});
    if (!r) return;

    setSessionWagered((w) => w + wager);
    const mult = r.result?.mult ?? (r.payout > 0 ? r.payout / wager : 0);
    const payout = r.payout;
    setSessionWon((w) => w + payout);
    if (mult > bestMult) setBestMult(mult);

    setLastWin({ mult, payout });
    if (mult >= 10) {
      sfx.bigWin();
    } else if (payout > 0) {
      sfx.win();
    } else {
      sfx.lose();
    }
    r.done();
  };

  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = "https://demo.bgaming-network.com/play/Aviamasters/FUN?server=demo";
    }
  };

  return (
    <GameLayout
      slug="slots"
      controls={
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Coins className="size-3.5" /> Keno Currency Mode
              </span>
              <span className="font-mono font-bold text-foreground">{fmt(balance)} Coins</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Every spin wagers real Keno Coins, levels up your VIP rank, advances daily quests, and credits your jackpot winnings directly to your wallet.
            </p>
          </div>

          <BetInput value={bet} onChange={setBet} disabled={busy} label="Wager amount (Keno Coins)" />

          {/* Quick Bet Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[100, 500, 1000, 5000].map((amt) => (
              <button
                key={amt}
                type="button"
                disabled={busy}
                onClick={() => setBet(String(amt))}
                className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs font-bold transition hover:bg-surface-3 hover:border-primary/50"
              >
                {fmtCompact(amt)}
              </button>
            ))}
          </div>

          <Button
            variant="play"
            size="xl"
            className="w-full text-base font-black shadow-glow uppercase tracking-wider"
            disabled={busy || Number(bet) <= 0 || Number(bet) > balance}
            onClick={handleWagerSpin}
          >
            {busy ? "Spinning..." : "Wager & Spin Aviamasters"}
          </Button>

          {/* Session Stats */}
          <div className="rounded-xl border border-border bg-background/60 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Trophy className="size-3 text-gold" /> Session Performance
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface-2 p-2">
                <p className="text-[10px] text-muted-foreground">Wagered</p>
                <p className="font-mono text-xs font-bold text-foreground">{fmtCompact(sessionWagered)}</p>
              </div>
              <div className="rounded-lg bg-surface-2 p-2">
                <p className="text-[10px] text-muted-foreground">Won</p>
                <p className="font-mono text-xs font-bold text-success">{fmtCompact(sessionWon)}</p>
              </div>
              <div className="rounded-lg bg-surface-2 p-2">
                <p className="text-[10px] text-muted-foreground">Best Mult</p>
                <p className="font-mono text-xs font-bold text-primary">{bestMult > 0 ? `${bestMult.toFixed(2)}×` : "—"}</p>
              </div>
            </div>
            {lastWin && (
              <div className={cn(
                "rounded-lg p-2 text-center text-xs font-bold transition-all animate-pop-in",
                lastWin.payout > 0 ? "bg-success/20 text-success border border-success/30" : "bg-muted text-muted-foreground"
              )}>
                {lastWin.payout > 0 ? (
                  <span>Won {fmt(lastWin.payout)} Coins ({lastWin.mult.toFixed(2)}×)!</span>
                ) : (
                  <span>Round ended (0×)</span>
                )}
              </div>
            )}
          </div>
        </div>
      }
    >
      {/* Aviamasters Demo Container Block matching the provided ACF/BGaming wrapper */}
      <div
        ref={containerRef}
        className="game-demo-block padding-section-medium align wp-block-acf-game-demo is-layout-flow wp-block-acf-game-demo-is-layout-flow relative w-full h-full min-h-[520px] lg:min-h-[640px] flex flex-col bg-black overflow-hidden select-none"
        id="demo"
      >
        <div className="container relative flex-1 flex flex-col w-full h-full" id="game-demo">
          <div className="game-demo-container relative flex-1 flex flex-col w-full h-full">
            {/* Background image requested by user */}
            <div
              className="game-demo-background absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
              style={{
                backgroundImage: "url('https://bgaming.com/wp-content/uploads/2025/07/tg_image_3398176289-1-1-420x228.webp')",
                opacity: isPlaying ? 0.15 : 1,
              }}
            />

            {/* Top Toolbar Overlay */}
            <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2 rounded-xl bg-background/80 px-3 py-1.5 backdrop-blur-md border border-border/60 shadow-lg">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-black tracking-wide uppercase text-foreground">Aviamasters BGaming</span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="font-mono text-xs font-bold text-gold flex items-center gap-1">
                  <Coins className="size-3" /> {fmt(balance)} Coins
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-background/80 p-1 backdrop-blur-md border border-border/60 shadow-lg">
                <button
                  type="button"
                  onClick={reloadIframe}
                  title="Reload Game"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition"
                >
                  <RefreshCw className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title="Toggle Fullscreen"
                  className="game-demo-fullscreen-btn rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition"
                >
                  {isFullscreen ? <Minimize2 className="size-4" /> : <span className="fullscreen-icon font-mono text-sm leading-none">⛶</span>}
                </button>
              </div>
            </div>

            {/* Game Demo Content / Iframe */}
            {!isPlaying ? (
              <div className="game-demo-content relative z-10 flex-1 flex items-center justify-center">
                <div className="game-demo-button-container text-center">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="game-demo-play-btn button group inline-flex items-center gap-3 rounded-2xl bg-gradient-primary px-8 py-4 text-lg font-black text-primary-foreground shadow-glow hover:scale-105 active:scale-95 transition-all"
                    data-iframe-src="https://demo.bgaming-network.com/play/Aviamasters/FUN?server=demo"
                  >
                    <span>PLAY DEMO</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="group-hover:translate-x-0.5 transition-transform">
                      <path d="M14.9415 8.27154L6.5962 3.54762C6.35765 3.40935 6.08599 3.33541 5.80882 3.33333C5.37312 3.33333 4.95527 3.50291 4.64718 3.80476C4.3391 4.10661 4.16602 4.51601 4.16602 4.94289V15.0812C4.16607 15.3645 4.24358 15.6426 4.39048 15.8866C4.53738 16.1306 4.74831 16.3316 5.00134 16.4686C5.25436 16.6057 5.54025 16.6739 5.82927 16.6661C6.1183 16.6582 6.3999 16.5747 6.64481 16.4241L14.9998 11.2526C15.2596 11.0933 15.4728 10.8708 15.6187 10.6067C15.7646 10.3427 15.8382 10.0461 15.8324 9.74587C15.8265 9.44566 15.7413 9.15206 15.5852 8.89368C15.4291 8.63531 15.2073 8.42096 14.9415 8.27154V8.27154Z" />
                    </svg>
                  </button>
                  <p className="mt-3 text-sm font-semibold text-white/80 drop-shadow">
                    Aviamasters with Keno Coins Integration
                  </p>
                </div>
              </div>
            ) : (
              <div className="game-demo-iframe-container active relative z-10 flex-1 w-full h-full flex flex-col pt-12 pb-0">
                <iframe
                  ref={iframeRef}
                  src="https://demo.bgaming-network.com/play/Aviamasters/FUN?server=demo"
                  frameBorder="0"
                  allowFullScreen
                  className="game-demo-iframe w-full flex-1 border-0"
                  loading="lazy"
                  title="Aviamasters BGaming"
                />
                <button
                  style={{ display: "none" }}
                  className="game-demo-close-btn"
                  title="Close Demo"
                  onClick={() => setIsPlaying(false)}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
