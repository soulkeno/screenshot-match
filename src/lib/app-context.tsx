import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Wallet = Tables<"wallets">;

type Ctx = {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  wallet: Wallet | null;
  isAdmin: boolean;
  balance: number;
  hold: (bet: number) => void;
  release: (balance?: number) => void;
  setBalance: (b: number) => void;
  refresh: () => Promise<void>;
  favorites: Set<string>;
  toggleFavorite: (slug: string) => Promise<void>;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  profileCard: string | null;
  openProfile: (userId: string | null) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  cosmeticsOpen: boolean;
  setCosmeticsOpen: (v: boolean) => void;
  fairOpen: boolean;
  setFairOpen: (v: boolean) => void;
  wheelOpen: boolean;
  setWheelOpen: (v: boolean) => void;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [chatOpen, setChatOpenState] = useState(true);
  const [profileCard, setProfileCard] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cosmeticsOpen, setCosmeticsOpen] = useState(false);
  const [fairOpen, setFairOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [balance, setDisplayBalance] = useState(0);
  const holding = useRef(false);
  const latest = useRef(0);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const stored = localStorage.getItem("ember:chat");
    if (stored === "0" || window.innerWidth < 1280) setChatOpenState(false);
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        setSession(s);
        if (event !== "TOKEN_REFRESHED") setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const applyWallet = useCallback((w: Wallet) => {
    setWallet(w);
    latest.current = Number(w.balance);
    if (!holding.current) setDisplayBalance(Number(w.balance));
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [p, w, r, f] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("favorites").select("game").eq("user_id", userId),
    ]);
    if (p.data) setProfile(p.data);
    if (w.data) applyWallet(w.data);
    setIsAdmin(!!r.data?.some((x) => x.role === "admin"));
    setFavorites(new Set((f.data ?? []).map((x) => x.game)));
  }, [userId, applyWallet]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setWallet(null);
      setIsAdmin(false);
      return;
    }
    void refresh();
    const ch = supabase
      .channel(`me-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${userId}` }, (pl) => {
        if (pl.new && "balance" in pl.new) applyWallet(pl.new as Wallet);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, (pl) => {
        setProfile(pl.new as Profile);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId, refresh, applyWallet]);

  const hold = useCallback((bet: number) => {
    holding.current = true;
    setDisplayBalance((b) => Math.max(0, b - bet));
  }, []);
  const release = useCallback((b?: number) => {
    holding.current = false;
    if (typeof b === "number" && Number.isFinite(b)) latest.current = b;
    setDisplayBalance(latest.current);
  }, []);
  const setBalance = useCallback((b: number) => {
    latest.current = b;
    if (!holding.current) setDisplayBalance(b);
  }, []);

  const toggleFavorite = useCallback(
    async (slug: string) => {
      if (!userId) return;
      const has = favorites.has(slug);
      const next = new Set(favorites);
      if (has) next.delete(slug);
      else next.add(slug);
      setFavorites(next);
      if (has) await supabase.from("favorites").delete().eq("user_id", userId).eq("game", slug);
      else await supabase.from("favorites").insert({ user_id: userId, game: slug });
    },
    [favorites, userId],
  );

  const setChatOpen = useCallback((v: boolean) => {
    setChatOpenState(v);
    localStorage.setItem("ember:chat", v ? "1" : "0");
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready, session, userId, profile, wallet, isAdmin, balance, hold, release, setBalance, refresh, favorites, toggleFavorite,
      chatOpen, setChatOpen, profileCard, openProfile: setProfileCard, settingsOpen, setSettingsOpen, cosmeticsOpen, setCosmeticsOpen, fairOpen, setFairOpen, wheelOpen, setWheelOpen,
    }),
    [ready, session, userId, profile, wallet, isAdmin, balance, hold, release, setBalance, refresh, favorites, toggleFavorite, chatOpen, setChatOpen, profileCard, settingsOpen, cosmeticsOpen, fairOpen, wheelOpen],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
}
