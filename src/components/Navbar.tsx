"use client";

import React from "react";
import {
  Bell,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Shield,
  ChefHat,
  Crown,
  Wifi,
  LogOut,
  Store,
} from "lucide-react";
import { PortalRole, RestaurantBranding } from "../types/portal";
import { chimeManager } from "../lib/sound-chime";

interface NavbarProps {
  restaurantName: string;
  branding?: RestaurantBranding | null;
  currentRole: PortalRole;
  onRoleChange: (role: PortalRole) => void;
  lang: "es" | "en";
  onLangChange: (lang: "es" | "en") => void;
  isDark: boolean;
  onThemeToggle: () => void;
  activeOrdersCount: number;
  isLiveStream?: boolean;
  availableRestaurants?: Array<{ restaurant_id: string; name: string }>;
  onSwitchRestaurant?: (restaurantId: string) => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  restaurantName,
  branding,
  currentRole,
  onRoleChange,
  lang,
  onLangChange,
  isDark,
  onThemeToggle,
  activeOrdersCount,
  isLiveStream = false,
  availableRestaurants,
  onSwitchRestaurant,
  onLogout,
}) => {
  const [audioUnlocked, setAudioUnlocked] = React.useState(false);

  const handleUnlockAudio = () => {
    chimeManager.unlock();
    chimeManager.playNewOrderChime();
    setAudioUnlocked(true);
  };

  const brandColor = branding?.brand_primary_color || "#c2410c";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/95 backdrop-blur-sm px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand / Restaurant name */}
        <div className="flex items-center gap-3">
          {branding?.brand_logo_url ? (
            <img
              src={branding.brand_logo_url}
              alt="Logo"
              className="h-9 w-9 rounded-lg object-contain border border-[var(--border-subtle)]"
            />
          ) : (
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center font-black text-white text-base shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              EA
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
                {restaurantName}
              </span>
              {isLiveStream ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Wifi className="h-3 w-3 text-emerald-600 animate-pulse" />
                  {lang === "es" ? "En Vivo (SSE)" : "Live (SSE)"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                  <Wifi className="h-3 w-3 text-slate-500" />
                  {lang === "es" ? "En Línea" : "Online"}
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              Escal-AI Cloud Portal
            </span>
          </div>
        </div>

        {/* Center: Surface / Role Selector */}
        <div className="flex items-center bg-[var(--surface-muted)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold">
          <button
            onClick={() => onRoleChange("kitchen")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentRole === "kitchen"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ChefHat className="h-4 w-4 text-amber-600" />
            <span>{lang === "es" ? "Cocina KDS" : "Kitchen KDS"}</span>
            {activeOrdersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                {activeOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onRoleChange("owner")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentRole === "owner"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Crown className="h-4 w-4 text-emerald-600" />
            <span>{lang === "es" ? "Dueño / ROI" : "Owner & ROI"}</span>
          </button>

          <button
            onClick={() => onRoleChange("support_latam")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentRole === "support_latam"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Shield className="h-4 w-4 text-blue-600" />
            <span>{lang === "es" ? "Soporte LatAm" : "Support QA"}</span>
          </button>
        </div>

        {/* Right: Audio Chime, Language, Theme */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Trigger Button */}
          <button
            onClick={handleUnlockAudio}
            title={
              audioUnlocked
                ? lang === "es"
                  ? "Campana de audio activa (Haz clic para probar)"
                  : "Audio chime active (Click to test)"
                : lang === "es"
                ? "Activar sonido de pedidos en cocina"
                : "Enable kitchen audio chime"
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              audioUnlocked
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
            }`}
          >
            {audioUnlocked ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">
                  {lang === "es" ? "Sonido Activo" : "Sound On"}
                </span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-amber-600" />
                <span>{lang === "es" ? "Activar Timbre" : "Enable Chime"}</span>
              </>
            )}
          </button>

          {/* Language Switch */}
          <button
            onClick={() => onLangChange(lang === "es" ? "en" : "es")}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
          >
            {lang === "es" ? "EN" : "ES"}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] border border-[var(--border-subtle)]"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {/* Tenant Switcher (if multi-restaurant owner) */}
          {availableRestaurants && availableRestaurants.length > 1 && onSwitchRestaurant && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-[var(--border-subtle)]">
              <Store className="h-3.5 w-3.5 text-orange-600" />
              <select
                onChange={(e) => onSwitchRestaurant(e.target.value)}
                defaultValue=""
                className="px-2 py-1.5 rounded-lg text-xs font-bold bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none"
              >
                <option value="" disabled>
                  {lang === "es" ? "Cambiar Sucursal" : "Switch Branch"}
                </option>
                {availableRestaurants.map((r) => (
                  <option key={r.restaurant_id} value={r.restaurant_id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title={lang === "es" ? "Cerrar Sesión" : "Sign Out"}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-[var(--border-subtle)] transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
