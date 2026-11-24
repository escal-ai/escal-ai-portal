"use client";

import React, { useEffect, useState, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { KdsBoard } from "../components/kds/KdsBoard";
import { OwnerDashboard } from "../components/owner/OwnerDashboard";
import { SupportCallLogs } from "../components/support/SupportCallLogs";
import { LoginView } from "../components/auth/LoginView";
import {
  ActiveSession,
  getStoredSession,
  saveSession,
  clearSession,
} from "../lib/auth-session";
import {
  PortalRole,
  OrderTicket,
  OrderStatus,
  MenuItemAvailability,
  RestaurantRoiMetrics,
  RestaurantBranding,
  FailoverConfig,
  StripePrepayConfig,
  CallLogEntry,
} from "../types/portal";
import {
  fetchOrders,
  updateOrderStatus,
  fetchMenu,
  setItemAvailability,
  setModifierOptionAvailability,
  updatePrepTime,
  fetchRoiMetrics,
  fetchCallLogs,
  fetchBranding,
  updateBranding,
  fetchFailoverConfig,
  updateFailoverConfig,
  fetchStripePrepayConfig,
  updateStripePrepayConfig,
  createStripeConnectUrl,
  disconnectStripeAccount,
  resendOrderPaymentSms,
  subscribeToKdsStream,
  switchRestaurantSession,
} from "../lib/api-client";
import { DEFAULT_RESTAURANT_ID, DEMO_TOKENS } from "../lib/constants";
import { chimeManager } from "../lib/sound-chime";

export default function PortalHomePage() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [role, setRole] = useState<PortalRole>("kitchen");
  const [lang, setLang] = useState<"es" | "en">("es");
  const [isDark, setIsDark] = useState<boolean>(false);

  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemAvailability[]>([]);
  const [defaultPrepMinutes, setDefaultPrepMinutes] = useState(20);
  const [metrics, setMetrics] = useState<RestaurantRoiMetrics | null>(null);
  const [branding, setBranding] = useState<RestaurantBranding | null>(null);
  const [failoverConfig, setFailoverConfig] = useState<FailoverConfig | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripePrepayConfig | null>(null);
  const [justConnectedStripe, setJustConnectedStripe] = useState<boolean>(false);
  const [publicOrderNotice, setPublicOrderNotice] = useState<{
    orderId: string;
    paymentState: string;
  } | null>(null);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(false);

  const previousOrdersCountRef = useRef<number>(0);

  // Active Session or Demo Fallback
  const currentToken = session?.token || DEMO_TOKENS[role];
  const currentRestaurantId = session?.restaurant_id || DEFAULT_RESTAURANT_ID;
  const currentRestaurantName =
    session?.restaurant_name || "Taquería y Birriería La Estrella";

  // 1. Initial Session & Language detection & Dark mode setup
  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setSession(stored);
      setRole(stored.role);
    }
    setIsAuthChecking(false);

    if (typeof window !== "undefined") {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("en")) {
        setLang("en");
      }
      const params = new URLSearchParams(window.location.search);
      const orderParam = params.get("order");
      const paymentParam = params.get("payment");
      if (orderParam && paymentParam) {
        setPublicOrderNotice({ orderId: orderParam, paymentState: paymentParam });
      }
      if (params.get("stripe_connected") === "true") {
        setJustConnectedStripe(true);
        setRole("owner");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light"
      );
      document.documentElement.setAttribute("data-surface", role);
    }
  }, [isDark, role]);

  // 2. Screen Wake Lock for Kitchen Tablets
  useEffect(() => {
    let wakeLock: unknown = null;
    if (
      role === "kitchen" &&
      typeof navigator !== "undefined" &&
      "wakeLock" in navigator
    ) {
      const reqLock = async () => {
        try {
          const nav = navigator as unknown as {
            wakeLock: { request: (type: string) => Promise<unknown> };
          };
          wakeLock = await nav.wakeLock.request("screen");
        } catch {
          // Wake lock may fail if low battery or permission rejected
        }
      };
      void reqLock();
    }
    return () => {
      if (wakeLock) {
        const lockObj = wakeLock as { release?: () => Promise<void> };
        void lockObj.release?.();
      }
    };
  }, [role]);

  // 3. Data Fetching & Polling Loop (Every 6 seconds)
  const refreshData = async () => {
    try {
      if (role === "kitchen" || role === "owner") {
        const fetchedOrders = await fetchOrders(
          currentRestaurantId,
          currentToken
        );

        // Chime on new incoming confirmed orders
        const newConfirmedCount = fetchedOrders.filter(
          (o) => o.status === "confirmed"
        ).length;
        if (
          previousOrdersCountRef.current !== 0 &&
          newConfirmedCount > previousOrdersCountRef.current
        ) {
          chimeManager.playNewOrderChime();
        }
        previousOrdersCountRef.current = newConfirmedCount;

        setOrders(fetchedOrders);

        const menuData = await fetchMenu(
          currentRestaurantId,
          currentToken
        );
        setMenuItems(menuData.items || []);
        setDefaultPrepMinutes(menuData.default_prep_minutes || 20);
      }

      if (role === "owner") {
        const fetchedMetrics = await fetchRoiMetrics(
          currentRestaurantId,
          currentToken
        );
        setMetrics(fetchedMetrics);

        const fetchedBranding = await fetchBranding(
          currentRestaurantId,
          currentToken
        );
        setBranding(fetchedBranding);

        const fetchedFailover = await fetchFailoverConfig(
          currentRestaurantId,
          currentToken
        );
        setFailoverConfig(fetchedFailover);

        const fetchedStripe = await fetchStripePrepayConfig(
          currentRestaurantId,
          currentToken
        ).catch(() => null);
        if (fetchedStripe) setStripeConfig(fetchedStripe);
      }

      if (role === "support_latam") {
        const fetchedCalls = await fetchCallLogs(
          currentRestaurantId,
          currentToken,
          50
        );
        setCallLogs(fetchedCalls);
      }

      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401")) {
        clearSession();
        setSession(null);
        setError(null);
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void refreshData();

    // 4. Real-time Server-Sent Events (SSE) Stream
    let unsubscribeStream: (() => void) | null = null;
    try {
      unsubscribeStream = subscribeToKdsStream(
        currentRestaurantId,
        currentToken,
        {
          onConnected: () => {
            setIsLiveStream(true);
            setError(null);
          },
          onInitialSnapshot: (initialOrders) => {
            setOrders(initialOrders);
            setLoading(false);
            setError(null);
          },
          onOrderCreated: (newOrder) => {
            setOrders((prev) => {
              const exists = prev.some((o) => o.ticket_id === newOrder.ticket_id);
              if (exists) return prev;
              chimeManager.playNewOrderChime();
              return [newOrder, ...prev];
            });
            setError(null);
          },
          onOrderUpdated: (updatedOrder) => {
            setOrders((prev) =>
              prev.map((o) =>
                o.ticket_id === updatedOrder.ticket_id ? updatedOrder : o
              )
            );
          },
          onMenuUpdated: (unavailableIds) => {
            setMenuItems((prev) =>
              prev.map((item) => ({
                ...item,
                available: !unavailableIds.includes(item.id),
              }))
            );
          },
          onError: () => {
            setIsLiveStream(false);
          },
        }
      );
    } catch {
      setIsLiveStream(false);
    }

    // Safety fallback polling loop (every 20s if SSE reconnects or for ROI metrics refresh)
    const interval = setInterval(() => {
      void refreshData();
    }, 20000);

    return () => {
      if (unsubscribeStream) unsubscribeStream();
      clearInterval(interval);
      setIsLiveStream(false);
    };
  }, [role, currentToken, currentRestaurantId]);

  // Handlers
  const handleLoginSuccess = (newSession: ActiveSession) => {
    saveSession(newSession);
    setSession(newSession);
    setRole(newSession.role);
    setOrders([]);
    setLoading(true);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setOrders([]);
  };

  const handleSwitchRestaurant = async (targetRestaurantId: string) => {
    if (!session) return;
    try {
      const switched = await switchRestaurantSession(
        session.token,
        targetRestaurantId
      );
      const updated: ActiveSession = {
        ...session,
        token: switched.token,
        restaurant_id: switched.restaurant.restaurant_id,
        restaurant_name: switched.restaurant.name,
      };
      saveSession(updated);
      setSession(updated);
      setOrders([]);
      setLoading(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUpdateStatus = async (
    ticketId: string,
    nextStatus: OrderStatus
  ) => {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.ticket_id === ticketId ? { ...o, status: nextStatus } : o))
    );

    try {
      await updateOrderStatus(
        currentRestaurantId,
        ticketId,
        nextStatus,
        currentToken
      );
      void refreshData();
    } catch (err) {
      void refreshData();
      alert(`Error al actualizar estado: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleToggleItem = async (itemId: string, available: boolean) => {
    setMenuItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, available } : i))
    );
    await setItemAvailability(
      currentRestaurantId,
      itemId,
      available,
      currentToken
    );
  };

  const handleToggleOption = async (
    groupId: string,
    optionId: string,
    available: boolean
  ) => {
    setMenuItems((prev) =>
      prev.map((item) => ({
        ...item,
        modifier_groups: item.modifier_groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                options: g.options.map((o) =>
                  o.id === optionId ? { ...o, available } : o
                ),
              }
            : g
        ),
      }))
    );
    await setModifierOptionAvailability(
      currentRestaurantId,
      groupId,
      optionId,
      available,
      currentToken
    );
  };

  const handleUpdatePrepTime = async (minutes: number) => {
    setDefaultPrepMinutes(minutes);
    await updatePrepTime(currentRestaurantId, minutes, currentToken);
  };

  const handleSaveBranding = async (newBranding: Partial<RestaurantBranding>) => {
    const updated = await updateBranding(
      currentRestaurantId,
      newBranding,
      currentToken
    );
    setBranding(updated);
  };

  const handleSaveFailover = async (config: {
    failover_mode: "forward_to_phone" | "contingency_message";
    failover_phone_e164: string | null;
  }) => {
    const updated = await updateFailoverConfig(
      currentRestaurantId,
      currentToken,
      config
    );
    setFailoverConfig(updated);
  };

  const handleSaveStripeConfig = async (config: {
    prepay_enabled: boolean;
    prepay_threshold_cents: number;
    prepay_expiry_minutes: number;
  }) => {
    const updated = await updateStripePrepayConfig(
      currentRestaurantId,
      currentToken,
      config
    );
    setStripeConfig((prev) => ({
      ...updated,
      stripe_connected: updated.stripe_connected ?? prev?.stripe_connected ?? false,
      stripe_charges_enabled:
        updated.stripe_charges_enabled ?? prev?.stripe_charges_enabled ?? false,
    }));
  };

  const handleConnectStripe = async () => {
    const connectUrl = await createStripeConnectUrl(
      currentRestaurantId,
      currentToken
    );
    window.location.href = connectUrl;
  };

  const handleDisconnectStripe = async () => {
    const updated = await disconnectStripeAccount(
      currentRestaurantId,
      currentToken
    );
    setStripeConfig(updated);
    setJustConnectedStripe(false);
  };

  const handleResendPaymentSms = async (ticketId: string) => {
    await resendOrderPaymentSms(currentRestaurantId, ticketId, currentToken);
  };

  const activeOrdersCount = orders.filter(
    (o) => o.status === "confirmed" || o.status === "in_kitchen"
  ).length;

  // Show public diner order payment status if redirected from Stripe Checkout
  if (!session && !isAuthChecking && publicOrderNotice) {
    const isPaidSuccess = publicOrderNotice.paymentState === "success";
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--surface-canvas)]">
        <div className="max-w-md w-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm space-y-4 text-center">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isPaidSuccess
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-amber-50 text-amber-900 border-amber-300"
            }`}
          >
            <span>
              {isPaidSuccess
                ? lang === "es"
                  ? "Pagado — En preparación en cocina"
                  : "Paid — Being prepared in kitchen"
                : lang === "es"
                ? "Pago cancelado o pendiente"
                : "Payment cancelled or pending"}
            </span>
          </div>
          <h1 className="text-lg font-black text-[var(--text-primary)]">
            {lang === "es"
              ? `Orden #${publicOrderNotice.orderId}`
              : `Order #${publicOrderNotice.orderId}`}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {isPaidSuccess
              ? lang === "es"
                ? "Recibimos tu pago correctamente. Tu orden ya pasó a cocina."
                : "We received your payment. Your order has been sent to the kitchen."
              : lang === "es"
              ? "Puedes volver a abrir el enlace de pago que te enviamos por SMS."
              : "You can reopen the payment link sent to you via SMS."}
          </p>
        </div>
      </div>
    );
  }

  // Show login screen if unauthenticated
  if (!session && !isAuthChecking) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        lang={lang}
        onLangChange={setLang}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        restaurantName={currentRestaurantName}
        branding={branding}
        currentRole={role}
        onRoleChange={setRole}
        lang={lang}
        onLangChange={setLang}
        isDark={isDark}
        onThemeToggle={() => setIsDark((d) => !d)}
        activeOrdersCount={activeOrdersCount}
        isLiveStream={isLiveStream}
        availableRestaurants={session?.available_restaurants}
        onSwitchRestaurant={handleSwitchRestaurant}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16">
        {loading && orders.length === 0 && callLogs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 border-4 border-[var(--brand-accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-[var(--text-muted)]">
              {lang === "es"
                ? "Sincronizando con el motor de voz de Escal-AI..."
                : "Syncing with Escal-AI voice engine..."}
            </span>
          </div>
        ) : error && orders.length === 0 ? (
          <div className="p-8 max-w-lg mx-auto text-center space-y-3">
            <div className="p-4 rounded-2xl bg-red-50 text-red-800 border border-red-200 text-sm font-semibold">
              {error}
            </div>
            <button
              onClick={() => void refreshData()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {role === "kitchen" && (
              <KdsBoard
                orders={orders}
                onUpdateStatus={handleUpdateStatus}
                defaultPrepMinutes={defaultPrepMinutes}
                menuItems={menuItems}
                onToggleItem={handleToggleItem}
                onToggleOption={handleToggleOption}
                lang={lang}
              />
            )}

            {role === "owner" && (
              <OwnerDashboard
                metrics={metrics}
                defaultPrepMinutes={defaultPrepMinutes}
                onUpdatePrepTime={handleUpdatePrepTime}
                menuItems={menuItems}
                onToggleItem={handleToggleItem}
                onToggleOption={handleToggleOption}
                branding={branding}
                onSaveBranding={handleSaveBranding}
                failoverConfig={failoverConfig}
                onSaveFailover={handleSaveFailover}
                stripeConfig={stripeConfig}
                orders={orders}
                onSaveStripeConfig={handleSaveStripeConfig}
                onConnectStripe={handleConnectStripe}
                onDisconnectStripe={handleDisconnectStripe}
                onResendPaymentSms={handleResendPaymentSms}
                initialTab={justConnectedStripe ? "payments" : undefined}
                justConnectedStripe={justConnectedStripe}
                lang={lang}
                token={currentToken}
                onRestaurantCreated={async (newId, newName) => {
                  if (session) {
                    const updatedSession = {
                      ...session,
                      available_restaurants: [
                        ...(session.available_restaurants || []),
                        { restaurant_id: newId, name: newName },
                      ],
                    };
                    saveSession(updatedSession);
                    setSession(updatedSession);
                    await handleSwitchRestaurant(newId);
                  }
                }}
              />
            )}

            {role === "support_latam" && (
              <SupportCallLogs calls={callLogs} lang={lang} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
