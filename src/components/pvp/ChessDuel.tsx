/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Timer, Bot, Flag, Loader2, Award, Swords } from "lucide-react";
import { Chess } from "chess.js";
import { GameLayout, BetInput, Segmented } from "@/components/games/GameLayout";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/common/bits";
import { LobbyRow, PlayerChip, usePvp, type PvpGame } from "./usePvp";
import { chessMoveFn, chessResignFn } from "@/lib/games.functions";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";

// Modern SVG piece paths
const PIECE_SYMBOLS: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

export default function ChessDuel() {
  const [bet, setBet] = useState("100");
  const [duration, setDuration] = useState(5);
  const { games, userId, busy, create, join, cancel, callBot } = usePvp("chess");
  const [watch, setWatch] = useState<string | null>(null);
  const { refresh } = useApp();

  const current = games.find((g) => g.id === watch) ?? null;

  return (
    <div className="space-y-6">
      <GameLayout slug="chess" controls={
        <div className="space-y-4">
          <BetInput value={bet} onChange={setBet} disabled={busy === "create"} label="Bet Amount" />

          <Segmented
            label="Game Clock"
            value={duration}
            onChange={(d) => setDuration(Number(d))}
            options={[
              { value: 5, label: "5 Min Blitz" },
              { value: 10, label: "10 Min Rapid" },
            ]}
          />

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs">
            <span className="text-muted-foreground font-bold">Winner Takes</span>
            <span className="font-mono font-black text-gold">
              +{fmt(Number(bet) * 2 * 0.95)}
            </span>
          </div>

          <Button
            variant="play"
            size="xl"
            className="w-full"
            disabled={busy === "create"}
            onClick={async () => {
              const r = await create({ wager: Number(bet), duration });
              if (r) {
                setWatch(r.id);
                void refresh();
              }
            }}
          >
            {busy === "create" ? <Loader2 className="animate-spin size-4" /> : <Crown className="size-4" />}
            Create Chess Duel
          </Button>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Real competitive chess 1v1 with timers. FIDE rules, legal checks, en passant, castling, and promotions. Winner takes the whole pot!
          </p>
        </div>
      }>
        <div className="flex h-full min-h-[560px] items-center justify-center p-2 md:p-6">
          {current ? (
            <ChessBoardView
              key={current.id}
              game={current}
              userId={userId}
              onClose={() => setWatch(null)}
              onCallBot={async () => {
                await callBot(current.id);
                void refresh();
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground py-16">
              <Crown className="size-16 opacity-30 text-primary" />
              <p className="text-sm font-bold text-foreground">No active chess match selected</p>
              <p className="text-xs max-w-sm">Create a new 5-minute or 10-minute chess lobby or challenge someone from the duels list below.</p>
            </div>
          )}
        </div>
      </GameLayout>

      {/* Lobby List */}
      <div className="space-y-3">
        <h2 className="text-lg font-black flex items-center gap-2">
          <Crown className="size-5 text-gold" /> Chess Duels
        </h2>
        {games.length === 0 && (
          <p className="panel p-6 text-center text-sm text-muted-foreground">
            No active chess duels right now. Create one and call a bot or wait for a challenger!
          </p>
        )}
        {games.map((g) => {
          const cfg = g.config as any;
          return (
            <LobbyRow
              key={g.id}
              g={g}
              me={userId}
              busy={busy}
              onJoin={async () => {
                const r = await join(g.id);
                if (r) setWatch(g.id);
              }}
              onCancel={() => void cancel(g.id)}
              onCallBot={async () => {
                const r = await callBot(g.id);
                if (r) {
                  setWatch(g.id);
                  void refresh();
                }
              }}
              onOpen={() => setWatch(g.id)}
            >
              <span className="text-xs font-bold text-muted-foreground">
                ⏱ {cfg?.duration ?? 5} min · Winner Takes All
              </span>
            </LobbyRow>
          );
        })}
      </div>
    </div>
  );
}

function ChessBoardView({
  game,
  userId,
  onClose,
  onCallBot,
}: {
  game: PvpGame;
  userId: string | null;
  onClose: () => void;
  onCallBot: () => void;
}) {
  const { refresh } = useApp();
  const st = (game.state || {}) as any;
  const cfg = (game.config || {}) as any;

  const moveFn = useServerFn(chessMoveFn);
  const resignFn = useServerFn(chessResignFn);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const isWhite = userId === st.whiteId;
  const isBlack = userId === st.blackId;
  const myTurn = (st.turn === "w" && isWhite) || (st.turn === "b" && isBlack);

  const fen = st.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const chess = useMemo(() => new Chess(fen), [fen]);

  // Valid target squares for the currently selected piece
  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare || !myTurn) return [];
    return chess.moves({ square: selectedSquare as any, verbose: true }).map((m) => m.to);
  }, [chess, selectedSquare, myTurn]);

  // Handle Square Click
  const handleSquareClick = async (sq: string) => {
    if (game.status !== "active" || !myTurn || moving) return;

    if (selectedSquare === sq) {
      setSelectedSquare(null);
      return;
    }

    // If already selected, try to move
    if (selectedSquare) {
      if (legalMovesForSelected.includes(sq)) {
        setMoving(true);
        sfx.card?.();
        try {
          await moveFn({
            data: { id: game.id, from: selectedSquare, to: sq, promotion: "q" },
          });
          setSelectedSquare(null);
          void refresh();
        } catch (err) {
          console.error(err);
        } finally {
          setMoving(false);
        }
        return;
      }
    }

    // Select piece if it belongs to current player
    const piece = chess.get(sq as any);
    if (piece && piece.color === (isWhite ? "w" : "b")) {
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
  };

  const handleResign = async () => {
    if (!confirm("Are you sure you want to resign this chess match?")) return;
    try {
      await resignFn({ data: { id: game.id } });
      void refresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Clocks
  const whiteSec = Math.max(0, Math.floor((st.timeWhiteMs ?? (cfg.duration || 5) * 60 * 1000) / 1000));
  const blackSec = Math.max(0, Math.floor((st.timeBlackMs ?? (cfg.duration || 5) * 60 * 1000) / 1000));
  const fmtClock = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Board layout
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = isBlack ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const displayFiles = isBlack ? [...files].reverse() : files;

  const pot = Number(game.wager) * 2 * 0.95;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl animate-fade-up">
      {/* Top Bar: Opponent Info & Pot */}
      <div className="flex items-center justify-between w-full bg-surface-2/80 rounded-2xl px-4 py-2.5 border border-border/60">
        <div className="flex items-center gap-2">
          <PlayerChip
            name={isBlack ? st.whiteName || game.creator_name : st.blackName || game.joiner_name}
            you={false}
          />
          {game.status === "active" && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-mono font-bold border",
                (isBlack ? st.turn === "w" : st.turn === "b")
                  ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse"
                  : "bg-surface border-border text-muted-foreground"
              )}
            >
              ⏱ {fmtClock(isBlack ? whiteSec : blackSec)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">POT</span>
            <span className="text-xs font-black text-gold font-mono">+{fmt(pot)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Waiting Lobby State */}
      {game.status === "open" && (
        <div className="w-full rounded-2xl border border-border/80 bg-surface/80 p-8 text-center space-y-4">
          <Crown className="size-12 mx-auto text-gold animate-bounce" />
          <h3 className="text-base font-black">Waiting for an opponent to join...</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            You've wagered {fmt(game.wager)} Coins on this {cfg.duration}m duel.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="play" size="lg" onClick={onCallBot} className="shadow-glow font-bold">
              <Bot className="size-4 mr-2" /> Call Bot Opponent
            </Button>
          </div>
        </div>
      )}

      {/* Chess Board */}
      {game.status !== "open" && (
        <div className="relative rounded-2xl p-3 bg-gradient-to-b from-[#2b213a] to-[#1a1426] shadow-2xl border border-primary/30">
          <div className="grid grid-cols-8 border-2 border-[#3d2b52] rounded-xl overflow-hidden shadow-inner w-[340px] h-[340px] sm:w-[440px] sm:h-[440px]">
            {ranks.map((rank) =>
              displayFiles.map((file) => {
                const sq = `${file}${rank}`;
                const piece = chess.get(sq as any);
                const isDark = (file.charCodeAt(0) + rank) % 2 === 0;
                const isSelected = selectedSquare === sq;
                const isTarget = legalMovesForSelected.includes(sq);
                const lastMove = st.moves?.[st.moves.length - 1];
                const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);

                return (
                  <button
                    key={sq}
                    type="button"
                    onClick={() => handleSquareClick(sq)}
                    disabled={!myTurn || moving}
                    className={cn(
                      "relative flex items-center justify-center font-bold text-2xl sm:text-3xl select-none transition-all",
                      isDark ? "bg-[#3e2e54]" : "bg-[#6c538a]",
                      isSelected && "ring-4 ring-gold bg-gold/30 z-10",
                      isLastMove && !isSelected && "bg-amber-400/20",
                      myTurn && "hover:brightness-110 cursor-pointer"
                    )}
                  >
                    {/* Legal move dot/ring */}
                    {isTarget && (
                      <span
                        className={cn(
                          "absolute rounded-full pointer-events-none z-10",
                          piece
                            ? "inset-1 border-4 border-emerald-400 bg-emerald-400/20 animate-pulse"
                            : "size-3 sm:size-3.5 bg-emerald-400/80 shadow-md"
                        )}
                      />
                    )}

                    {/* Piece Display */}
                    {piece && (
                      <span
                        className={cn(
                          "transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]",
                          piece.color === "w" ? "text-amber-100" : "text-slate-950 font-black",
                          isSelected && "scale-110"
                        )}
                      >
                        {PIECE_SYMBOLS[`${piece.color}${piece.type.toUpperCase()}`]}
                      </span>
                    )}

                    {/* Coordinates on edges */}
                    {file === (isBlack ? "h" : "a") && (
                      <span className="absolute left-1 top-0.5 text-[9px] font-bold text-white/40 pointer-events-none">
                        {rank}
                      </span>
                    )}
                    {rank === (isBlack ? 8 : 1) && (
                      <span className="absolute right-1 bottom-0.5 text-[9px] font-bold text-white/40 pointer-events-none">
                        {file}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Bottom Bar: Player Info & Clock */}
      {game.status !== "open" && (
        <div className="flex items-center justify-between w-full bg-surface-2/80 rounded-2xl px-4 py-2.5 border border-border/60">
          <div className="flex items-center gap-2">
            <PlayerChip
              name={isWhite ? st.whiteName || game.creator_name : st.blackName || game.joiner_name}
              you={true}
            />
            {game.status === "active" && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-mono font-bold border",
                  myTurn
                    ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse"
                    : "bg-surface border-border text-muted-foreground"
                )}
              >
                ⏱ {fmtClock(isWhite ? whiteSec : blackSec)}
              </span>
            )}
          </div>

          {game.status === "active" && (
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleResign} className="font-bold text-xs">
                <Flag className="size-3.5 mr-1" /> Resign
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Game Done Results */}
      {game.status === "done" && (
        <div className="w-full rounded-2xl border border-success/40 bg-success/10 p-4 text-center space-y-1 animate-pop-in">
          <p className="text-sm font-black text-success flex items-center justify-center gap-1.5">
            <Award className="size-4" />
            {st.isDraw
              ? "Game Drawn!"
              : game.winner_id === userId
              ? "Victory! You won the duel pot!"
              : "Defeat! Better luck next time."}
          </p>
          <p className="text-xs text-muted-foreground">{st.reason || "Game finished"}</p>
        </div>
      )}
    </div>
  );
}
