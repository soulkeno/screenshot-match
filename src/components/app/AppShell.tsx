import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ChatPanel } from "./ChatPanel";
import { AuthScreen, BanScreen } from "./AuthScreen";
import { SnowEffect } from "./SnowEffect";
import { SettingsDialog } from "./SettingsDialog";
import { ProfileCardDialog } from "./ProfileCard";
import { FairnessDialog } from "./FairnessDialog";
import { CosmeticsDialog } from "./CosmeticsDialog";
import { LevelUpDialog } from "./LevelUpDialog";
import { WheelDialog } from "./WheelDialog";
import { Logo } from "@/components/common/bits";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, session, profile, chatOpen, setChatOpen, wheelOpen, setWheelOpen } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setCollapsed(localStorage.getItem("ember:sidebar") === "1");
  }, []);
  useEffect(() => { setMobileNav(false); }, [path]);

  if (!ready || (session && !profile)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <Logo />
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  if (!session) return <AuthScreen />;
  if (profile?.banned_until && new Date(profile.banned_until) > new Date()) {
    return <BanScreen until={profile.banned_until} reason={profile.ban_reason} onSignOut={() => void supabase.auth.signOut()} />;
  }

  const toggle = () => { setCollapsed((c) => { localStorage.setItem("ember:sidebar", c ? "0" : "1"); return !c; }); };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SnowEffect />
      <div className="hidden h-full lg:block"><Sidebar collapsed={collapsed} onToggle={toggle} /></div>
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-auto border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Sidebar collapsed={false} onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileNav(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">{children}</div>
        </main>
      </div>
      <div className={cn("hidden shrink-0 transition-[width] duration-200 md:block", chatOpen ? "w-[340px]" : "w-0 overflow-hidden")}>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>
      {chatOpen && (
        <div className="fixed inset-0 z-40 bg-background md:hidden"><ChatPanel onClose={() => setChatOpen(false)} /></div>
      )}
      <SettingsDialog />
      <ProfileCardDialog />
      <FairnessDialog />
      <CosmeticsDialog />
      <LevelUpDialog />
      <WheelDialog open={wheelOpen} onOpenChange={setWheelOpen} />
    </div>
  );
}
