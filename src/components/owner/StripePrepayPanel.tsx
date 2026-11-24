"use client";

import React, { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  Check,
  Clock,
} from "lucide-react";
import { OrderTicket, StripePrepayConfig } from "../../types/portal";

interface StripePrepayPanelProps {
  stripeConfig: StripePrepayConfig | null;
  orders: OrderTicket[];
  onSaveConfig: (config: {
    prepay_enabled: boolean;
    prepay_threshold_cents: number;
    prepay_expiry_minutes: number;
  }) => Promise<void>;
  onConnectStripe: () => Promise<void>;
  lang: "es" | "en";
}

const THRESHOLD_OPTIONS = [
  { cents: 4000, label: "$40.00" },
  { cents: 5000, label: "$50.00" },
  { cents: 6000, label: "$60.00" },
  { cents: 7500, label: "$75.00" },
  { cents: 10000, label: "$100.00" },
];

const EXPIRY_OPTIONS = [15, 20, 30];

export const StripePrepayPanel: React.FC<StripePrepayPanelProps> = ({
  stripeConfig,
  orders,
  onSaveConfig,
  onConnectStripe,
  lang,
}) => {
  const [prepayEnabled, setPrepayEnabled] = useState(
    stripeConfig?.prepay_enabled ?? false
  );
  const [thresholdCents, setThresholdCents] = useState(
    stripeConfig?.prepay_threshold_cents ?? 5000
  );
  const [expiryMinutes, setExpiryMinutes] = useState(
    stripeConfig?.prepay_expiry_minutes ?? 15
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConnected = Boolean(
    stripeConfig?.stripe_connected && stripeConfig?.stripe_charges_enabled
  );

  const awaitingCount = orders.filter(
    (o) => o.status === "awaiting_payment"
  ).length;
  const expiredCount = orders.filter(
    (o) => o.payment?.status === "payment_expired"
  ).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSaveConfig({
        prepay_enabled: prepayEnabled,
        prepay_threshold_cents: thresholdCents,
        prepay_expiry_minutes: expiryMinutes,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await onConnectStripe();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setIsConnecting(false);
    }
  };

  return (
    <div className="bg-[var(--surface-raised)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-sm space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[var(--brand-accent)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {lang === "es"
                ? "Pre-Pago en Pedidos Grandes (Stripe)"
                : "Pre-Payment for Large Orders (Stripe)"}
            </h3>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {lang === "es"
              ? "Los pagos van directo a tu cuenta bancaria vía Stripe Connect Standard. Si no conectas Stripe, los pedidos grandes se transfieren al mostrador."
              : "Payments go directly to your bank account via Stripe Connect Standard. Without Stripe, large orders transfer to counter staff."}
          </p>
        </div>

        {/* Icon + Text Status Signal (Never color-only) */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
            isConnected
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700"
              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
          }`}
        >
          {isConnected ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          )}
          <span>
            {isConnected
              ? lang === "es"
                ? "Conectado"
                : "Connected"
              : lang === "es"
              ? "Sin conectar"
              : "Not connected"}
          </span>
        </span>
      </div>

      {/* Discrete Awaiting / Expired Order Counters */}
      {(awaitingCount > 0 || expiredCount > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[var(--surface-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {lang === "es" ? "Esperando pago" : "Awaiting payment"}
            </span>
            <span className="text-sm font-black tabular-nums text-[var(--text-primary)]">
              {awaitingCount}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {lang === "es" ? "Expiradas sin pago" : "Expired unpaid"}
            </span>
            <span className="text-sm font-black tabular-nums text-[var(--text-primary)]">
              {expiredCount}
            </span>
          </div>
        </div>
      )}

      {/* OAuth Connect Button */}
      <div className="p-4 rounded-xl bg-[var(--surface-canvas)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-sm font-bold text-[var(--text-primary)]">
            {isConnected
              ? lang === "es"
                ? "Cuenta de Stripe vinculada"
                : "Stripe account linked"
              : lang === "es"
              ? "Conecta tu cuenta de Stripe"
              : "Connect your Stripe account"}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {lang === "es"
              ? "Compatible con Apple Pay, Google Pay y tarjetas en 1 clic."
              : "Supports Apple Pay, Google Pay, and 1-tap cards."}
          </div>
        </div>

        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white flex items-center gap-2 transition-colors disabled:opacity-60"
        >
          <ExternalLink className="h-4 w-4" />
          <span>
            {isConnecting
              ? lang === "es"
                ? "Abriendo Stripe..."
                : "Opening Stripe..."
              : isConnected
              ? lang === "es"
                ? "Reconectar Stripe"
                : "Reconnect Stripe"
              : lang === "es"
              ? "Conectar cuenta de Stripe"
              : "Connect Stripe Account"}
          </span>
        </button>
      </div>

      {/* Pre-Pay Configuration Form */}
      <form onSubmit={handleSave} className="space-y-5">
        <label className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--surface-canvas)] transition-colors">
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {lang === "es"
                ? "Activar enlace de pago previo por SMS"
                : "Enable SMS pre-payment link"}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {lang === "es"
                ? "Envía enlace seguro antes de pasar la orden a cocina."
                : "Sends secure link before sending the order to kitchen."}
            </div>
          </div>
          <input
            type="checkbox"
            checked={prepayEnabled}
            onChange={(e) => setPrepayEnabled(e.target.checked)}
            className="h-5 w-5 accent-[var(--brand-accent)]"
          />
        </label>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {lang === "es"
              ? "Umbral mínimo para pedir pre-pago"
              : "Minimum threshold for pre-payment"}
          </label>
          <div className="flex flex-wrap gap-2">
            {THRESHOLD_OPTIONS.map((opt) => (
              <button
                key={opt.cents}
                type="button"
                onClick={() => setThresholdCents(opt.cents)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border tabular-nums transition-colors ${
                  thresholdCents === opt.cents
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                    : "bg-[var(--surface-canvas)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {lang === "es"
                ? "Tiempo límite para completar el pago"
                : "Payment link expiration"}
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setExpiryMinutes(mins)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border tabular-nums transition-colors ${
                  expiryMinutes === mins
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                    : "bg-[var(--surface-canvas)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white flex items-center gap-2 transition-colors disabled:opacity-60"
        >
          {saveSuccess ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span>{lang === "es" ? "Guardado" : "Saved"}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>
                {isSaving
                  ? lang === "es"
                    ? "Guardando..."
                    : "Saving..."
                  : lang === "es"
                  ? "Guardar Configuración de Pre-Pago"
                  : "Save Pre-Pay Settings"}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
