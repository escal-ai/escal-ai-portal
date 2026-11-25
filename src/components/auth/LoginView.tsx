"use client";

import React, { useEffect, useState } from "react";
import {
  ChefHat,
  Crown,
  KeyRound,
  Lock,
  Mail,
  ArrowRight,
  Delete,
  Sparkles,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { ActiveSession } from "../../lib/auth-session";
import {
  fetchPublicTenants,
  loginWithKitchenPin,
  loginWithCredentials,
  resolveTenant,
} from "../../lib/api-client";
import { IS_DEMO } from "../../lib/app-env";

interface LoginViewProps {
  onLoginSuccess: (session: ActiveSession) => void;
  lang: "es" | "en";
  onLangChange: (lang: "es" | "en") => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  lang,
  onLangChange,
}) => {
  const [activeTab, setActiveTab] = useState<"kitchen" | "owner">("kitchen");

  // Tenants list from API
  const [tenants, setTenants] = useState<
    Array<{ restaurant_id: string; name: string; city: string; phone_e164: string }>
  >([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(
    "rst_birrieria_esquivel"
  );

  // Kitchen PIN state (4 digits)
  const [pinDigits, setPinDigits] = useState<string>("");

  // Owner credentials state
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Production deployments do not publish the tenant directory: a station finds
  // its own restaurant with a store code, remembered on the device afterwards.
  const [storeCode, setStoreCode] = useState<string>("");
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTenants() {
      const storedCode =
        typeof window !== "undefined"
          ? window.localStorage.getItem("escal_store_code") ?? ""
          : "";
      let list = await fetchPublicTenants(IS_DEMO ? undefined : storedCode);
      if (list.length === 0 && storedCode) {
        const resolved = await resolveTenant(storedCode);
        if (resolved.ok) list = [resolved.tenant];
      }
      if (list.length > 0) {
        setTenants(list);

        // Direct links (?restaurant=, ?pin=) are a SALES feature: a prospect opens
        // the demo straight from WhatsApp. In production the query string is
        // ignored so no PIN travels through URLs or chat logs.
        let matchedId: string | null = null;
        let queryPin: string | null = null;

        if (IS_DEMO && typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const paramRest =
            params.get("restaurant") ||
            params.get("restaurant_id") ||
            params.get("r") ||
            params.get("id") ||
            params.get("code") ||
            params.get("slug");

          if (paramRest) {
            const needle = paramRest.toLowerCase();
            const found = list.find(
              (t) =>
                t.restaurant_id.toLowerCase() === needle ||
                t.restaurant_id.toLowerCase().includes(needle) ||
                t.name.toLowerCase().includes(needle) ||
                (needle === "1002" && t.restaurant_id.includes("esquivel")) ||
                (needle === "1001" && t.restaurant_id.includes("estrella"))
            );
            if (found) {
              matchedId = found.restaurant_id;
            }
          }

          const rawPin = params.get("pin");
          if (rawPin && rawPin.length === 4 && /^\d{4}$/.test(rawPin)) {
            queryPin = rawPin;
          }
        }

        const effectiveId =
          matchedId ||
          (list.some((t) => t.restaurant_id === selectedRestaurantId)
            ? selectedRestaurantId
            : list[0].restaurant_id);
        setSelectedRestaurantId(effectiveId);

        if (queryPin) {
          setPinDigits(queryPin);
          void submitKitchenPin(queryPin, effectiveId);
        }
      }
    }
    void loadTenants();
  }, []);

  // Handlers for Kitchen Keypad
  const handleKeypadPress = (val: string) => {
    if (pinDigits.length < 4) {
      const nextPin = pinDigits + val;
      setPinDigits(nextPin);
      setErrorMessage(null);
      if (nextPin.length === 4) {
        // Auto-submit when 4th digit entered for lightning-fast kitchen flow
        void submitKitchenPin(nextPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinDigits((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleKeypadClear = () => {
    setPinDigits("");
    setErrorMessage(null);
  };

  async function submitKitchenPin(
    pinToVerify = pinDigits,
    targetRestaurantId = selectedRestaurantId
  ): Promise<void> {
    if (pinToVerify.length !== 4) {
      setErrorMessage(
        lang === "es"
          ? "El PIN debe tener 4 dígitos"
          : "PIN must be exactly 4 digits"
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await loginWithKitchenPin(
        targetRestaurantId,
        pinToVerify
      );
      onLoginSuccess({
        token: result.token,
        role: result.role,
        restaurant_id: result.restaurant.restaurant_id,
        restaurant_name: result.restaurant.name,
        available_restaurants: result.available_restaurants,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setPinDigits("");
    } finally {
      setIsLoading(false);
    }
  }

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(
        lang === "es"
          ? "Ingresa tu correo y contraseña"
          : "Please enter your email and password"
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await loginWithCredentials(
        email,
        password,
        selectedRestaurantId
      );
      onLoginSuccess({
        token: result.token,
        role: result.role,
        restaurant_id: result.restaurant.restaurant_id,
        restaurant_name: result.restaurant.name,
        user_id: result.user_id,
        available_restaurants: result.available_restaurants,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Demo shortcuts: kitchen PINs only. Owner credentials are never embedded in the
  // bundle — an owner logs in with the password they were given out of band.
  const fillEstrellaDemo = () => {
    setSelectedRestaurantId("rst_taqueria_estrella_la");
    setPinDigits("1234");
    void submitKitchenPin("1234");
  };

  const fillPulgarcitoDemo = () => {
    setSelectedRestaurantId("rst_pupuser_a_y_taquer_a_el_pulgarcito");
    setPinDigits("5678");
    void submitKitchenPin("5678");
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Brand Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-xl text-white shadow-md">
              EA
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight">
                Escal-AI Cloud Portal
              </h1>
              <p className="text-xs text-slate-400">
                {lang === "es"
                  ? "Acceso Multi-Tenant de Restaurante"
                  : "Restaurant Multi-Tenant Access"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onLangChange(lang === "es" ? "en" : "es")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {lang === "es" ? "EN" : "ES"}
          </button>
        </div>

        {/* Live demo callout: sales material, never shown on the production portal. */}
        {IS_DEMO && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-[var(--text-secondary)]">
              {lang === "es" ? "Prueba en vivo llamando al:" : "Live phone test:"}
            </span>
            <a
              href="tel:+12137760006"
              className="font-black text-amber-600 dark:text-amber-400 hover:underline tracking-tight"
            >
              +1 (213) 776-0006
            </a>
          </div>
          <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--surface-base)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
            PIN: 1234
          </span>
        </div>
        )}

        {/* Tab Switcher: Cocina KDS vs Dueño */}
        <div className="p-3 bg-[var(--surface-muted)] border-b border-[var(--border-subtle)] flex gap-2">
          <button
            onClick={() => {
              setActiveTab("kitchen");
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "kitchen"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ChefHat className="h-4 w-4 text-amber-600" />
            <span>{lang === "es" ? "Cocina KDS (PIN)" : "Kitchen KDS (PIN)"}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("owner");
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "owner"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Crown className="h-4 w-4 text-orange-600" />
            <span>
              {lang === "es" ? "Dueño / Administración" : "Owner / Admin"}
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          {/* Restaurant Selector Dropdown */}
          {/* Store code lookup (production only: the directory is not public) */}
          {tenants.length === 0 && (
            <div className="space-y-1.5">
              <label
                htmlFor="store-code"
                className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>{lang === "es" ? "Código de tienda" : "Store code"}</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="store-code"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  value={storeCode}
                  onChange={(e) => {
                    setStoreCode(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder={lang === "es" ? "ej. esquivel" : "e.g. esquivel"}
                  aria-describedby="store-code-help"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  disabled={isLookingUp || storeCode.trim().length === 0}
                  onClick={async () => {
                    setIsLookingUp(true);
                    const resolved = await resolveTenant(storeCode.trim());
                    if (resolved.ok) {
                      setTenants([resolved.tenant]);
                      setSelectedRestaurantId(resolved.tenant.restaurant_id);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(
                          "escal_store_code",
                          storeCode.trim()
                        );
                      }
                      setErrorMessage(null);
                    } else {
                      setErrorMessage(resolved.error);
                    }
                    setIsLookingUp(false);
                  }}
                  className="px-4 rounded-xl bg-orange-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  {lang === "es" ? "Buscar" : "Find"}
                </button>
              </div>
              <p
                id="store-code-help"
                className="text-[11px] text-[var(--text-muted)]"
              >
                {lang === "es"
                  ? "Escríbelo una sola vez; esta tablet lo recordará."
                  : "Enter it once; this tablet will remember it."}
              </p>
            </div>
          )}

          {tenants.length > 0 && (
          <div className="space-y-1.5">
            <label
              htmlFor="demo-restaurant-select"
              className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === "es" ? "Restaurante" : "Restaurant"}</span>
            </label>
            <select
              id="demo-restaurant-select"
              value={selectedRestaurantId}
              onChange={(e) => {
                setSelectedRestaurantId(e.target.value);
                setPinDigits("");
                setErrorMessage(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {tenants.map((t) => (
                <option key={t.restaurant_id} value={t.restaurant_id}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>
          </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-800 border border-red-200 text-xs font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: KITCHEN TABLET KDS (4-DIGIT TOUCH KEYPAD) */}
          {activeTab === "kitchen" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs text-[var(--text-muted)]">
                  {lang === "es"
                    ? "Ingresa el PIN de 4 dígitos de la estación de cocina"
                    : "Enter the 4-digit kitchen station PIN"}
                </span>
                {/* Visual PIN Dots */}
                <div className="flex justify-center gap-3 pt-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = pinDigits.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`h-4 w-4 rounded-full transition-all ${
                          isFilled
                            ? "bg-amber-500 scale-110 shadow-sm shadow-amber-500/50"
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Kitchen-Proof 56px Touch Keypad */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(String(digit))}
                    className="h-14 rounded-2xl bg-[var(--surface-muted)] hover:bg-[var(--border-subtle)] active:scale-95 text-lg font-black text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all flex items-center justify-center select-none"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-14 rounded-2xl bg-[var(--surface-muted)] hover:bg-red-50 text-xs font-bold text-red-600 border border-[var(--border-subtle)] active:scale-95 transition-all flex items-center justify-center select-none"
                >
                  {lang === "es" ? "Borrar" : "Clear"}
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("0")}
                  className="h-14 rounded-2xl bg-[var(--surface-muted)] hover:bg-[var(--border-subtle)] active:scale-95 text-lg font-black text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all flex items-center justify-center select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  aria-label={lang === "es" ? "Borrar último dígito" : "Delete last digit"}
                  className="h-14 rounded-2xl bg-[var(--surface-muted)] hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-[var(--text-secondary)] border border-[var(--border-subtle)] active:scale-95 transition-all flex items-center justify-center select-none"
                >
                  <Delete className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => submitKitchenPin()}
                disabled={isLoading || pinDigits.length !== 4}
                className="w-full mt-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>
                      {lang === "es" ? "Abrir KDS de Cocina" : "Open Kitchen KDS"}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: OWNER EMAIL & PASSWORD FORM */}
          {activeTab === "owner" && (
            <form onSubmit={handleOwnerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{lang === "es" ? "Correo Electrónico" : "Email"}</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dueño@restaurante.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  <span>{lang === "es" ? "Contraseña" : "Password"}</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {lang === "es"
                        ? "Ingresar al Panel de Dueño"
                        : "Sign In to Owner Portal"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Pre-fill Pills */}
          {IS_DEMO && (
          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>
                {lang === "es"
                  ? "Atajos de demostración rápida:"
                  : "Quick demo shortcuts:"}
              </span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={fillEstrellaDemo}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--surface-muted)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] transition-colors"
              >
                🌮 La Estrella (PIN: 1234)
              </button>
              <button
                type="button"
                onClick={fillPulgarcitoDemo}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--surface-muted)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] transition-colors"
              >
                🫓 El Pulgarcito (PIN: 5678)
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Footer Security Badge */}
        <div className="p-3 bg-[var(--surface-muted)] border-t border-[var(--border-subtle)] text-center flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>
            {lang === "es"
              ? "Cifrado HMAC-SHA256 & Aislamiento Multi-Tenant"
              : "HMAC-SHA256 Encrypted & Multi-Tenant Isolated"}
          </span>
        </div>
      </div>
    </div>
  );
};
