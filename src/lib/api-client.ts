import { API_BASE_URL } from "./constants";
import {
  CallLogEntry,
  FailoverConfig,
  MenuItemAvailability,
  OrderStatus,
  OrderTicket,
  PortalRole,
  RestaurantBranding,
  RestaurantRoiMetrics,
} from "../types/portal";

export async function fetchOrders(
  restaurantId: string,
  token: string,
  status?: OrderStatus
): Promise<OrderTicket[]> {
  const url = new URL(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/orders`
  );
  if (status) url.searchParams.set("status", status);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch orders`);
  const data = (await res.json()) as { ok: boolean; orders: OrderTicket[] };
  return data.orders ?? [];
}

export async function updateOrderStatus(
  restaurantId: string,
  ticketId: string,
  status: OrderStatus,
  token: string
): Promise<OrderTicket> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/orders/${ticketId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error || `HTTP ${res.status}: Failed to update status`);
  }
  const data = (await res.json()) as { ok: boolean; order: OrderTicket };
  return data.order;
}

export async function fetchMenu(
  restaurantId: string,
  token: string
): Promise<{ default_prep_minutes: number; items: MenuItemAvailability[] }> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/menu`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch menu`);
  return res.json();
}

export async function setItemAvailability(
  restaurantId: string,
  itemId: string,
  available: boolean,
  token: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/menu/items/${itemId}/availability`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ available }),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to toggle item availability`);
}

export async function setModifierOptionAvailability(
  restaurantId: string,
  groupId: string,
  optionId: string,
  available: boolean,
  token: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/menu/groups/${groupId}/options/${optionId}/availability`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ available }),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to toggle modifier availability`);
}

export async function updatePrepTime(
  restaurantId: string,
  prepMinutes: number,
  token: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/operations/prep-time`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ default_prep_minutes: prepMinutes }),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to update prep time`);
}

export async function fetchRoiMetrics(
  restaurantId: string,
  token: string
): Promise<RestaurantRoiMetrics> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/metrics/roi`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch ROI metrics`);
  const data = (await res.json()) as { ok: boolean; metrics: RestaurantRoiMetrics };
  return data.metrics;
}

export async function fetchCallLogs(
  restaurantId: string,
  token: string,
  limit = 50
): Promise<CallLogEntry[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/calls?limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch calls`);
  const data = (await res.json()) as { ok: boolean; calls: CallLogEntry[] };
  return data.calls ?? [];
}

export async function fetchBranding(
  restaurantId: string,
  token: string
): Promise<RestaurantBranding> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/branding`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch branding`);
  const data = (await res.json()) as { ok: boolean; branding: RestaurantBranding };
  return data.branding;
}

export async function updateBranding(
  restaurantId: string,
  branding: Partial<RestaurantBranding>,
  token: string
): Promise<RestaurantBranding> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/branding`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(branding),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to update branding`);
  const data = (await res.json()) as { ok: boolean; branding: RestaurantBranding };
  return data.branding;
}

export interface KdsStreamHandlers {
  onInitialSnapshot?: (orders: OrderTicket[]) => void;
  onOrderCreated?: (order: OrderTicket) => void;
  onOrderUpdated?: (order: OrderTicket) => void;
  onMenuUpdated?: (unavailableItems: string[]) => void;
  onError?: (err: Event) => void;
  onConnected?: () => void;
}

/**
 * Subscribes to real-time KDS Server-Sent Events (SSE) for instant order delivery without polling
 */
export function subscribeToKdsStream(
  restaurantId: string,
  token: string,
  handlers: KdsStreamHandlers
): () => void {
  if (typeof window === "undefined" || !("EventSource" in window)) {
    return () => {};
  }

  const streamUrl = `${API_BASE_URL}/api/restaurants/${restaurantId}/kds/stream?token=${encodeURIComponent(token)}`;
  const eventSource = new EventSource(streamUrl);

  eventSource.onopen = () => {
    handlers.onConnected?.();
  };

  eventSource.addEventListener("initial_snapshot", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as { orders: OrderTicket[] };
      handlers.onInitialSnapshot?.(data.orders || []);
    } catch {
      // Ignored
    }
  });

  eventSource.addEventListener("order_created", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as { order: OrderTicket };
      if (data.order) handlers.onOrderCreated?.(data.order);
    } catch {
      // Ignored
    }
  });

  eventSource.addEventListener("order_updated", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as { order: OrderTicket };
      if (data.order) handlers.onOrderUpdated?.(data.order);
    } catch {
      // Ignored
    }
  });

  eventSource.addEventListener("menu_updated", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as { unavailable_items: string[] };
      handlers.onMenuUpdated?.(data.unavailable_items || []);
    } catch {
      // Ignored
    }
  });

  eventSource.onerror = (err) => {
    handlers.onError?.(err);
  };

  return () => {
    eventSource.close();
  };
}

export async function fetchPublicTenants(): Promise<
  Array<{ restaurant_id: string; name: string; city: string; phone_e164: string }>
> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/tenants`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      ok: boolean;
      tenants: Array<{
        restaurant_id: string;
        name: string;
        city: string;
        phone_e164: string;
      }>;
    };
    return data.tenants ?? [];
  } catch {
    return [];
  }
}

export async function loginWithKitchenPin(
  restaurantId: string,
  pin: string
): Promise<{
  token: string;
  role: PortalRole;
  restaurant: { restaurant_id: string; name: string };
  available_restaurants: Array<{ restaurant_id: string; name: string }>;
}> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login/kitchen-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restaurant_id: restaurantId, pin }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    token: string;
    role: PortalRole;
    restaurant: { restaurant_id: string; name: string };
    available_restaurants: Array<{ restaurant_id: string; name: string }>;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "PIN de cocina inválido");
  }
  return data;
}

export async function loginWithCredentials(
  email: string,
  password: string,
  restaurantId?: string
): Promise<{
  token: string;
  role: PortalRole;
  user_id?: string;
  restaurant: { restaurant_id: string; name: string };
  available_restaurants: Array<{ restaurant_id: string; name: string }>;
}> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login/owner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, restaurant_id: restaurantId }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    token: string;
    role: PortalRole;
    user_id?: string;
    restaurant: { restaurant_id: string; name: string };
    available_restaurants: Array<{ restaurant_id: string; name: string }>;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Credenciales incorrectas");
  }
  return data;
}

export async function switchRestaurantSession(
  token: string,
  restaurantId: string
): Promise<{
  token: string;
  restaurant: { restaurant_id: string; name: string };
}> {
  const res = await fetch(`${API_BASE_URL}/api/auth/switch-restaurant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ restaurant_id: restaurantId }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    token: string;
    restaurant: { restaurant_id: string; name: string };
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "No se pudo cambiar de restaurante");
  }
  return data;
}

export async function fetchFailoverConfig(
  restaurantId: string,
  token: string
): Promise<FailoverConfig | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/restaurants/${restaurantId}/failover-config`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      failover_config: FailoverConfig;
    };
    return data.failover_config;
  } catch {
    return null;
  }
}

export async function updateFailoverConfig(
  restaurantId: string,
  token: string,
  config: {
    failover_mode: "forward_to_phone" | "contingency_message";
    failover_phone_e164: string | null;
  }
): Promise<FailoverConfig> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/failover-config`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    }
  );
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    failover_config: FailoverConfig;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Error al actualizar plan de respaldo");
  }
  return data.failover_config;
}

