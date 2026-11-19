export type ClubTier = "none" | "vip" | "vip_plus" | "mvp" | "mvp_plus" | "premium";

export type ClubMeta = {
  id: ClubTier;
  name: string;
  badge: string;
  multiplier: number;
  tone: string;
  bg: string;
  border: string;
  desc: string;
  perks: string[];
};

export const CLUBS: Record<ClubTier, ClubMeta> = {
  none: {
    id: "none",
    name: "Standard",
    badge: "STANDARD",
    multiplier: 1.0,
    tone: "text-muted-foreground",
    bg: "bg-surface-2",
    border: "border-border",
    desc: "Default player rank.",
    perks: ["Standard daily rewards", "Standard rakeback", "Global chat access"],
  },
  vip: {
    id: "vip",
    name: "VIP Club",
    badge: "VIP",
    multiplier: 2.0,
    tone: "text-amber-400",
    bg: "bg-gradient-to-r from-yellow-500/15 to-amber-500/15",
    border: "border-yellow-500/40",
    desc: "2.0x boost on rewards and rakeback.",
    perks: ["2.0× Daily Rewards", "2.0× Rakeback Boost", "Exclusive Golden VIP Badge", "Enhanced Wheel Slices"],
  },
  vip_plus: {
    id: "vip_plus",
    name: "VIP+ Club",
    badge: "VIP+",
    multiplier: 2.5,
    tone: "text-orange-400",
    bg: "bg-gradient-to-r from-orange-500/15 to-amber-500/15",
    border: "border-orange-500/40",
    desc: "2.5x advanced booster with special chat glow.",
    perks: ["2.5× Daily Rewards", "2.5× Rakeback Boost", "VIP+ Golden Ribbon", "Priority Rains"],
  },
  mvp: {
    id: "mvp",
    name: "MVP Club",
    badge: "MVP",
    multiplier: 3.0,
    tone: "text-cyan-400",
    bg: "bg-gradient-to-r from-cyan-500/15 to-blue-500/15",
    border: "border-cyan-500/40",
    desc: "3.0x elite MVP status with neon cyan flair.",
    perks: ["3.0× Daily Rewards", "3.0× Rakeback Boost", "Neon Cyan MVP Badge", "Special Chat Crown"],
  },
  mvp_plus: {
    id: "mvp_plus",
    name: "MVP+ Club",
    badge: "MVP+",
    multiplier: 4.0,
    tone: "text-purple-400",
    bg: "bg-gradient-to-r from-purple-500/15 to-fuchsia-500/15",
    border: "border-purple-500/40",
    desc: "4.0x high roller MVP+ tier with amethyst crown.",
    perks: ["4.0× Daily Rewards", "4.0× Rakeback Boost", "Amethyst MVP+ Crown", "Custom Nametag Flare"],
  },
  premium: {
    id: "premium",
    name: "Premium Club",
    badge: "PREMIUM",
    multiplier: 5.0,
    tone: "text-emerald-400",
    bg: "bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
    border: "border-emerald-400/50",
    desc: "The ultimate 5.0x royal club status.",
    perks: ["5.0× Maximum Daily Rewards", "5.0× Maximum Rakeback", "Prismatic Royal Crown Badge", "Zero Fees & Max Yields"],
  },
};

export function getClubTier(profile: { id?: string; is_vip?: boolean } | null | undefined): ClubTier {
  if (!profile) return "none";
  if (typeof window !== "undefined" && profile.id) {
    const custom = localStorage.getItem(`keno:club:${profile.id}`);
    if (custom && custom in CLUBS) return custom as ClubTier;
  }
  return profile.is_vip ? "vip" : "none";
}

export function setClubTierLocal(userId: string, tier: ClubTier) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`keno:club:${userId}`, tier);
  window.dispatchEvent(new CustomEvent("keno:club-change", { detail: { userId, tier } }));
}
