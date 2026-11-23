"use client";

import React, { useEffect, useState, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { KdsBoard } from "../components/kds/KdsBoard";
import { OwnerDashboard } from "../components/owner/OwnerDashboard";
import { SupportCallLogs } from "../components/support/SupportCallLogs";
import {
  PortalRole,
  OrderTicket,
  OrderStatus,
  MenuItemAvailability,
  RestaurantRoiMetrics,
  RestaurantBranding,
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
  subscribeToKdsStream,
} from "../lib/api-client";
import { DEFAULT_RESTAURANT_ID, DEMO_TOKENS } from "../lib/constants";
import { chimeManager } from "../lib/sound-chime";

export default function PortalHomePage() {
  const [role, setRole] = useState<PortalRole>("kitchen");
  const [lang, setLang] = useState<"es" | "en">("es");
  const [isDark, setIsDark] = useState<boolean>(false);

  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemAvailability[]>([]);
  const [defaultPrepMinutes, setDefaultPrepMinutes] = useState(20);
  const [metrics, setMetrics] = useState<RestaurantRoiMetrics | null>(null);
  const [branding, setBranding] = useState<RestaurantBranding | null>(null);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(false);

  const previousOrdersCountRef = useRef<number>(0);
  const currentToken = DEMO_TOKENS[role];

  // 1. Initial Language detection & Dark mode setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("en")) {
        setLang("en");
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
          DEFAULT_RESTAURANT_ID,
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
          DEFAULT_RESTAURANT_ID,
          currentToken
        );
        setMenuItems(menuData.items || []);
        setDefaultPrepMinutes(menuData.default_prep_minutes || 20);
      }

      if (role === "owner") {
        const fetchedMetrics = await fetchRoiMetrics(
          DEFAULT_RESTAURANT_ID,
          currentToken
        );
        setMetrics(fetchedMetrics);

        const fetchedBranding = await fetchBranding(
          DEFAULT_RESTAURANT_ID,
          currentToken
        );
        setBranding(fetchedBranding);
      }

      if (role === "support_latam") {
        const fetchedCalls = await fetchCallLogs(
          DEFAULT_RESTAURANT_ID,
          currentToken,
          50
        );
        setCallLogs(fetchedCalls);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
        DEFAULT_RESTAURANT_ID,
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
  }, [role, currentToken]);

  // Handlers
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
        DEFAULT_RESTAURANT_ID,
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
      DEFAULT_RESTAURANT_ID,
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
      DEFAULT_RESTAURANT_ID,
      groupId,
      optionId,
      available,
      currentToken
    );
  };

  const handleUpdatePrepTime = async (minutes: number) => {
    setDefaultPrepMinutes(minutes);
    await updatePrepTime(DEFAULT_RESTAURANT_ID, minutes, currentToken);
  };

  const handleSaveBranding = async (newBranding: Partial<RestaurantBranding>) => {
    const updated = await updateBranding(
      DEFAULT_RESTAURANT_ID,
      newBranding,
      currentToken
    );
    setBranding(updated);
  };

  const activeOrdersCount = orders.filter(
    (o) => o.status === "confirmed" || o.status === "in_kitchen"
  ).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        restaurantName="Taquería y Birriería La Estrella"
        branding={branding}
        currentRole={role}
        onRoleChange={setRole}
        lang={lang}
        onLangChange={setLang}
        isDark={isDark}
        onThemeToggle={() => setIsDark((d) => !d)}
        activeOrdersCount={activeOrdersCount}
        isLiveStream={isLiveStream}
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
                lang={lang}
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
