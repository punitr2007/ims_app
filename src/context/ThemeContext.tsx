'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

export type ColorPaletteId =
  | 'lime-teal'
  | 'sky-blue'
  | 'violet-pink'
  | 'sunset-amber'
  | 'rose-crimson'
  | 'emerald-mint';

export interface ColorPalette {
  id: ColorPaletteId;
  name: string;
  category: string;
  from: string;
  to: string;
  accent: string;
  glow: string;
  previewGradient: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'lime-teal',
    name: 'Lime Aurora',
    category: 'Dynamic (New Logo)',
    from: '#84cc16',
    to: '#06b6d4',
    accent: '#10b981',
    glow: 'rgba(132, 204, 22, 0.35)',
    previewGradient: 'from-lime-400 via-emerald-400 to-cyan-400',
  },
  {
    id: 'sky-blue',
    name: 'Pixel Sky',
    category: 'Stock Android Blue',
    from: '#0ea5e9',
    to: '#3b82f6',
    accent: '#0284c7',
    glow: 'rgba(14, 165, 233, 0.35)',
    previewGradient: 'from-sky-400 to-blue-600',
  },
  {
    id: 'violet-pink',
    name: 'Neon Lavender',
    category: 'Material You Purple',
    from: '#a855f7',
    to: '#ec4899',
    accent: '#8b5cf6',
    glow: 'rgba(168, 85, 247, 0.35)',
    previewGradient: 'from-purple-400 via-fuchsia-500 to-pink-500',
  },
  {
    id: 'sunset-amber',
    name: 'Dune Sunset',
    category: 'Warm Bronze',
    from: '#f59e0b',
    to: '#f97316',
    accent: '#d97706',
    glow: 'rgba(245, 158, 11, 0.35)',
    previewGradient: 'from-amber-400 via-orange-500 to-rose-500',
  },
  {
    id: 'rose-crimson',
    name: 'Cyber Berry',
    category: 'Flaming Coral',
    from: '#f43f5e',
    to: '#e11d48',
    accent: '#be123c',
    glow: 'rgba(244, 63, 94, 0.35)',
    previewGradient: 'from-rose-400 to-red-600',
  },
  {
    id: 'emerald-mint',
    name: 'Mint Botanical',
    category: 'Forest Emerald',
    from: '#10b981',
    to: '#14b8a6',
    accent: '#059669',
    glow: 'rgba(16, 185, 129, 0.35)',
    previewGradient: 'from-emerald-400 to-teal-500',
  },
];

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  palette: ColorPaletteId;
  privacyMode: boolean;
  compactMode: boolean;
  ambientGlow: boolean;
  globalTarget: number;
  setThemeMode: (mode: ThemeMode) => void;
  setPalette: (palette: ColorPaletteId) => void;
  togglePrivacyMode: () => void;
  toggleCompactMode: () => void;
  toggleAmbientGlow: () => void;
  setGlobalTarget: (target: number) => void;
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'ims_theme_settings_v2';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [palette, setPaletteState] = useState<ColorPaletteId>('lime-teal');
  const [privacyMode, setPrivacyModeState] = useState<boolean>(false);
  const [compactMode, setCompactModeState] = useState<boolean>(false);
  const [ambientGlow, setAmbientGlowState] = useState<boolean>(true);
  const [globalTarget, setGlobalTargetState] = useState<number>(75);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(true);

  // Initialize from localStorage safely
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.themeMode) setThemeModeState(parsed.themeMode);
        if (parsed.palette) setPaletteState(parsed.palette);
        if (typeof parsed.privacyMode === 'boolean') setPrivacyModeState(parsed.privacyMode);
        if (typeof parsed.compactMode === 'boolean') setCompactModeState(parsed.compactMode);
        if (typeof parsed.ambientGlow === 'boolean') setAmbientGlowState(parsed.ambientGlow);
        if (typeof parsed.globalTarget === 'number') setGlobalTargetState(parsed.globalTarget);
      }
    } catch {
      // Fallback to defaults
    }

    // Media query for system theme
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemIsDark(mql.matches);
      const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }
  }, []);

  const resolvedTheme: 'dark' | 'light' = useMemo(() => {
    if (themeMode === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemIsDark]);

  // Apply attributes & CSS variables to document.documentElement
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Apply dark/light class
    root.classList.remove('dark', 'light');
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);

    // Apply color palette
    root.setAttribute('data-palette', palette);

    // Apply add-ons
    root.setAttribute('data-privacy', privacyMode ? 'true' : 'false');
    root.setAttribute('data-compact', compactMode ? 'true' : 'false');
    root.setAttribute('data-ambient-glow', ambientGlow ? 'true' : 'false');

    // Find palette variables
    const activePalette = COLOR_PALETTES.find((p) => p.id === palette) || COLOR_PALETTES[0];
    root.style.setProperty('--brand-from', activePalette.from);
    root.style.setProperty('--brand-to', activePalette.to);
    root.style.setProperty('--brand-accent', activePalette.accent);
    root.style.setProperty('--brand-glow', activePalette.glow);

    // Persist to localStorage
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          themeMode,
          palette,
          privacyMode,
          compactMode,
          ambientGlow,
          globalTarget,
        })
      );
    } catch {
      // ignore
    }
  }, [themeMode, resolvedTheme, palette, privacyMode, compactMode, ambientGlow, globalTarget]);

  const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode);
  const setPalette = (p: ColorPaletteId) => setPaletteState(p);
  const togglePrivacyMode = () => setPrivacyModeState((prev) => !prev);
  const toggleCompactMode = () => setCompactModeState((prev) => !prev);
  const toggleAmbientGlow = () => setAmbientGlowState((prev) => !prev);
  const setGlobalTarget = (target: number) => setGlobalTargetState(target);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        palette,
        privacyMode,
        compactMode,
        ambientGlow,
        globalTarget,
        setThemeMode,
        setPalette,
        togglePrivacyMode,
        toggleCompactMode,
        toggleAmbientGlow,
        setGlobalTarget,
        isCustomizerOpen,
        setIsCustomizerOpen,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
