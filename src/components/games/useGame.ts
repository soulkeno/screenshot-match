/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { playInstantFn, sessionActionFn, sessionResumeFn, sessionStartFn } from "@/lib/games.functions";
import { useApp } from "@/lib/app-context";
import { errMsg } from "@/lib/format";

export function useBetAmount(slug: string, initial = "100") {
  const [v, setV] = useState(initial);
  useEffect(() => {
    const s = localStorage.getItem(`ember:bet:${slug}`);
    if (s) setV(s);
  }, [slug]);
  const set = useCallback((x: string) => { setV(x); localStorage.setItem(`ember:bet:${slug}`, x); }, [slug]);
  return [v, set] as const;
}

/** Instant games: debit + result in one call. Balance is held until the animation finishes. */
export function useInstant(game: string) {
  const fn = useServerFn(playInstantFn);
  const { hold, release } = useApp();
  const [busy, setBusy] = useState(false);
  const play = useCallback(
    async (wager: number, params: Record<string, any>) => {
      setBusy(true);
      hold(wager);
      try {
        const r = await fn({ data: { game, wager, params } });
        return { ...r, done: () => { release(r.balance); setBusy(false); } } as any;
      } catch (e) {
        release();
        setBusy(false);
        toast.error(errMsg(e));
        return null;
      }
    },
    [fn, game, hold, release],
  );
  return { play, busy, setBusy };
}

/** Stateful games (mines, towers, hilo, blackjack, snakes, crash). */
export function useSession(game: string) {
  const start = useServerFn(sessionStartFn);
  const act = useServerFn(sessionActionFn);
  const resume = useServerFn(sessionResumeFn);
  const { setBalance } = useApp();
  const [session, setSession] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    resume({ data: { game } }).then((r: any) => r?.session && setSession(r.session)).catch(() => {});
  }, [game, resume]);

  const apply = useCallback((r: any) => {
    if (r?.session) setSession(r.session);
    if (typeof r?.balance === "number") setBalance(r.balance);
    return r;
  }, [setBalance]);

  const begin = useCallback(async (wager: number, params: Record<string, any> = {}) => {
    setBusy(true);
    try { return apply(await start({ data: { game, wager, params } })); }
    catch (e) { toast.error(errMsg(e)); return null; }
    finally { setBusy(false); }
  }, [apply, game, start]);

  const action = useCallback(async (a: string, params: Record<string, any> = {}, quiet = false) => {
    setBusy(true);
    try { return apply(await act({ data: { game, action: a, params } })); }
    catch (e) { if (!quiet) toast.error(errMsg(e)); return null; }
    finally { setBusy(false); }
  }, [act, apply, game]);

  return { session, setSession, busy, begin, action, active: session?.status === "active" };
}
