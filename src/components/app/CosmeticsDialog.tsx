import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Check, ShoppingBag } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar, UserName } from "@/components/common/bits";
import {
  useCosmetics,
  COSMETIC_FRAMES,
  COSMETIC_FONTS,
  COSMETIC_GLOWS,
  getFrameUrl,
} from "@/lib/cosmetics";
import { cn } from "@/lib/utils";

export function CosmeticsDialog() {
  const { cosmeticsOpen, setCosmeticsOpen, profile, userId } = useApp();
  const [tab, setTab] = useState<"frames" | "fonts" | "glows">("frames");
  const { equipped, owned, equip, isOwned, isEquipped } = useCosmetics(userId);

  if (!profile) return null;

  return (
    <Dialog open={cosmeticsOpen} onOpenChange={setCosmeticsOpen}>
      <DialogContent className="border-border bg-popover max-w-xl max-h-[88vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="size-5 text-primary animate-pulse" /> My Cosmetics Locker
          </DialogTitle>
          <DialogDescription>
            Equip your unlocked avatar frames, custom fonts, and glowing gradient nametags.
          </DialogDescription>
        </DialogHeader>

        {/* Live Character Preview Card */}
        <div className="mx-5 my-3 p-4 rounded-xl border border-border bg-surface-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatar
              name={profile.username}
              url={profile.avatar_url}
              frame={getFrameUrl(equipped.frame)}
              size={56}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Preview</p>
              <UserName
                name={profile.username}
                font={equipped.font}
                glow={equipped.glow}
                className="text-lg font-bold"
              />
            </div>
          </div>
          <Button asChild variant="outline" size="sm" onClick={() => setCosmeticsOpen(false)}>
            <Link to="/shop" className="gap-1.5 font-bold">
              <ShoppingBag className="size-3.5" /> Shop
            </Link>
          </Button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 flex gap-2 border-b border-border pb-3">
          {(
            [
              ["frames", "Avatar Frames", COSMETIC_FRAMES.length],
              ["fonts", "Name Fonts", COSMETIC_FONTS.length],
              ["glows", "Glowing Tags", COSMETIC_GLOWS.length],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                tab === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 no-scrollbar">
          {tab === "frames" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Unequip frame option */}
              <div
                onClick={() => equip("frame", null)}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 flex flex-col items-center justify-between text-center transition hover:border-primary/50",
                  equipped.frame === null ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-surface"
                )}
              >
                <div className="size-16 rounded-full border border-dashed border-border grid place-items-center text-xs text-muted-foreground">
                  None
                </div>
                <p className="mt-2 text-xs font-bold">Default (No Frame)</p>
                <span className="mt-1 text-[10px] text-muted-foreground">
                  {equipped.frame === null ? "Equipped" : "Click to Unequip"}
                </span>
              </div>

              {COSMETIC_FRAMES.map((f) => {
                const unlocked = isOwned(f.id);
                const active = isEquipped("frame", f.id);
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "rounded-xl border p-3 flex flex-col items-center justify-between text-center transition",
                      active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-surface"
                    )}
                  >
                    <div className="relative size-16 grid place-items-center">
                      <UserAvatar name={profile.username} url={profile.avatar_url} size={42} />
                      <img
                        src={f.image}
                        alt={f.name}
                        className="pointer-events-none absolute -inset-[22%] size-[144%] max-w-none object-contain z-10"
                      />
                    </div>
                    <p className="mt-2 text-xs font-bold truncate max-w-full">{f.name}</p>
                    {unlocked ? (
                      <Button
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className="mt-2 h-7 w-full text-xs font-bold"
                        onClick={() => equip("frame", active ? null : f.id)}
                      >
                        {active ? (
                          <>
                            <Check className="size-3 mr-1" /> Equipped
                          </>
                        ) : (
                          "Equip"
                        )}
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="mt-2 h-7 w-full text-xs"
                        onClick={() => setCosmeticsOpen(false)}
                      >
                        <Link to="/shop">Get in Shop</Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "fonts" && (
            <div className="space-y-2">
              {COSMETIC_FONTS.map((font) => {
                const unlocked = font.price === 0 || isOwned(font.id);
                const active = isEquipped("font", font.id);
                return (
                  <div
                    key={font.id}
                    className={cn(
                      "rounded-xl border p-3 flex items-center justify-between gap-3 transition",
                      active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-surface"
                    )}
                  >
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{font.name}</p>
                      <p className="text-base font-bold mt-0.5" style={{ fontFamily: font.fontFamily }}>
                        {profile.username}
                      </p>
                    </div>
                    {unlocked ? (
                      <Button
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className="h-8 text-xs font-bold"
                        onClick={() => equip("font", font.id)}
                      >
                        {active ? (
                          <>
                            <Check className="size-3 mr-1" /> Equipped
                          </>
                        ) : (
                          "Equip"
                        )}
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={() => setCosmeticsOpen(false)}
                      >
                        <Link to="/shop">Unlock in Shop</Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "glows" && (
            <div className="space-y-2">
              {COSMETIC_GLOWS.map((glow) => {
                const unlocked = glow.price === 0 || isOwned(glow.id);
                const active = isEquipped("glow", glow.id);
                return (
                  <div
                    key={glow.id}
                    className={cn(
                      "rounded-xl border p-3 flex items-center justify-between gap-3 transition",
                      active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-surface"
                    )}
                  >
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{glow.name}</p>
                      <p className={cn("text-base font-bold mt-0.5", glow.className || "text-foreground")}>
                        {profile.username}
                      </p>
                    </div>
                    {unlocked ? (
                      <Button
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className="h-8 text-xs font-bold"
                        onClick={() => equip("glow", glow.id)}
                      >
                        {active ? (
                          <>
                            <Check className="size-3 mr-1" /> Equipped
                          </>
                        ) : (
                          "Equip"
                        )}
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={() => setCosmeticsOpen(false)}
                      >
                        <Link to="/shop">Unlock in Shop</Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
