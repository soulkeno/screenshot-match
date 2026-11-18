/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";

export interface FontItem {
  id: string;
  name: string;
  price: number;
  fontFamily: string;
  preview: string;
  category: "font";
}

export interface GlowItem {
  id: string;
  name: string;
  price: number;
  className: string;
  category: "glow";
}

export type AnyCosmetic = FontItem | GlowItem;

export const COSMETIC_FONTS: FontItem[] = [
  { id: "font-default", name: "Default Clean", price: 0, fontFamily: "inherit", preview: "AaBbCc", category: "font" },
  { id: "font-orbitron", name: "Cyber Orbitron", price: 25000, fontFamily: "'Orbitron', sans-serif", preview: "CYBER", category: "font" },
  { id: "font-cinzel", name: "Imperial Cinzel", price: 35000, fontFamily: "'Cinzel', serif", preview: "ROYAL", category: "font" },
  { id: "font-pacifico", name: "Luxe Cursive", price: 45000, fontFamily: "'Pacifico', cursive", preview: "Classic", category: "font" },
  { id: "font-press", name: "Arcade 8-Bit", price: 40000, fontFamily: "'Press Start 2P', monospace", preview: "8-BIT", category: "font" },
  { id: "font-mono", name: "Matrix Mono", price: 20000, fontFamily: "'JetBrains Mono', monospace", preview: "root", category: "font" },
  { id: "font-display", name: "Bebas Bold", price: 30000, fontFamily: "'Bebas Neue', sans-serif", preview: "BOLD", category: "font" },
];

export const COSMETIC_GLOWS: GlowItem[] = [
  { id: "glow-default", name: "Standard", price: 0, className: "", category: "glow" },
  { id: "glow-aurora", name: "Rainbow Aurora", price: 100000, className: "!text-transparent !bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 drop-shadow-[0_0_12px_rgba(216,180,254,0.95)] animate-pulse font-black", category: "glow" },
  { id: "glow-fire", name: "Inferno Flame", price: 90000, className: "!text-transparent !bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_0_14px_rgba(249,115,22,0.95)] font-black", category: "glow" },
  { id: "glow-cyber", name: "Cyber Neon", price: 85000, className: "!text-transparent !bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_14px_rgba(6,182,212,0.95)] font-black", category: "glow" },
  { id: "glow-gold", name: "Golden Mythic", price: 120000, className: "!text-transparent !bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 drop-shadow-[0_0_16px_rgba(250,204,21,0.95)] font-black", category: "glow" },
  { id: "glow-void", name: "Cosmic Void", price: 95000, className: "!text-transparent !bg-clip-text bg-gradient-to-r from-violet-400 via-purple-600 to-indigo-400 drop-shadow-[0_0_14px_rgba(168,85,247,0.95)] font-black", category: "glow" },
  { id: "glow-emerald", name: "Emerald Glint", price: 80000, className: "!text-transparent !bg-clip-text bg-gradient-to-r from-emerald-300 via-green-400 to-teal-500 drop-shadow-[0_0_14px_rgba(52,211,153,0.95)] font-black", category: "glow" },
  { id: "glow-ice", name: "Glacial Frost", price: 85000, className: "!text-transparent !bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-blue-400 drop-shadow-[0_0_16px_rgba(186,230,253,1)] font-black", category: "glow" },
];

export interface UserCosmeticsData {
  owned: string[]; // item ids
  equipped: {
    font: string | null;
    glow: string | null;
  };
}

const DEFAULT_COSMETICS: UserCosmeticsData = {
  owned: ["font-default", "glow-default"],
  equipped: {
    font: "font-default",
    glow: "glow-default",
  },
};

// Global memory cache for all users
const memoryCache = new Map<string, UserCosmeticsData>();

export function getLocalCosmetics(userId: string | null): UserCosmeticsData {
  if (typeof window === "undefined") return DEFAULT_COSMETICS;
  try {
    const key = userId ? `keno:cosmetics:${userId}` : "keno:cosmetics:me";
    const raw = localStorage.getItem(key) || (userId ? localStorage.getItem("keno:cosmetics:me") : null);
    if (!raw) return DEFAULT_COSMETICS;
    const parsed = JSON.parse(raw);
    const data: UserCosmeticsData = {
      owned: Array.isArray(parsed.owned) ? Array.from(new Set([...DEFAULT_COSMETICS.owned, ...parsed.owned])) : DEFAULT_COSMETICS.owned,
      equipped: {
        font: parsed.equipped?.font ?? "font-default",
        glow: parsed.equipped?.glow ?? "glow-default",
      },
    };
    if (userId) memoryCache.set(userId, data);
    return data;
  } catch {
    return DEFAULT_COSMETICS;
  }
}

export function saveLocalCosmetics(userId: string | null, data: UserCosmeticsData) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      localStorage.setItem(`keno:cosmetics:${userId}`, JSON.stringify(data));
      memoryCache.set(userId, data);
    }
    // Always keep active local profile up to date
    localStorage.setItem("keno:cosmetics:me", JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("keno:cosmetics-change", { detail: { userId, data } }));
  } catch {}
}

export function resolveFontFamily(val: string | null | undefined): string | undefined {
  if (!val || val === "font-default" || val === "inherit") return undefined;
  // If already a CSS fontFamily string
  if (val.includes("'") || val.includes('"') || val.includes(",") || val.includes("sans-serif") || val.includes("serif") || val.includes("monospace") || val.includes("cursive")) {
    return val;
  }
  const item = COSMETIC_FONTS.find((f) => f.id === val);
  return item && item.fontFamily !== "inherit" ? item.fontFamily : undefined;
}

export function resolveGlowClass(val: string | null | undefined): string {
  if (!val || val === "glow-default") return "";
  // If already a CSS class string with gradient or shadow
  if (val.includes("bg-clip-text") || val.includes("drop-shadow") || val.includes("from-") || val.includes("text-transparent")) {
    return val;
  }
  const item = COSMETIC_GLOWS.find((g) => g.id === val);
  return item ? item.className : "";
}

export function useCosmetics(userId: string | null) {
  const [data, setData] = useState<UserCosmeticsData>(() => getLocalCosmetics(userId));

  useEffect(() => {
    setData(getLocalCosmetics(userId));
    const handle = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !userId || detail.userId === userId || detail.userId === "me") {
        setData(getLocalCosmetics(userId));
      }
    };
    window.addEventListener("keno:cosmetics-change", handle);
    return () => window.removeEventListener("keno:cosmetics-change", handle);
  }, [userId]);

  const equip = useCallback(
    (category: "font" | "glow", id: string | null) => {
      const current = getLocalCosmetics(userId);
      const next: UserCosmeticsData = {
        ...current,
        equipped: {
          ...current.equipped,
          [category]: id,
        },
      };
      saveLocalCosmetics(userId, next);
      setData(next);
    },
    [userId]
  );

  const addOwned = useCallback(
    (id: string) => {
      const current = getLocalCosmetics(userId);
      if (current.owned.includes(id)) return;
      const next: UserCosmeticsData = {
        ...current,
        owned: [...current.owned, id],
      };
      saveLocalCosmetics(userId, next);
      setData(next);
    },
    [userId]
  );

  return {
    ...data,
    fontFamily: resolveFontFamily(data.equipped.font),
    glowClass: resolveGlowClass(data.equipped.glow),
    equip,
    addOwned,
    isOwned: (id: string) => data.owned.includes(id),
    isEquipped: (category: "font" | "glow", id: string | null) => data.equipped[category] === id,
  };
}

export function getEquippedStyles(userId: string | null) {
  const data = getLocalCosmetics(userId);
  return {
    frameUrl: null,
    fontFamily: resolveFontFamily(data.equipped.font),
    glowClass: resolveGlowClass(data.equipped.glow),
  };
}

export function useEquippedStyles(userId: string | null) {
  const { equipped } = useCosmetics(userId);
  return {
    frameUrl: null,
    fontFamily: resolveFontFamily(equipped.font),
    glowClass: resolveGlowClass(equipped.glow),
  };
}
