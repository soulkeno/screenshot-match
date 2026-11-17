import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShoppingBag, Sparkles, Check, Loader2, Coins, Type, Flame } from "lucide-react";
import { PageHeader, Amount, UserAvatar, UserName, SnowCap } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { buyCosmeticFn } from "@/lib/games.functions";
import {
  useCosmetics,
  COSMETIC_FONTS,
  COSMETIC_GLOWS,
  type FontItem,
  type GlowItem,
} from "@/lib/cosmetics";
import { errMsg, fmt } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Cosmetics Shop — Keno Casino" },
      { name: "description", content: "Customize your profile with glowing gradient nametags and custom fonts." },
      { property: "og:title", content: "Cosmetics Shop — Keno Casino" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { profile, balance, setBalance, userId } = useApp();
  const buyFn = useServerFn(buyCosmeticFn);
  const [tab, setTab] = useState<"fonts" | "glows">("fonts");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const { equipped, isOwned, isEquipped, equip, addOwned } = useCosmetics(userId);

  // Selected item for preview in header
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [previewGlow, setPreviewGlow] = useState<string | null>(null);

  const activeFont = previewFont !== null ? previewFont : equipped.font;
  const activeGlow = previewGlow !== null ? previewGlow : equipped.glow;

  async function handleBuy(item: FontItem | GlowItem) {
    if (!userId) return;
    if (balance < item.price) {
      toast.error(`You need ${fmt(item.price)} coins to purchase this item!`);
      return;
    }
    setBuyingId(item.id);
    try {
      const res = await buyFn({ data: { itemId: item.id, price: item.price } });
      if (typeof res?.balance === "number") {
        setBalance(res.balance);
      }
      addOwned(item.id);
      equip(item.category, item.id);
      sfx.win();
      toast.success(`Purchased and equipped ${item.name}! 🎉`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          icon={ShoppingBag}
          title="Cosmetics Shop"
          subtitle="Spend your winnings on custom name fonts and animated glowing gradient nametags."
        />
        <div className="flex items-center gap-2 self-start rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
          <p className="text-xs text-muted-foreground">Coins Available:</p>
          <Amount value={balance} className="text-base font-bold text-success" />
        </div>
      </div>

      {/* Live Fitting Room / Character Showcase */}
      {profile && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-surface-2 via-surface to-background p-6 shadow-card">
          <SnowCap />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <UserAvatar
                name={profile.username}
                url={profile.avatar_url}
                size={70}
              />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                  <Sparkles className="size-3" /> Live Preview
                </p>
                <UserName
                  name={profile.username}
                  font={activeFont}
                  glow={activeGlow}
                  className="text-2xl font-bold mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Click any font or glow below to test it on your profile.
                </p>
              </div>
            </div>

            {(previewFont !== null || previewGlow !== null) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreviewFont(null);
                  setPreviewGlow(null);
                }}
              >
                Reset Preview
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        {(
          [
            ["fonts", "Custom Fonts", COSMETIC_FONTS.length, Type],
            ["glows", "Glowing Nametags", COSMETIC_GLOWS.length, Flame],
          ] as const
        ).map(([key, label, count, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
              tab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            <span>{label}</span>
            <span className="rounded-full bg-background/30 px-2 py-0.5 text-xs">{count}</span>
          </button>
        ))}
      </div>

      {tab === "fonts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COSMETIC_FONTS.map((item) => {
            const owned = item.price === 0 || isOwned(item.id);
            const active = isEquipped("font", item.id);
            const isPreviewing = previewFont === item.id;
            const isBuying = buyingId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setPreviewFont(item.id)}
                className={cn(
                  "cursor-pointer rounded-2xl border p-5 flex flex-col justify-between transition-all hover:border-primary/50 shadow-card",
                  active
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : isPreviewing
                      ? "border-accent bg-accent/10 ring-1 ring-accent"
                      : "border-border bg-surface"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm">{item.name}</p>
                    {item.price === 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-surface-2 px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="my-4 p-3 rounded-xl bg-background border border-border/60">
                    <p className="text-xl font-bold truncate text-foreground" style={{ fontFamily: item.fontFamily }}>
                      {profile?.username || "Keno Player"}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    {owned ? (
                      <span className="text-success font-semibold">Unlocked</span>
                    ) : (
                      <span className="font-bold flex items-center gap-1">
                        <Coins className="size-3.5 text-gold" /> {fmt(item.price)}
                      </span>
                    )}
                  </div>
                  {owned ? (
                    <Button
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="text-xs font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        equip("font", item.id);
                      }}
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
                      size="sm"
                      variant="play"
                      disabled={isBuying}
                      className="text-xs font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleBuy(item);
                      }}
                    >
                      {isBuying ? <Loader2 className="size-3 animate-spin" /> : "Unlock Font"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "glows" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COSMETIC_GLOWS.map((item) => {
            const owned = item.price === 0 || isOwned(item.id);
            const active = isEquipped("glow", item.id);
            const isPreviewing = previewGlow === item.id;
            const isBuying = buyingId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setPreviewGlow(item.id)}
                className={cn(
                  "cursor-pointer rounded-2xl border p-5 flex flex-col justify-between transition-all hover:border-primary/50 shadow-card",
                  active
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : isPreviewing
                      ? "border-accent bg-accent/10 ring-1 ring-accent"
                      : "border-border bg-surface"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm">{item.name}</p>
                    {item.price === 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-surface-2 px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="my-4 p-3 rounded-xl bg-background border border-border/60">
                    <p className={cn("text-xl font-bold truncate", item.className || "text-foreground")}>
                      {profile?.username || "Keno Player"}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    {owned ? (
                      <span className="text-success font-semibold">Unlocked</span>
                    ) : (
                      <span className="font-bold flex items-center gap-1">
                        <Coins className="size-3.5 text-gold" /> {fmt(item.price)}
                      </span>
                    )}
                  </div>
                  {owned ? (
                    <Button
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="text-xs font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        equip("glow", item.id);
                      }}
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
                      size="sm"
                      variant="play"
                      disabled={isBuying}
                      className="text-xs font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleBuy(item);
                      }}
                    >
                      {isBuying ? <Loader2 className="size-3 animate-spin" /> : "Unlock Glow"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
