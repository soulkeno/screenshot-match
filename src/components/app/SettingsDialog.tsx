import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, LogOut, Ticket, Volume2, VolumeX, User, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { changeUsernameFn } from "@/lib/games.functions";
import { fileToAvatarDataUrl, UserAvatar } from "@/components/common/bits";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { isMuted, setMuted } from "@/lib/sound";
import { errMsg, fmt } from "@/lib/format";
import { USERNAME_RE } from "@/lib/auth-email";

export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen, profile, refresh, chatOpen, setChatOpen, setFairOpen } = useApp();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [muted, setMutedState] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const changeName = useServerFn(changeUsernameFn);

  useEffect(() => {
    if (settingsOpen) { setName(profile?.username ?? ""); setMutedState(isMuted()); }
  }, [settingsOpen, profile?.username]);

  async function saveName() {
    if (!USERNAME_RE.test(name)) return toast.error("Usernames are 3-16 letters, numbers or _");
    setBusy("name");
    try {
      await changeName({ data: { username: name } });
      await refresh();
      toast.success("Username updated");
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(null);
  }
  async function onFile(f: File | undefined) {
    if (!f || !profile) return;
    if (!f.type.startsWith("image/")) return toast.error("Pick an image file");
    setBusy("avatar");
    try {
      const url = await fileToAvatarDataUrl(f);
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
      if (error) throw error;
      await refresh();
      toast.success("Profile picture updated");
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(null);
  }
  async function removeAvatar() {
    if (!profile) return;
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    await refresh();
  }
  async function redeem() {
    if (!code.trim()) return;
    setBusy("code");
    const { data, error } = await supabase.rpc("redeem_code", { p_code: code.trim() });
    setBusy(null);
    if (error) return toast.error(errMsg(error));
    toast.success(`Code redeemed! +${fmt(data)} coins`);
    setCode("");
  }

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="border-border bg-popover sm:max-w-lg">
        <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
        <Tabs defaultValue="account">
          <TabsList className="grid w-full grid-cols-3 bg-surface">
            <TabsTrigger value="account"><User className="size-4" /> Account</TabsTrigger>
            <TabsTrigger value="codes"><Ticket className="size-4" /> Codes</TabsTrigger>
            <TabsTrigger value="prefs"><Volume2 className="size-4" /> Preferences</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="space-y-5 pt-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <UserAvatar name={profile?.username ?? "?"} url={profile?.avatar_url} size={72} className="rounded-2xl" />
                <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow" aria-label="Change picture">
                  {busy === "avatar" ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Profile picture</p>
                <p className="text-xs text-muted-foreground">Square images look best. Without one we show your first letter.</p>
                {profile?.avatar_url && <button onClick={removeAvatar} className="mt-1 flex items-center gap-1 text-xs text-destructive hover:underline"><Trash2 className="size-3" /> Remove</button>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Username</label>
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, ""))} maxLength={16} className="h-10 bg-surface" />
                <Button onClick={saveName} disabled={busy === "name" || name === profile?.username}>{busy === "name" && <Loader2 className="animate-spin" />}Save</Button>
              </div>
              <p className="text-xs text-muted-foreground">You'll sign in with your new username afterwards.</p>
            </div>
            <Button variant="surface" className="w-full" onClick={() => { setSettingsOpen(false); setFairOpen(true); }}><ShieldCheck /> Provably fair settings</Button>
            <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => { setSettingsOpen(false); void supabase.auth.signOut(); }}><LogOut /> Sign out</Button>
          </TabsContent>
          <TabsContent value="codes" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">Got a code from the team? Redeem it for free coins.</p>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" className="h-11 bg-surface font-mono uppercase" onKeyDown={(e) => e.key === "Enter" && redeem()} />
              <Button size="lg" onClick={redeem} disabled={busy === "code" || !code.trim()}>{busy === "code" && <Loader2 className="animate-spin" />}Redeem</Button>
            </div>
          </TabsContent>
          <TabsContent value="prefs" className="space-y-3 pt-4">
            <Row icon={muted ? VolumeX : Volume2} title="Game sounds" desc="Card deals, wins, clicks and more">
              <Switch checked={!muted} onCheckedChange={(v) => { setMuted(!v); setMutedState(!v); }} />
            </Row>
            <Row icon={User} title="Show chat" desc="Hide the public chat to focus on your games">
              <Switch checked={chatOpen} onCheckedChange={setChatOpen} />
            </Row>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, title, desc, children }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <Icon className="size-5 text-primary" />
      <div className="flex-1"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      {children}
    </div>
  );
}
