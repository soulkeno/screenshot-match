import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CloudRain, Send, Smile, X, ArrowDown, Users, Timer, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useApp } from "@/lib/app-context";
import { Amount, RankIcon, UserAvatar, UserName, VipTag } from "@/components/common/bits";
import { getRank } from "@/lib/ranks";
import { errMsg, fmt, timeLeft } from "@/lib/format";
import { useEquippedStyles } from "@/lib/cosmetics";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = Tables<"chat_messages">;
type Rain = Tables<"rains">;
const MAX = 120;
const EMOJIS = "😀 😂 🤣 😍 😎 🤑 😭 😡 🤯 🥶 🥵 😈 💀 👀 🙏 👏 🔥 💎 💰 🪙 🚀 📈 📉 💥 ⚡ ✨ 🍀 🎰 🎲 🃏 👑 🏆 🎁 🌧️ ❤️ 💯 🤝 🫡 😤 🥲".split(" ");

const avatarCache = new Map<string, string | null>();

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const { userId, openProfile, profile, refresh } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(1);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const [, force] = useState(0);
  const [rainOpen, setRainOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const loadAvatars = useCallback(async (ids: string[]) => {
    const missing = Array.from(new Set(ids)).filter((id) => id && !avatarCache.has(id));
    if (!missing.length) return;
    missing.forEach((id) => avatarCache.set(id, null));
    const { data } = await supabase.from("profiles").select("id, avatar_url").in("id", missing);
    data?.forEach((p) => avatarCache.set(p.id, p.avatar_url));
    force((x) => x + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(60).then(({ data }) => {
      if (!alive || !data) return;
      const list = data.reverse();
      setMsgs(list);
      void loadAvatars(list.map((m) => m.user_id!).filter(Boolean));
    });
    const ch = supabase
      .channel(`chat-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (pl) => {
        const m = pl.new as Msg;
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m].slice(-MAX)));
        if (m.user_id) void loadAvatars([m.user_id]);
        if (!atBottomRef.current) setUnseen((u) => u + 1);
      })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [loadAvatars]);

  // presence: online count (one shared channel, however many chat panels are mounted)
  useEffect(() => {
    if (!userId) return;
    return subscribeOnline(userId, setOnline);
  }, [userId]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  function onScroll() {
    const el = listRef.current!;
    const b = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    atBottomRef.current = b;
    setAtBottom(b);
    if (b) setUnseen(0);
  }
  function toBottom() {
    const el = listRef.current!;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUnseen(0);
  }

  async function send() {
    const content = text.trim();
    if (!content || sending || !userId) return;

    // Check for tipping command: /tip @username amount
    if (content.toLowerCase().startsWith("/tip")) {
      const match = content.match(/^\/tip\s+@?([a-zA-Z0-9_\-.]+)\s+([0-9]+(\.[0-9]+)?)$/i);
      if (!match) {
        toast.error("Usage: /tip @username <amount>");
        return;
      }
      const targetUsername = match[1];
      const amount = Number(match[2]);
      if (!Number.isFinite(amount) || amount < 10) {
        toast.error("Minimum tip is 10 coins");
        return;
      }

      setSending(true);
      const { error } = await supabase.rpc("send_tip", {
        p_username: targetUsername,
        p_amount: amount,
      });
      setSending(false);

      if (error) {
        toast.error(errMsg(error));
        return;
      }

      toast.success(`Successfully tipped ${fmt(amount)} coins to @${targetUsername}! 🪙`);
      setText("");
      atBottomRef.current = true;
      void refresh();
      return;
    }

    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({ user_id: userId, content });
    setSending(false);
    if (error) return toast.error(errMsg(error));
    setText("");
    atBottomRef.current = true;
  }

  return (
    <aside className="flex h-full w-full flex-col border-l border-border bg-sidebar">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold">Chat</h3>
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success animate-pulse-ring" />{online} online
          </span>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground" aria-label="Hide chat"><X className="size-4" /></button>
      </div>

      <RainCard />

      <div className="relative min-h-0 flex-1">
        <div ref={listRef} onScroll={onScroll} className="h-full space-y-1.5 overflow-y-auto px-3 py-3">
          {msgs.length === 0 && <p className="mt-10 text-center text-sm text-muted-foreground">No messages yet. Say hi 👋</p>}
          {msgs.map((m) => <ChatLine key={m.id} m={m} avatar={m.user_id ? avatarCache.get(m.user_id) ?? null : null} mine={m.user_id === userId} onUser={() => m.user_id && openProfile(m.user_id)} />)}
        </div>
        {!atBottom && (
          <button onClick={toBottom} className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow animate-pop-in">
            <ArrowDown className="size-3.5" />{unseen > 0 ? `${unseen} new` : "Latest"}
          </button>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 focus-within:border-primary/50">
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={profile?.banned_until ? "You can't chat right now" : "Send a message..."} className="h-11 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground" />
          <Popover>
            <PopoverTrigger asChild>
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-primary" aria-label="Emojis and rain"><Smile className="size-4" /></button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-72 border-border bg-popover p-3">
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => setText((t) => (t + e).slice(0, 200))} className="rounded-md p-1 text-lg transition hover:scale-110 hover:bg-surface-2">{e}</button>
                ))}
              </div>
              <Button variant="surface" className="mt-3 w-full" onClick={() => setRainOpen(true)}><CloudRain /> Start a rain</Button>
            </PopoverContent>
          </Popover>
          <button onClick={send} disabled={!text.trim() || sending} className="rounded-md p-1.5 text-primary transition hover:bg-surface-2 disabled:opacity-40" aria-label="Send">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
        <div className="mt-1.5 flex justify-between px-1 text-[11px] text-muted-foreground">
          <span>Be kind. No spam.</span><span className="tabular">{text.length}/200</span>
        </div>
      </div>
      <StartRainDialog open={rainOpen} onOpenChange={setRainOpen} />
    </aside>
  );
}

function ChatLine({ m, avatar, mine, onUser }: { m: Msg; avatar: string | null; mine: boolean; onUser: () => void }) {
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const equipped = useEquippedStyles(m.user_id ?? null);
  if (m.kind !== "user") {
    if (m.kind === "tip") {
      return (
        <div className="flex items-center gap-2.5 rounded-xl border border-gold/40 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent px-3 py-2 text-xs font-semibold text-gold shadow-sm animate-fade-up">
          <div className="grid size-6 place-items-center rounded-full bg-gold/20 text-gold shrink-0">
            <Coins className="size-3.5" />
          </div>
          <span className="font-bold text-foreground/95 flex-1">{m.content}</span>
          <span className="text-[10px] text-muted-foreground tabular">{time}</span>
        </div>
      );
    }
    return (
      <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-xs animate-fade-up", m.kind === "rain" ? "border-accent/30 bg-accent/10 text-accent" : "border-border bg-surface-2 text-muted-foreground")}>
        <CloudRain className="mt-0.5 size-3.5 shrink-0" /><span className="font-medium">{m.content}</span>
      </div>
    );
  }
  const rank = getRank(m.user_wagered);
  return (
    <div className={cn("group flex gap-2.5 rounded-xl px-2.5 py-2 animate-fade-up", mine ? "bg-primary/8" : "hover:bg-surface/70")}>
      <button onClick={onUser} className="relative shrink-0">
        <UserAvatar name={m.username} url={avatar} size={32} />
        <RankIcon wagered={m.user_wagered} size={16} className="absolute -bottom-1 -right-1" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <button onClick={onUser} className="truncate text-[13px] font-bold hover:underline" style={{ color: rank.tone }}>
            <UserName name={m.username} font={equipped.fontFamily} glow={equipped.glowClass} />
          </button>
          {m.is_vip && <VipTag />}
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground tabular">{time}</span>
        </div>
        <p className="break-words text-[13px] leading-snug text-foreground/90">{m.content}</p>
      </div>
    </div>
  );
}

function RainCard() {
  const { userId } = useApp();
  const [rain, setRain] = useState<Rain | null>(null);
  const [joined, setJoined] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("rains").select("*").eq("settled", false).order("created_at").limit(1).maybeSingle();
    setRain(data ?? null);
    if (data && userId) {
      const { data: e } = await supabase.from("rain_entries").select("rain_id").eq("rain_id", data.id).eq("user_id", userId).maybeSingle();
      setJoined(!!e);
    }
  }, [userId]);

  useEffect(() => {
    void supabase.rpc("settle_rains").then(() => load());
    const ch = supabase.channel(`rains-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rains" }, () => void load())
      .subscribe();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { void supabase.removeChannel(ch); clearInterval(t); };
  }, [load]);

  const left = rain ? new Date(rain.ends_at).getTime() - now : 0;
  useEffect(() => {
    if (rain && left <= 0) {
      const t = setTimeout(() => void supabase.rpc("settle_rains").then(() => load()), 800);
      return () => clearTimeout(t);
    }
  }, [rain, left <= 0, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rain || left <= -5000) return null;
  const isHost = rain.host_id === userId;

  async function join() {
    setBusy(true);
    const { error } = await supabase.rpc("join_rain", { p_rain: rain!.id });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    setJoined(true);
    toast.success("You joined the rain!");
  }

  return (
    <div className="mx-3 mt-3 overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent/15 to-surface p-3 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-accent/20"><CloudRain className="size-5 text-accent" /></div>
        <div className="min-w-0 flex-1">
          <Amount value={rain.amount} compact className="text-lg" />
          <p className="truncate text-[11px] text-muted-foreground">Rain by {rain.host_username}</p>
        </div>
        <Button size="sm" variant="accent" disabled={joined || isHost || busy || left <= 0} onClick={join}>
          {busy ? <Loader2 className="animate-spin" /> : joined ? "Joined" : isHost ? "Hosting" : "Join"}
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Timer className="size-3" />{left > 0 ? `${timeLeft(left)} until it ends` : "Splitting..."}</span>
        <span className="flex items-center gap-1"><Users className="size-3" />{rain.participants} joined</span>
      </div>
    </div>
  );
}

function StartRainDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { balance } = useApp();
  const [amount, setAmount] = useState("10000");
  const [busy, setBusy] = useState(false);
  async function start() {
    const a = Number(amount);
    setBusy(true);
    const { error } = await supabase.rpc("start_rain", { p_amount: a });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Rain started! 🌧️");
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CloudRain className="size-5 text-accent" /> Start a rain</DialogTitle>
          <DialogDescription>Your coins are split evenly between everyone who joins in the next 15 minutes. If a rain is already running, your coins are added to its pot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input type="number" min={1000} value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 bg-surface" />
          <div className="flex gap-2">
            {[1000, 10000, 50000, 100000].map((v) => (
              <button key={v} onClick={() => setAmount(String(v))} className="flex-1 rounded-md border border-border bg-surface py-1.5 text-xs font-semibold hover:border-primary/50">{fmt(v, 0)}</button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Balance: {fmt(balance)} · Minimum 1,000</p>
        </div>
        <Button variant="accent" size="lg" onClick={start} disabled={busy || Number(amount) < 1000}>{busy && <Loader2 className="animate-spin" />} Make it rain</Button>
      </DialogContent>
    </Dialog>
  );
}

type OnlineCh = ReturnType<typeof supabase.channel>;
let onlineCh: OnlineCh | null = null;
const onlineListeners = new Set<(n: number) => void>();
let onlineCount = 1;
function subscribeOnline(userId: string, cb: (n: number) => void) {
  onlineListeners.add(cb);
  cb(onlineCount);
  if (!onlineCh) {
    const ch = supabase.channel(`online-players`, { config: { presence: { key: userId } } });
    onlineCh = ch;
    try {
      ch.on("presence", { event: "sync" }, () => {
        onlineCount = Object.keys(ch.presenceState()).length || 1;
        onlineListeners.forEach((f) => f(onlineCount));
      }).subscribe((s) => { if (s === "SUBSCRIBED") void ch.track({ at: Date.now() }); });
    } catch {
      /* channel already joined elsewhere; keep the last known count */
    }
  }
  return () => {
    onlineListeners.delete(cb);
    if (onlineListeners.size === 0 && onlineCh) {
      const ch = onlineCh;
      onlineCh = null;
      setTimeout(() => { if (!onlineCh) void supabase.removeChannel(ch); }, 0);
    }
  };
}
