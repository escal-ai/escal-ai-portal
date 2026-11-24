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
  Copy,
  Send,
  Unplug,
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
  onDisconnectStripe?: () => Promise<void>;
  onResendPaymentSms?: (ticketId: string) => Promise<void>;
  justConnectedBanner?: boolean;
  lang: "es" | "en";
}

const THRESHOLD_OPTIONS = [
  {
    cents: 0,
    labelEs: "Todos los pedidos ($0+)",
    labelEn: "All orders ($0+)",
  },
  { cents: 4000, labelEs: "$40.00+", labelEn: "$40.00+" },
  { cents: 5000, labelEs: "$50.00+", labelEn: "$50.00+" },
  { cents: 6000, labelEs: "$60.00+", labelEn: "$60.00+" },
  { cents: 7500, labelEs: "$75.00+", labelEn: "$75.00+" },
  { cents: 10000, labelEs: "$100.00+", labelEn: "$100.00+" },
];

const EXPIRY_OPTIONS = [15, 20, 30];

export const StripePrepayPanel: React.FC<StripePrepayPanelProps> = ({
  stripeConfig,
  orders,
  onSaveConfig,
  onConnectStripe,
  onDisconnectStripe,
  onResendPaymentSms,
  justConnectedBanner,
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
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [resendingTicketId, setResendingTicketId] = useState<string | null>(null);
  const [resentTicketId, setResentTicketId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLinked = Boolean(stripeConfig?.stripe_connected);
  const chargesReady = Boolean(
    stripeConfig?.stripe_connected && stripeConfig?.stripe_charges_enabled
  );

  const awaitingOrders = orders.filter((o) => o.status === "awaiting_payment");
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

  const handleDisconnect = async () => {
    if (!onDisconnectStripe) return;
    setIsDisconnecting(true);
    setErrorMsg(null);
    try {
      await onDisconnectStripe();
      setPrepayEnabled(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCopyShortLink = async (ticket: OrderTicket) => {
    const token = ticket.payment?.payment_short_token;
    if (!token) return;
    const url = `${window.location.origin}/p/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedTicketId(ticket.ticket_id);
    setTimeout(() => setCopiedTicketId(null), 2500);
  };

  const handleResendSms = async (ticketId: string) => {
    if (!onResendPaymentSms) return;
    setResendingTicketId(ticketId);
    setErrorMsg(null);
    try {
      await onResendPaymentSms(ticketId);
      setResentTicketId(ticketId);
      setTimeout(() => setResentTicketId(null), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setResendingTicketId(null);
    }
  };

  return (
    <div className="bg-[var(--surface-raised)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-sm space-y-6 max-w-2xl">
      {justConnectedBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <span>
            {lang === "es"
              ? "¡Cuenta de Stripe conectada con éxito! El pre-pago por SMS ya está activo."
              : "Stripe account connected! SMS pre-payment is now active."}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[var(--brand-accent)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {lang === "es"
                ? "Enlace de Pago Previo por SMS / WhatsApp (Stripe)"
                : "SMS / WhatsApp Pre-Payment Link (Stripe)"}
            </h3>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {lang === "es"
              ? "El pago entra directo a tu banco vía Stripe Connect Standard. Puedes exigirlo en todos los pedidos o solo a partir de cierto monto."
              : "Payments go directly to your bank via Stripe Connect Standard. Require it on all orders or above a threshold."}
          </p>
        </div>

        {/* Icon + Text Status Signal (Never color-only) */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
            chargesReady
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700"
              : isLinked
              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
          }`}
        >
          {chargesReady ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>
            {chargesReady
              ? lang === "es"
                ? "Conectado y Activo"
                : "Connected & Active"
              : isLinked
              ? lang === "es"
                ? "Conectado (Revisión pendiente en Stripe)"
                : "Connected (Pending Stripe verification)"
              : lang === "es"
              ? "Sin conectar"
              : "Not connected"}
          </span>
        </span>
      </div>

      {/* Warning if Stripe account is linked but charges_enabled is false */}
      {isLinked && !chargesReady && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {lang === "es"
              ? "Tu cuenta de Stripe está vinculada, pero Stripe aún requiere que completes tus datos bancarios o fiscales en su panel para habilitar cobros."
              : "Your Stripe account is linked, but Stripe requires you to complete bank/tax details in their dashboard to enable charges."}
          </span>
        </div>
      )}

      {/* OAuth Connect & Account Box */}
      <div className="p-4 rounded-xl bg-[var(--surface-canvas)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-sm font-bold text-[var(--text-primary)]">
            {isLinked
              ? lang === "es"
                ? `Cuenta vinculada: ${stripeConfig?.stripe_account_id_masked ?? "Stripe Standard"}`
                : `Linked account: ${stripeConfig?.stripe_account_id_masked ?? "Stripe Standard"}`
              : lang === "es"
              ? "Conecta tu cuenta de Stripe"
              : "Connect your Stripe account"}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {lang === "es"
              ? "Compatible con Apple Pay, Google Pay y tarjetas en 1 toque."
              : "Supports Apple Pay, Google Pay, and 1-tap cards."}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLinked && onDisconnectStripe && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-red-300 text-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5 transition-colors disabled:opacity-60"
            >
              <Unplug className="h-3.5 w-3.5" />
              <span>
                {isDisconnecting
                  ? "..."
                  : lang === "es"
                  ? "Desconectar"
                  : "Disconnect"}
              </span>
            </button>
          )}

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
                : isLinked
                ? lang === "es"
                  ? "Reconectar Stripe"
                  : "Reconnect Stripe"
                : lang === "es"
                ? "Conectar cuenta de Stripe"
                : "Connect Stripe Account"}
            </span>
          </button>
        </div>
      </div>

      {/* Pre-Pay Configuration Form */}
      <form onSubmit={handleSave} className="space-y-5">
        <label className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--surface-canvas)] transition-colors">
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {lang === "es"
                ? "Activar enlace de pago previo por SMS / WhatsApp"
                : "Enable SMS / WhatsApp pre-payment link"}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {lang === "es"
                ? "La orden no entra al KDS ni a la impresora de cocina hasta que Stripe confirme el pago."
                : "Orders do not enter KDS or kitchen printer until Stripe confirms payment."}
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
              ? "¿En qué pedidos enviar el enlace de pago?"
              : "When to require payment link?"}
          </label>
          <div className="flex flex-wrap gap-2">
            {THRESHOLD_OPTIONS.map((opt) => (
              <button
                key={opt.cents}
                type="button"
                onClick={() => setThresholdCents(opt.cents)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border tabular-nums transition-colors ${
                  thresholdCents === opt.cents
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                    : "bg-[var(--surface-canvas)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                {lang === "es" ? opt.labelEs : opt.labelEn}
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

      {/* Live Awaiting Payment Orders List with Copy Link & Resend SMS */}
      <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {lang === "es"
              ? `Órdenes Esperando Pago (${awaitingOrders.length})`
              : `Orders Awaiting Payment (${awaitingOrders.length})`}
          </span>
          {expiredCount > 0 && (
            <span className="text-xs text-[var(--text-muted)]">
              {lang === "es"
                ? `Expiradas hoy: ${expiredCount}`
                : `Expired today: ${expiredCount}`}
            </span>
          )}
        </div>

        {awaitingOrders.length === 0 ? (
          <div className="p-4 rounded-xl bg-[var(--surface-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
            {lang === "es"
              ? "No hay pedidos retenidos esperando pago en este momento."
              : "No orders waiting for payment right now."}
          </div>
        ) : (
          <div className="space-y-2">
            {awaitingOrders.map((ticket) => (
              <div
                key={ticket.ticket_id}
                className="p-3.5 rounded-xl bg-[var(--surface-canvas)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    #{ticket.ticket_id.slice(-4).toUpperCase()} —{" "}
                    {ticket.customer.name || (lang === "es" ? "Cliente" : "Customer")}{" "}
                    <span className="font-black tabular-nums">
                      ({ticket.totals.formatted_total})
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {ticket.customer.phone_masked}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ticket.payment?.payment_short_token && (
                    <button
                      type="button"
                      onClick={() => void handleCopyShortLink(ticket)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] flex items-center gap-1.5"
                    >
                      {copiedTicketId === ticket.ticket_id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{lang === "es" ? "Copiado" : "Copied"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>{lang === "es" ? "Copiar Link" : "Copy Link"}</span>
                        </>
                      )}
                    </button>
                  )}

                  {onResendPaymentSms && (
                    <button
                      type="button"
                      onClick={() => void handleResendSms(ticket.ticket_id)}
                      disabled={resendingTicketId === ticket.ticket_id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {resentTicketId === ticket.ticket_id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{lang === "es" ? "SMS Enviado" : "SMS Sent"}</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>
                            {resendingTicketId === ticket.ticket_id
                              ? "..."
                              : lang === "es"
                              ? "Reenviar SMS"
                              : "Resend SMS"}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
