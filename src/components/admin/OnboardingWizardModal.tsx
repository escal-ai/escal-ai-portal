"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Phone,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { fetchTelnyxInventory, onboardRestaurant } from "@/lib/api-client";
import { TelnyxInventoryItem, TenantOnboardingData, WelcomeKit } from "@/types/portal";

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onRestaurantCreated?: (restaurantId: string, name: string) => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  token,
  onRestaurantCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedWelcome, setCopiedWelcome] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Los Angeles");
  const [zip, setZip] = useState("90033");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [failoverPhone, setFailoverPhone] = useState("");
  const [kitchenPin, setKitchenPin] = useState("1234");
  const [taxRateBps, setTaxRateBps] = useState(950);
  const [menuTemplate, setMenuTemplate] = useState<"tacos_birria" | "pupuseria">("tacos_birria");

  // Telephony Inventory State
  const [inventory, setInventory] = useState<TelnyxInventoryItem[]>([]);
  const [selectedDid, setSelectedDid] = useState("");
  const [selectedNumberId, setSelectedNumberId] = useState<string | undefined>(undefined);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Welcome Kit Result
  const [welcomeKit, setWelcomeKit] = useState<WelcomeKit | null>(null);

  // Auto-slugify restaurant ID
  const handleNameChange = (name: string) => {
    setDisplayName(name);
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    setRestaurantId(`rst_${slug}`.slice(0, 32));
  };

  // Anti-Loop validation
  const cleanPrimary = primaryPhone.replace(/\D/g, "");
  const cleanFailover = failoverPhone.replace(/\D/g, "");
  const cleanDid = selectedDid.replace(/\D/g, "");

  const isAntiLoopViolation =
    Boolean(cleanFailover) &&
    (cleanFailover === cleanPrimary || cleanFailover === cleanDid);

  async function loadInventory() {
    setIsLoadingInventory(true);
    setError(null);
    try {
      const data = await fetchTelnyxInventory(token);
      setInventory(data.inventory);
      const firstAvailable = data.inventory.find((i) => !i.is_assigned);
      if (firstAvailable && !selectedDid) {
        setSelectedDid(firstAvailable.phone_number_e164);
        setSelectedNumberId(firstAvailable.id);
      }
    } catch (err: unknown) {
      console.warn("Could not fetch inventory:", err);
      // Fallback default
      if (!selectedDid) setSelectedDid("+12137760006");
    } finally {
      setIsLoadingInventory(false);
    }
  }

  // Load Inventory when opening Step 2
  useEffect(() => {
    if (!isOpen || step !== 2) return;
    // One-shot load triggered by opening the step; no state feedback loop here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInventory();
  }, [isOpen, step]);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!displayName || !restaurantId || !street || !primaryPhone || !kitchenPin) {
      setError("Por favor completa todos los campos requeridos.");
      return;
    }
    if (kitchenPin.length !== 4 || !/^\d{4}$/.test(kitchenPin)) {
      setError("El PIN de cocina debe ser exactamente de 4 dígitos numéricos.");
      return;
    }
    if (cleanPrimary.length < 10) {
      setError("El teléfono del local debe tener al menos 10 dígitos con código de área.");
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedDid) {
      setError("Selecciona o ingresa un número de teléfono para la IA.");
      return;
    }
    if (isAntiLoopViolation) {
      setError("Anti-bucle de seguridad: El teléfono de respaldo no puede coincidir con la línea del restaurante ni con el número de la IA.");
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload: TenantOnboardingData = {
      restaurant_id: restaurantId,
      display_name: displayName,
      primary_phone_e164: primaryPhone.startsWith("+") ? primaryPhone : `+1${cleanPrimary}`,
      assigned_did_e164: selectedDid.startsWith("+") ? selectedDid : `+1${cleanDid}`,
      telnyx_number_id: selectedNumberId,
      failover_mode: failoverPhone ? "forward" : "message",
      failover_phone_e164: failoverPhone ? (failoverPhone.startsWith("+") ? failoverPhone : `+1${cleanFailover}`) : null,
      owner_whatsapp_e164: failoverPhone ? (failoverPhone.startsWith("+") ? failoverPhone : `+1${cleanFailover}`) : null,
      kitchen_pin: kitchenPin,
      address: {
        street,
        city,
        state: "CA",
        zip,
      },
      tax_rate_bps: taxRateBps,
      menu_template: menuTemplate,
    };

    try {
      const res = await onboardRestaurant(token, payload);
      setWelcomeKit(res.welcome_kit);
      setStep(4);
      onRestaurantCreated?.(res.restaurant.restaurant_id, res.restaurant.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear el restaurante");
    } finally {
      setIsLoading(false);
    }
  };

  const copyWelcomeKit = () => {
    if (!welcomeKit) return;
    navigator.clipboard.writeText(welcomeKit.whatsapp_message_text);
    setCopiedWelcome(true);
    setTimeout(() => setCopiedWelcome(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-card)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-bold text-lg text-[var(--text-primary)]">
              {step === 4 ? "¡Restaurante Activado con Éxito!" : "Alta de Nuevo Restaurante (Wizard)"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        {step < 4 && (
          <div className="px-6 py-3 bg-[var(--surface-muted)] border-b border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold">
            <span className={step === 1 ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]"}>
              1. Datos del Negocio
            </span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className={step === 2 ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]"}>
              2. Línea Telefónica Telnyx
            </span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className={step === 3 ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]"}>
              3. Menú y Activación
            </span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: BUSINESS & ANTI-LOOP INFO */}
          {step === 1 && (
            <form id="wizard-step-1" onSubmit={handleNextStep1} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Nombre Comercial del Restaurante *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej. Birriería y Taquería Don Pepe"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Identificador (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    value={restaurantId}
                    onChange={(e) => setRestaurantId(e.target.value)}
                    placeholder="rst_don_pepe"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    PIN de Cocina (4 Dígitos) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={kitchenPin}
                    onChange={(e) => setKitchenPin(e.target.value)}
                    placeholder="1234"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-mono text-center tracking-widest text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Dirección en California (US-CA) *
                </label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="1234 Whittier Blvd"
                  className="w-full mt-1 px-4 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)]">Ciudad</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)]">Estado</label>
                  <input
                    type="text"
                    disabled
                    value="CA"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-xs text-center font-bold text-[var(--text-muted)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)]">ZIP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="90022"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Teléfono Fijo Actual del Restaurante (Origen *72) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    placeholder="+1 (323) 555-0188"
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Este es el número físico de donde el dueño marcará *72 para desviar sus llamadas.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Celular Personal del Gerente (Para Failover y ROI de WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={failoverPhone}
                    onChange={(e) => setFailoverPhone(e.target.value)}
                    placeholder="+1 (213) 555-0299"
                    className={`w-full mt-1 px-4 py-2.5 rounded-xl border text-sm font-mono text-[var(--text-primary)] focus:outline-none ${
                      isAntiLoopViolation
                        ? "border-red-500 bg-red-50/20 text-red-900"
                        : "border-[var(--border-default)] bg-[var(--surface-canvas)] focus:ring-2 focus:ring-amber-500"
                    }`}
                  />
                  {isAntiLoopViolation && (
                    <p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Anti-Bucle: No puede coincidir con el teléfono fijo del restaurante.
                    </p>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* STEP 2: TELNYX PHONE SELECTION */}
          {step === 2 && (
            <form id="wizard-step-2" onSubmit={handleNextStep2} className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  Asignación de Línea Telefónica Telnyx
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Selecciona un número disponible de tu cuenta de Telnyx o ingresa un DID activo. El sistema lo vinculará automáticamente al SIP Trunk de Retell y configurará el Failover.
                </p>
              </div>

              {isLoadingInventory ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  Consultando inventario en vivo en Telnyx...
                </div>
              ) : inventory.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Números en tu Cuenta de Telnyx
                  </span>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {inventory.map((item) => {
                      const isSelected = selectedDid === item.phone_number_e164;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (!item.is_assigned) {
                              setSelectedDid(item.phone_number_e164);
                              setSelectedNumberId(item.id);
                            }
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                            item.is_assigned
                              ? "opacity-50 bg-[var(--surface-muted)] border-[var(--border-subtle)] cursor-not-allowed"
                              : isSelected
                              ? "border-emerald-600 bg-emerald-50/20 ring-1 ring-emerald-600 cursor-pointer"
                              : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-emerald-400 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <PhoneCall className={`h-4 w-4 ${isSelected ? "text-emerald-600" : "text-[var(--text-muted)]"}`} />
                            <span className="font-mono font-bold text-sm">{item.phone_number_e164}</span>
                          </div>
                          <div>
                            {item.is_assigned ? (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                                Asignado a: {item.assigned_restaurant_name || "Otro"}
                              </span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                Libre para Asignar
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  No se detectaron números Telnyx vía API. Puedes escribir manualmente el número asignado:
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Número DID Seleccionado *
                </label>
                <input
                  type="tel"
                  required
                  value={selectedDid}
                  onChange={(e) => setSelectedDid(e.target.value)}
                  placeholder="+1 (213) 776-0006"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-mono text-[var(--text-primary)]"
                />
              </div>

              {/* Failover Mode Option */}
              <div className="p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-2">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Blindaje de Failover Multi-Cloud
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  Si la IA no responde en 5 segundos, la red de Telnyx desviará la llamada a{" "}
                  <strong className="text-[var(--text-primary)]">{failoverPhone || "Mensaje de Contingencia"}</strong> sin que el cliente note ninguna caída.
                </p>
              </div>
            </form>
          )}

          {/* STEP 3: MENU TEMPLATE & CA TAX */}
          {step === 3 && (
            <form id="wizard-step-3" onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                  Menú Determinista y Cumplimiento Legal (US-CA)
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Selecciona la plantilla inicial de platillos. Todos los cálculos se efectúan determinísticamente en centavos enteros con desglose de impuestos de California.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setMenuTemplate("tacos_birria")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    menuTemplate === "tacos_birria"
                      ? "border-amber-500 bg-amber-50/20 ring-1 ring-amber-500"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-default)]"
                  }`}
                >
                  <p className="font-bold text-sm text-[var(--text-primary)]">🌮 Taquería & Birriería</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Tacos de Asada, Pastor, Quesabirrias con consomé, Mulitas, Burritos y Bebidas mexicanas.
                  </p>
                </div>

                <div
                  onClick={() => setMenuTemplate("pupuseria")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    menuTemplate === "pupuseria"
                      ? "border-amber-500 bg-amber-50/20 ring-1 ring-amber-500"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-default)]"
                  }`}
                >
                  <p className="font-bold text-sm text-[var(--text-primary)]">🫓 Pupusería & Antojitos</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Pupusas revueltas, queso con loroco, tamales de elote, plátanos fritos y horchata morro.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Impuesto sobre las Ventas de California (% Sales Tax)
                </label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="number"
                    min={725}
                    max={1200}
                    value={taxRateBps}
                    onChange={(e) => setTaxRateBps(parseInt(e.target.value, 10) || 950)}
                    className="w-32 px-4 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-mono text-[var(--text-primary)]"
                  />
                  <span className="text-xs text-[var(--text-muted)]">
                    = {(taxRateBps / 100).toFixed(2)}% (Ej. 950 bps = 9.50% Los Ángeles County)
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-1">
                <span className="font-bold">🛡️ Blindaje Legal Pre-activado:</span>
                <p className="text-[11px] leading-relaxed">
                  Aviso CIPA de grabación de IA bilingüe, escalamiento inmediato a humano en mención de alérgenos y cálculo determinista con precios en centavos enteros.
                </p>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS & WELCOME KIT */}
          {step === 4 && welcomeKit && (
            <div className="space-y-6 animate-in zoom-in-95">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-1">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-base">¡Restaurante Dado de Alta con Éxito!</h3>
                <p className="text-xs text-emerald-800">
                  {welcomeKit.display_name} ya está creado en la base de datos y configurado con su Failover.
                </p>
              </div>

              {/* Welcome Kit Card */}
              <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Ficha de Activación Rápida
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Listo para Enviar
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[var(--surface-muted)]">
                    <span className="text-[11px] text-[var(--text-muted)]">Línea IA de Retell:</span>
                    <p className="font-mono font-bold text-sm text-[var(--text-primary)]">
                      {welcomeKit.assigned_did_e164}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--surface-muted)]">
                    <span className="text-[11px] text-[var(--text-muted)]">PIN de Cocina KDS:</span>
                    <p className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                      {welcomeKit.kitchen_pin}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <span className="font-bold">Instrucción para el Dueño del Local (*72):</span>
                  <p className="font-mono text-xs">
                    Marcar <strong>{welcomeKit.forwarding_activation_code}</strong> desde el teléfono fijo del restaurante para desviar las llamadas a la IA.
                  </p>
                </div>

                {/* Preformatted WhatsApp Message Box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Texto del Mensaje de WhatsApp:
                  </label>
                  <textarea
                    readOnly
                    rows={7}
                    value={welcomeKit.whatsapp_message_text}
                    className="w-full p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs font-mono text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={copyWelcomeKit}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-all"
                >
                  {copiedWelcome ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>¡Copiado al Portapapeles!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copiar Ficha para WhatsApp</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-6 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  Finalizar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {step < 4 && (
          <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                ← Volver
              </button>
            ) : (
              <div />
            )}

            <div>
              {step === 1 && (
                <button
                  type="submit"
                  form="wizard-step-1"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Continuar a Telefonía →
                </button>
              )}
              {step === 2 && (
                <button
                  type="submit"
                  form="wizard-step-2"
                  disabled={isAntiLoopViolation || !selectedDid}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Continuar a Menú →
                </button>
              )}
              {step === 3 && (
                <button
                  type="submit"
                  form="wizard-step-3"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isLoading ? "Aprovisionando..." : "⚡ Activar Restaurante"}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
