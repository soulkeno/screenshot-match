/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";

export interface FrameItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: "frame";
}

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

export type AnyCosmetic = FrameItem | FontItem | GlowItem;

export const COSMETIC_FRAMES: FrameItem[] = [
  { id: "frame-1", name: "Nutcracker Royal", price: 50000, image: "/frames/frame-1.png", category: "frame" },
  { id: "frame-2", name: "Cyber Visor", price: 75000, image: "/frames/frame-2.png", category: "frame" },
  { id: "frame-3", name: "Neon Gamer", price: 60000, image: "/frames/frame-3.png", category: "frame" },
  { id: "frame-4", name: "Blue Scholar", price: 40000, image: "/frames/frame-4.png", category: "frame" },
  { id: "frame-5", name: "Gothic Bunny", price: 65000, image: "/frames/frame-5.png", category: "frame" },
  { id: "frame-6", name: "Pastel Unicorn", price: 80000, image: "/frames/frame-6.png", category: "frame" },
  { id: "frame-7", name: "Disco Star", price: 55000, image: "/frames/frame-7.png", category: "frame" },
  { id: "frame-8", name: "Blue Floral", price: 70000, image: "/frames/frame-8.png", category: "frame" },
  { id: "frame-9", name: "Midnight Rose", price: 60000, image: "/frames/frame-9.png", category: "frame" },
  { id: "frame-10", name: "Frost Crown", price: 90000, image: "/frames/frame-10.png", category: "frame" },
  { id: "frame-11", name: "Mecha Neko", price: 85000, image: "/frames/frame-11.png", category: "frame" },
  { id: "frame-12", name: "Thunder Glow", price: 50000, image: "/frames/frame-12.png", category: "frame" },
];

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
  { id: "glow-aurora", name: "Rainbow Aurora", price: 100000, className: "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 drop-shadow-[0_0_8px_rgba(216,180,254,0.7)] animate-pulse", category: "glow" },
  { id: "glow-fire", name: "Inferno Flame", price: 90000, className: "text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]", category: "glow" },
  { id: "glow-cyber", name: "Cyber Neon", price: 85000, className: "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.85)]", category: "glow" },
  { id: "glow-gold", name: "Golden Mythic", price: 120000, className: "text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 drop-shadow-[0_0_12px_rgba(250,204,21,0.85)]", category: "glow" },
  { id: "glow-void", name: "Cosmic Void", price: 95000, className: "text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-600 to-indigo-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]", category: "glow" },
  { id: "glow-emerald", name: "Emerald Glint", price: 80000, className: "text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-400 to-teal-500 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]", category: "glow" },
  { id: "glow-ice", name: "Glacial Frost", price: 85000, className: "text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-blue-400 drop-shadow-[0_0_10px_rgba(186,230,253,0.9)]", category: "glow" },
];

export interface UserCosmeticsData {
  owned: string[]; // item ids
  equipped: {
    frame: string | null;
    font: string | null;
    glow: string | null;
  };
}

const DEFAULT_COSMETICS: UserCosmeticsData = {
  owned: ["font-default", "glow-default"],
  equipped: {
    frame: null,
    font: "font-default",
    glow: "glow-default",
  },
};

export function getLocalCosmetics(userId: string | null): UserCosmeticsData {
  if (!userId) return DEFAULT_COSMETICS;
  try {
    const raw = localStorage.getItem(`keno:cosmetics:${userId}`);
    if (!raw) return DEFAULT_COSMETICS;
    const parsed = JSON.parse(raw);
    return {
      owned: Array.isArray(parsed.owned) ? Array.from(new Set([...DEFAULT_COSMETICS.owned, ...parsed.owned])) : DEFAULT_COSMETICS.owned,
      equipped: {
        frame: parsed.equipped?.frame ?? null,
        font: parsed.equipped?.font ?? "font-default",
        glow: parsed.equipped?.glow ?? "glow-default",
      },
    };
  } catch {
    return DEFAULT_COSMETICS;
  }
}

export function saveLocalCosmetics(userId: string | null, data: UserCosmeticsData) {
  if (!userId) return;
  try {
    localStorage.setItem(`keno:cosmetics:${userId}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("keno:cosmetics-change", { detail: { userId, data } }));
  } catch {}
}

export function useCosmetics(userId: string | null) {
  const [data, setData] = useState<UserCosmeticsData>(() => getLocalCosmetics(userId));

  useEffect(() => {
    setData(getLocalCosmetics(userId));
    const handle = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.userId === userId) {
        setData(getLocalCosmetics(userId));
      }
    };
    window.addEventListener("keno:cosmetics-change", handle);
    return () => window.removeEventListener("keno:cosmetics-change", handle);
  }, [userId]);

  const equip = useCallback(
    (category: "frame" | "font" | "glow", id: string | null) => {
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
    equip,
    addOwned,
    isOwned: (id: string) => data.owned.includes(id),
    isEquipped: (category: "frame" | "font" | "glow", id: string | null) => data.equipped[category] === id,
  };
}

export function getFrameUrl(frameId: string | null | undefined): string | null {
  if (!frameId) return null;
  const item = COSMETIC_FRAMES.find((f) => f.id === frameId);
  return item ? item.image : null;
}

export function getFontFamily(fontId: string | null | undefined): string {
  if (!fontId) return "inherit";
  const item = COSMETIC_FONTS.find((f) => f.id === fontId);
  return item ? item.fontFamily : "inherit";
}

export function getGlowClass(glowId: string | null | undefined): string {
  if (!glowId) return "";
  const item = COSMETIC_GLOWS.find((g) => g.id === glowId);
  return item ? item.className : "";
}

export function getEquippedStyles(userId: string | null) {
  const data = getLocalCosmetics(userId);
  return {
    frameUrl: getFrameUrl(data.equipped.frame),
    fontFamily: getFontFamily(data.equipped.font),
    glowClass: getGlowClass(data.equipped.glow),
  };
}

export function useEquippedStyles(userId: string | null) {
  const { equipped } = useCosmetics(userId);
  return {
    frameUrl: getFrameUrl(equipped.frame),
    fontFamily: getFontFamily(equipped.font),
    glowClass: getGlowClass(equipped.glow),
  };
}
