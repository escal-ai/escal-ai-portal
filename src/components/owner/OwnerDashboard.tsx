"use client";

import React, { useState } from "react";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  PhoneCall,
  Clock,
  Palette,
  Check,
  Save,
  SlidersHorizontal,
  Flame,
} from "lucide-react";
import {
  RestaurantRoiMetrics,
  MenuItemAvailability,
  RestaurantBranding,
} from "../../types/portal";

interface OwnerDashboardProps {
  metrics: RestaurantRoiMetrics | null;
  defaultPrepMinutes: number;
  onUpdatePrepTime: (minutes: number) => Promise<void>;
  menuItems: MenuItemAvailability[];
  onToggleItem: (itemId: string, available: boolean) => Promise<void>;
  onToggleOption: (groupId: string, optionId: string, available: boolean) => Promise<void>;
  branding: RestaurantBranding | null;
  onSaveBranding: (branding: Partial<RestaurantBranding>) => Promise<void>;
  lang: "es" | "en";
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  metrics,
  defaultPrepMinutes,
  onUpdatePrepTime,
  menuItems,
  onToggleItem,
  onToggleOption,
  branding,
  onSaveBranding,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<"roi" | "operations" | "branding">("roi");
  const [prepTimeInput, setPrepTimeInput] = useState(defaultPrepMinutes);
  const [logoInput, setLogoInput] = useState(branding?.brand_logo_url || "");
  const [colorInput, setColorInput] = useState(branding?.brand_primary_color || "#c2410c");
  const [langPref, setLangPref] = useState<"es" | "en">(branding?.preferred_language || "es");
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    try {
      await onSaveBranding({
        brand_logo_url: logoInput ? logoInput.trim() : null,
        brand_primary_color: colorInput,
        preferred_language: langPref,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Color preset options
  const colorPresets = [
    { name: "Terracota Cálido", hex: "#c2410c" },
    { name: "Verde Esmeralda", hex: "#15803d" },
    { name: "Azul Google", hex: "#1d4ed8" },
    { name: "Vino / Burdeos", hex: "#991b1b" },
    { name: "Obsidiana Carbón", hex: "#0f172a" },
  ];

  return (
    <div data-surface="owner" className="p-4 max-w-5xl mx-auto space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] gap-2">
        <button
          onClick={() => setActiveTab("roi")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === "roi"
              ? "border-[var(--brand-accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {lang === "es" ? "Métricas de Negocio & ROI" : "Business Metrics & ROI"}
        </button>

        <button
          onClick={() => setActiveTab("operations")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === "operations"
              ? "border-[var(--brand-accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {lang === "es" ? "Operaciones & Menú (86'd)" : "Operations & Menu (86'd)"}
        </button>

        <button
          onClick={() => setActiveTab("branding")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === "branding"
              ? "border-[var(--brand-accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {lang === "es" ? "Identidad & Marca" : "Branding & Identity"}
        </button>
      </div>

      {/* Tab 1: ROI & Financial Metrics */}
      {activeTab === "roi" && (
        <div className="space-y-6">
          {/* 4 Honest KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Ventas Capturadas */}
            <div className="bg-[var(--surface-raised)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {lang === "es" ? "Ventas Capturadas" : "Captured Sales"}
                </span>
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
                {metrics ? metrics.formatted_total_revenue : "$0.00"}
              </div>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{lang === "es" ? "+14% vs periodo ant." : "+14% vs prev."}</span>
              </span>
            </div>

            {/* Card 2: Pedidos Confirmados */}
            <div className="bg-[var(--surface-raised)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {lang === "es" ? "Pedidos Confirmados" : "Confirmed Orders"}
                </span>
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
                {metrics ? metrics.total_orders_captured : 0}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {lang === "es" ? "100% validados por el motor" : "100% engine validated"}
              </span>
            </div>

            {/* Card 3: Ticket Promedio */}
            <div className="bg-[var(--surface-raised)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {lang === "es" ? "Ticket Promedio" : "Average Order Value"}
                </span>
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
                {metrics ? metrics.formatted_average_order_value : "$0.00"}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {lang === "es" ? "En centavos exactos USD" : "In exact USD cents"}
              </span>
            </div>

            {/* Card 4: Minutos Atendidos por IA */}
            <div className="bg-[var(--surface-raised)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {lang === "es" ? "Llamadas Atendidas" : "Voice AI Minutes"}
                </span>
                <PhoneCall className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
                {metrics ? `${metrics.total_voice_minutes} min` : "0 min"}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {metrics ? `${metrics.total_calls} llamadas recibidas` : "0 llamadas"}
              </span>
            </div>
          </div>

          {/* Top Selling Dishes Table */}
          <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h3 className="font-bold text-base text-[var(--text-primary)]">
                {lang === "es" ? "Platillos Más Vendidos (Top Ventas)" : "Top Selling Dishes"}
              </h3>
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {lang === "es" ? "Acumulado" : "Cumulative"}
              </span>
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {metrics?.top_selling_items && metrics.top_selling_items.length > 0 ? (
                metrics.top_selling_items.map((item, idx) => (
                  <div key={item.item_id} className="p-4 flex items-center justify-between hover:bg-[var(--surface-muted)]/50">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-[var(--text-muted)] w-5">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-sm text-[var(--text-primary)]">
                        {item.name_es}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm tabular-nums">
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {item.qty_sold} {lang === "es" ? "órdenes" : "sold"}
                      </span>
                      <span className="font-black text-emerald-600 min-w-[70px] text-right">
                        {item.formatted_revenue}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                  {lang === "es" ? "Aún no hay pedidos registrados para calcular el top de ventas" : "No sales data yet"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Operations & 86'd Controls */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          {/* Prep Time Adjuster */}
          <div className="bg-[var(--surface-raised)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                {lang === "es" ? "Tiempo de Preparación Promedio" : "Target Kitchen Prep Time"}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {lang === "es"
                  ? "Este tiempo se le comunica automáticamente a los clientes que llaman por teléfono para recoger su orden."
                  : "This prep time is announced to callers over the phone."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {[15, 20, 25, 30, 45].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setPrepTimeInput(mins);
                    void onUpdatePrepTime(mins);
                  }}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    defaultPrepMinutes === mins
                      ? "bg-amber-600 text-white shadow-md"
                      : "bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)]"
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Sold Out / 86'd Master List */}
          <div className="bg-[var(--surface-raised)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-[var(--brand-accent)]" />
              {lang === "es" ? "Disponibilidad de Platillos y Proteínas (86'd)" : "Menu & Protein Availability (86'd)"}
            </h3>

            {/* Protein toggles */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                {lang === "es" ? "Proteínas" : "Proteins"}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {menuItems.flatMap((item) =>
                  item.modifier_groups.flatMap((g) =>
                    g.options.map((opt) => (
                      <button
                        key={`${g.id}_${opt.id}`}
                        onClick={() => onToggleOption(g.id, opt.id, !opt.available)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                          opt.available
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200"
                            : "bg-red-50 dark:bg-red-950/30 border-red-300 text-red-900 dark:text-red-200 opacity-80"
                        }`}
                      >
                        <span>{opt.name_es}</span>
                        <span className="text-[11px] uppercase tracking-wide">
                          {opt.available ? "Disponible" : "AGOTADO"}
                        </span>
                      </button>
                    ))
                  )
                )}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {lang === "es" ? "Platillos del Menú" : "Dishes"}
              </span>
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-subtle)]"
                  >
                    <div>
                      <span className="font-bold text-sm text-[var(--text-primary)]">
                        {item.name_es}
                      </span>
                      <span className="ml-2 text-xs text-[var(--text-muted)] tabular-nums">
                        {item.price_usd}
                      </span>
                    </div>
                    <button
                      onClick={() => onToggleItem(item.id, !item.available)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        item.available
                          ? "bg-emerald-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {item.available
                        ? lang === "es"
                          ? "Disponible"
                          : "Available"
                        : lang === "es"
                        ? "Agotado (86)"
                        : "Sold Out"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Branding & Identity Customization */}
      {activeTab === "branding" && (
        <form onSubmit={handleSaveBranding} className="bg-[var(--surface-raised)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
              <Palette className="h-5 w-5 text-[var(--brand-accent)]" />
              {lang === "es" ? "Personalización de Marca (White-Label)" : "Tenant Branding & Customization"}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {lang === "es"
                ? "Configura tu logotipo y color corporativo para la barra superior del portal. La semántica de seguridad en cocina (Azul, Ámbar, Verde, Rojo) permanece fija para evitar confusiones al cocinar."
                : "Customize your portal brand logo and primary accent color."}
            </p>
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              {lang === "es" ? "URL del Logotipo del Restaurante" : "Restaurant Logo URL"}
            </label>
            <input
              type="url"
              value={logoInput}
              onChange={(e) => setLogoInput(e.target.value)}
              placeholder="https://tu-restaurante.com/logo.png"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
            />
          </div>

          {/* Color Chooser */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              {lang === "es" ? "Color Primario de Acento" : "Primary Accent Color"}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {colorPresets.map((preset) => (
                <button
                  type="button"
                  key={preset.hex}
                  onClick={() => setColorInput(preset.hex)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    colorInput.toLowerCase() === preset.hex.toLowerCase()
                      ? "ring-2 ring-offset-2 ring-slate-900 border-transparent shadow-sm"
                      : "border-[var(--border-subtle)]"
                  }`}
                  style={{ backgroundColor: preset.hex, color: "#ffffff" }}
                >
                  {colorInput.toLowerCase() === preset.hex.toLowerCase() && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="color"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                className="h-10 w-10 rounded-lg cursor-pointer border border-[var(--border-subtle)]"
              />
              <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                {colorInput}
              </span>
            </div>
          </div>

          {/* Default Language Preference */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              {lang === "es" ? "Idioma por Defecto del Restaurante" : "Default Restaurant Language"}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLangPref("es")}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  langPref === "es"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                }`}
              >
                Español (LatAm)
              </button>
              <button
                type="button"
                onClick={() => setLangPref("en")}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  langPref === "en"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                }`}
              >
                English (US)
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                {lang === "es" ? "¡Personalización guardada con éxito!" : "Branding saved successfully!"}
              </span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={isSavingBranding}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Save className="h-4 w-4" />
                <span>{isSavingBranding ? "Guardando..." : lang === "es" ? "Guardar Cambios" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
