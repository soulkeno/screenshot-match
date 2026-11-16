import { useEffect, useState } from "react";
import { Loader2, Check, X, Lock, User, Sparkles, ShieldCheck, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authEmail, USERNAME_RE } from "@/lib/auth-email";
import { Logo } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImg from "@/assets/promo-daily.jpg";
import { cn } from "@/lib/utils";

export function AuthScreen() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (localStorage.getItem("ember:has-account") === "1") setMode("login");
  }, []);

  useEffect(() => {
    setAvailable(null);
    if (mode !== "signup" || !USERNAME_RE.test(username)) return;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("username_available", { p_name: username });
      setAvailable(!!data);
    }, 350);
    return () => clearTimeout(t);
  }, [username, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!USERNAME_RE.test(username)) return setError("Usernames are 3-16 letters, numbers or _");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (mode === "signup" && password !== confirm) return setError("Passwords don't match");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (available === false) throw new Error("That username is taken");
        const { error } = await supabase.auth.signUp({ email: authEmail(username), password, options: { data: { username } } });
        if (error) throw new Error(/database error|already registered/i.test(error.message) ? "That username is taken" : error.message);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail(username), password });
        if (error) throw new Error("Wrong username or password");
      }
      localStorage.setItem("ember:has-account", "1");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div className="max-w-md animate-fade-up">
            <h1 className="font-display text-7xl leading-[0.9] tracking-wide">
              Play hot.<br />
              <span className="text-gradient-primary">Stay fair.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">20 original games, live chat, rains and a fully provably fair engine. Every account starts with 25,000 coins.</p>
            <div className="mt-8 grid gap-3">
              {[
                { i: Gift, t: "25,000 coins to start, daily rewards and rakeback" },
                { i: ShieldCheck, t: "Every result is provably fair and verifiable" },
                { i: Sparkles, t: "Climb 8 ranks from Starter to Grandmaster" },
              ].map(({ i: I, t }) => (
                <div key={t} className="flex items-center gap-3 text-sm">
                  <div className="grid size-8 place-items-center rounded-lg border border-border bg-surface-2"><I className="size-4 text-primary" /></div>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Coins have no real-world value. For entertainment only.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <div className="mb-6 grid grid-cols-2 rounded-xl border border-border bg-surface p-1">
            {(["signup", "login"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(null); }}
                className={cn("rounded-lg py-2 text-sm font-semibold transition-colors", mode === m ? "bg-surface-2 text-foreground shadow-card" : "text-muted-foreground hover:text-foreground")}>
                {m === "signup" ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>
          <h2 className="text-2xl font-bold">{mode === "signup" ? "Claim your seat" : "Welcome back"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "signup" ? "Pick a username. It's yours alone." : "Sign in with your username and password."}</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} placeholder="Username" maxLength={16} className="h-11 pl-9 pr-9 bg-surface" autoComplete="username" />
              {mode === "signup" && USERNAME_RE.test(username) && available !== null && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {available ? <Check className="size-4 text-success" /> : <X className="size-4 text-destructive" />}
                </span>
              )}
            </div>
            {mode === "signup" && available === false && <p className="text-xs text-destructive">That username is taken</p>}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-11 pl-9 bg-surface" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            {mode === "signup" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" className="h-11 pl-9 bg-surface" autoComplete="new-password" />
              </div>
            )}
            {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="play" size="xl" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">No email needed. Keep your password safe, it can't be recovered.</p>
        </div>
      </div>
    </div>
  );
}

export function BanScreen({ until, reason, onSignOut }: { until: string; reason: string | null; onSignOut: () => void }) {
  const d = new Date(until);
  const perm = d.getFullYear() >= 9000;
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="panel w-full max-w-md p-8 text-center animate-pop-in">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-destructive/15"><Lock className="size-7 text-destructive" /></div>
        <h1 className="font-display text-4xl tracking-wide">Account suspended</h1>
        <p className="mt-2 text-muted-foreground">{perm ? "This ban is permanent." : `Your ban ends ${d.toLocaleString()}.`}</p>
        {reason && <p className="mt-4 rounded-lg border border-border bg-surface-2 p-3 text-sm">“{reason}”</p>}
        <Button variant="surface" className="mt-6" onClick={onSignOut}>Sign out</Button>
      </div>
    </div>
  );
}
