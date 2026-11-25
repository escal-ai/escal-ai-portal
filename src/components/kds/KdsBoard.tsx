"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  User,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { OrderTicket, OrderStatus, MenuItemAvailability } from "../../types/portal";

interface KdsBoardProps {
  orders: OrderTicket[];
  onUpdateStatus: (ticketId: string, status: OrderStatus) => Promise<void>;
  defaultPrepMinutes: number;
  menuItems: MenuItemAvailability[];
  onToggleItem: (itemId: string, available: boolean) => Promise<void>;
  onToggleOption: (groupId: string, optionId: string, available: boolean) => Promise<void>;
  lang: "es" | "en";
}

interface UndoAction {
  ticketId: string;
  previousStatus: OrderStatus;
  targetStatus: OrderStatus;
  timerId: NodeJS.Timeout;
}

export const KdsBoard: React.FC<KdsBoardProps> = ({
  orders,
  onUpdateStatus,
  defaultPrepMinutes,
  menuItems,
  onToggleItem,
  onToggleOption,
  lang,
}) => {
  const [undoState, setUndoState] = useState<UndoAction | null>(null);
  const [show86Drawer, setShow86Drawer] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  // Re-render timers every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvanceStatus = async (ticket: OrderTicket) => {
    let nextStatus: OrderStatus | null = null;
    if (ticket.status === "confirmed") nextStatus = "in_kitchen";
    else if (ticket.status === "in_kitchen") nextStatus = "ready_for_pickup";
    else if (ticket.status === "ready_for_pickup") nextStatus = "completed";

    if (!nextStatus) return;

    const previousStatus = ticket.status;
    await onUpdateStatus(ticket.ticket_id, nextStatus);

    // Setup 6-second Undo window
    if (undoState) clearTimeout(undoState.timerId);
    const timerId = setTimeout(() => {
      setUndoState(null);
    }, 6000);

    setUndoState({
      ticketId: ticket.ticket_id,
      previousStatus,
      targetStatus: nextStatus,
      timerId,
    });
  };

  const handleExecuteUndo = async () => {
    if (!undoState) return;
    clearTimeout(undoState.timerId);
    await onUpdateStatus(undoState.ticketId, undoState.previousStatus);
    setUndoState(null);
  };

  // Group active orders by column
  const newOrders = orders.filter((o) => o.status === "confirmed");
  const cookingOrders = orders.filter((o) => o.status === "in_kitchen");
  const readyOrders = orders.filter((o) => o.status === "ready_for_pickup");

  // Helper for elapsed time
  const getElapsedMinutes = (dateStr: string) => {
    const diffMs = currentTime - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  return (
    <div data-surface="kds" className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Bar for Kitchen: Quick 86'd button and column summaries */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-raised)] p-3 rounded-2xl border border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {lang === "es" ? "Pantalla de Cocina (KDS)" : "Kitchen Display System"}
          </span>
          <span className="text-xs text-[var(--text-muted)] font-medium">
            {lang === "es" ? `Meta preparación: ~${defaultPrepMinutes} min` : `Target prep: ~${defaultPrepMinutes} min`}
          </span>
        </div>

        <button
          onClick={() => setShow86Drawer(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4 text-amber-700" />
          <span>{lang === "es" ? "Agotados / 86'd" : "Sold Out (86'd)"}</span>
        </button>
      </div>

      {/* 3-Column KDS Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Column 1: Nuevas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-blue-50/80 dark:bg-blue-950/40 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              <span className="font-bold text-sm text-blue-900 dark:text-blue-200">
                {lang === "es" ? "Por Cocinar" : "New / To Cook"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-600 text-white">
              {newOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {newOrders.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] text-sm">
                {lang === "es" ? "Sin pedidos pendientes de cocinar" : "No pending orders to cook"}
              </div>
            ) : (
              newOrders.map((ticket) => (
                <OrderCard
                  key={ticket.ticket_id}
                  ticket={ticket}
                  elapsedMinutes={getElapsedMinutes(ticket.received_at)}
                  targetPrepMinutes={defaultPrepMinutes}
                  onAdvance={() => handleAdvanceStatus(ticket)}
                  actionLabel={lang === "es" ? "Comenzar Cocina" : "Start Cooking"}
                  actionColor="bg-amber-600 hover:bg-amber-700 text-white"
                  actionIcon={<Flame className="h-5 w-5 mr-2" />}
                  lang={lang}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: En Cocina */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-amber-50/80 dark:bg-amber-950/40 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              <span className="font-bold text-sm text-amber-900 dark:text-amber-200">
                {lang === "es" ? "En Preparación" : "In Preparation"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-600 text-white">
              {cookingOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {cookingOrders.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] text-sm">
                {lang === "es" ? "Línea de cocina despejada" : "Kitchen line is clear"}
              </div>
            ) : (
              cookingOrders.map((ticket) => (
                <OrderCard
                  key={ticket.ticket_id}
                  ticket={ticket}
                  elapsedMinutes={getElapsedMinutes(ticket.received_at)}
                  targetPrepMinutes={defaultPrepMinutes}
                  onAdvance={() => handleAdvanceStatus(ticket)}
                  actionLabel={lang === "es" ? "Listo para Recoger" : "Ready for Pickup"}
                  actionColor="bg-emerald-600 hover:bg-emerald-700 text-white"
                  actionIcon={<CheckCircle2 className="h-5 w-5 mr-2" />}
                  lang={lang}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Listas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                {lang === "es" ? "Listas para Entrega" : "Ready for Pickup"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {readyOrders.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] text-sm">
                {lang === "es" ? "Sin órdenes esperando al cliente" : "No orders waiting for customer"}
              </div>
            ) : (
              readyOrders.map((ticket) => (
                <OrderCard
                  key={ticket.ticket_id}
                  ticket={ticket}
                  elapsedMinutes={getElapsedMinutes(ticket.received_at)}
                  targetPrepMinutes={defaultPrepMinutes}
                  onAdvance={() => handleAdvanceStatus(ticket)}
                  actionLabel={lang === "es" ? "Entregar a Cliente" : "Hand to Customer"}
                  actionColor="bg-slate-700 hover:bg-slate-800 text-white"
                  actionIcon={<CheckCircle2 className="h-5 w-5 mr-2" />}
                  lang={lang}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 6-Second Undo Floating Toast */}
      {undoState && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 animate-slide-up">
          <span className="text-sm font-semibold">
            {lang === "es" ? "Estado de orden actualizado" : "Order status updated"}
          </span>
          <button
            onClick={handleExecuteUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{lang === "es" ? "Deshacer (6s)" : "Undo (6s)"}</span>
          </button>
        </div>
      )}

      {/* Quick 86'd Drawer / Sheet for Kitchen */}
      {show86Drawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">
                  {lang === "es" ? "Control Rápido de Agotados (86'd)" : "Quick Sold Out Control (86'd)"}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {lang === "es"
                    ? "Los ingredientes desactivados dejarán de ser ofrecidos por la IA de voz inmediatamente."
                    : "Disabled items will immediately be rejected by voice AI."}
                </p>
              </div>
              <button
                onClick={() => setShow86Drawer(false)}
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Meat / Protein Group Highlights */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  {lang === "es" ? "Proteínas / Carnes" : "Proteins & Meats"}
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

              {/* Menu Items */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  {lang === "es" ? "Platillos y Bebidas" : "Dishes & Drinks"}
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
                        <span className="ml-2 text-xs text-[var(--text-muted)]">
                          {item.price_usd}
                        </span>
                      </div>
                      <button
                        onClick={() => onToggleItem(item.id, !item.available)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          item.available
                            ? "bg-emerald-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {item.available
                          ? lang === "es"
                            ? "Activo"
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

            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] flex justify-end">
              <button
                onClick={() => setShow86Drawer(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--text-primary)] text-[var(--surface-raised)]"
              >
                {lang === "es" ? "Listo / Cerrar" : "Done / Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface OrderCardProps {
  ticket: OrderTicket;
  elapsedMinutes: number;
  targetPrepMinutes: number;
  onAdvance: () => void;
  actionLabel: string;
  actionColor: string;
  actionIcon: React.ReactNode;
  lang: "es" | "en";
}

const OrderCard: React.FC<OrderCardProps> = ({
  ticket,
  elapsedMinutes,
  targetPrepMinutes,
  onAdvance,
  actionLabel,
  actionColor,
  actionIcon,
  lang,
}) => {
  // Safe short number from UUID
  const shortNumber = ticket.ticket_id.slice(-4).toUpperCase();

  // Non-blinking, WCAG 2.3.1 compliant delay detection
  const isDelayed = elapsedMinutes > targetPrepMinutes;
  const isWarning = elapsedMinutes >= targetPrepMinutes * 0.75 && !isDelayed;

  const timerColor = isDelayed
    ? "bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-200 border-red-300 dark:border-red-700"
    : isWarning
    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  return (
    <div
      className={`rounded-2xl bg-[var(--surface-raised)] border-2 shadow-sm overflow-hidden flex flex-col justify-between transition-shadow ${
        isDelayed
          ? "border-red-400 dark:border-red-600 ring-2 ring-red-400/20"
          : "border-[var(--border-subtle)]"
      }`}
    >
      {/* 1. Persistent Medical Allergy Banner (Required by Legal Invariant) */}
      {ticket.safety_and_escalation.allergy_flag && (
        <div className="bg-red-700 text-white px-3.5 py-2 font-black text-xs uppercase tracking-wide flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-white" />
          <span>
            {lang === "es"
              ? `ALERGIA DETECTADA: ${ticket.safety_and_escalation.allergy_details || "Personalizar con cuidado"} — NO GARANTIZAR LIBRE DE ALÉRGENOS`
              : `ALLERGY ALERT: ${ticket.safety_and_escalation.allergy_details || "Custom request"} — NEVER GUARANTEE ALLERGEN-FREE`}
          </span>
        </div>
      )}

      {/* 1b. Pre-Paid Online Banner (Prevents double-charging at pickup counter) */}
      {ticket.payment?.status === "paid" && (
        <div className="bg-emerald-700 text-white px-3.5 py-2 font-black text-xs uppercase tracking-wide flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          <span>
            {lang === "es"
              ? "PAGADO ONLINE — NO COBRAR"
              : "PAID ONLINE — DO NOT CHARGE"}
          </span>
        </div>
      )}

      {/* 2. Order Header: Short #, Customer, Elapsed Timer */}
      <div className="p-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 bg-[var(--surface-canvas)]/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-xl text-[var(--text-primary)]">
              #{shortNumber}
            </span>
            <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
              <User className="h-3 w-3" />
              {ticket.customer.name || (lang === "es" ? "Cliente" : "Customer")}
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] font-medium">
            {ticket.customer.requested_pickup_time}
          </span>
        </div>

        {/* Elapsed Timer Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border tabular-nums ${timerColor}`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{elapsedMinutes} min</span>
          {isDelayed && (
            <span className="ml-1 text-[10px] uppercase tracking-wider font-extrabold text-red-700 dark:text-red-300">
              {lang === "es" ? "Demorado" : "Delayed"}
            </span>
          )}
        </div>
      </div>

      {/* 3. Items List with Large Legible Quantities */}
      <div className="p-3.5 space-y-3 flex-1">
        {ticket.items.map((line) => (
          <div key={line.line_id} className="flex items-start gap-3">
            <span className="font-black text-2xl tabular-nums text-slate-900 dark:text-white shrink-0 leading-none pt-0.5">
              {line.qty}x
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-base text-[var(--text-primary)] block leading-snug">
                {line.name_es}
              </span>
              {line.modifiers.length > 0 && (
                <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5 pl-2 border-l-2 border-amber-500">
                  {line.modifiers.map((m) => m.name_es).join(", ")}
                </div>
              )}
              {line.special_instructions && (
                <div className="mt-1 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md inline-block">
                  ⚠️ {line.special_instructions}
                </div>
              )}
            </div>
          </div>
        ))}

        {ticket.customer.fulfillment_notes && (
          <div className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--surface-muted)] p-2 rounded-lg">
            📝 {ticket.customer.fulfillment_notes}
          </div>
        )}
      </div>

      {/* 4. Large 56px Kitchen-Proof Single-Tap Button */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-canvas)]/30">
        <button
          onClick={onAdvance}
          className={`w-full min-h-[56px] rounded-xl font-black text-base flex items-center justify-center shadow-md active:scale-[0.98] transition-transform ${actionColor}`}
        >
          {actionIcon}
          <span>{actionLabel}</span>
        </button>
      </div>
    </div>
  );
};
