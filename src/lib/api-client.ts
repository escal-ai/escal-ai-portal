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
  StripePrepayConfig,
  TelnyxInventoryItem,
  TenantOnboardingData,
  WelcomeKit,
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

export async function fetchPublicTenants(code?: string): Promise<
  Array<{ restaurant_id: string; name: string; city: string; phone_e164: string }>
> {
  try {
    const query = code ? `?code=${encodeURIComponent(code)}` : "";
    const res = await fetch(`${API_BASE_URL}/api/auth/tenants${query}`, {
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

/**
 * Resolves ONE tenant from a store code (`?restaurant=`, `?code=`, DTMF code or
 * the restaurant id). Production deployments never publish the full directory,
 * so this is how a client's tablet finds its own restaurant the first time.
 */
export async function resolveTenant(
  code: string
): Promise<
  | { ok: true; tenant: { restaurant_id: string; name: string; city: string; phone_e164: string } }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/auth/tenant?code=${encodeURIComponent(code)}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as {
      ok: boolean;
      tenant?: { restaurant_id: string; name: string; city: string; phone_e164: string };
      error?: string;
    };
    if (!res.ok || !data.tenant) {
      return { ok: false, error: data.error ?? "Restaurante no encontrado" };
    }
    return { ok: true, tenant: data.tenant };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
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

export async function fetchTelnyxInventory(
  token: string
): Promise<{ total: number; available_count: number; inventory: TelnyxInventoryItem[] }> {
  const res = await fetch(`${API_BASE_URL}/api/admin/telephony/inventory`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to fetch Telnyx inventory`);
  }
  const data = (await res.json()) as {
    ok: boolean;
    total: number;
    available_count: number;
    inventory: TelnyxInventoryItem[];
    error?: string;
  };
  if (!data.ok) throw new Error(data.error || "Error fetching inventory");
  return data;
}

export async function onboardRestaurant(
  token: string,
  payload: TenantOnboardingData
): Promise<{
  restaurant: {
    restaurant_id: string;
    name: string;
    assigned_did_e164: string;
    telephony_sync_status: string;
  };
  welcome_kit: WelcomeKit;
}> {
  const res = await fetch(`${API_BASE_URL}/api/admin/restaurants/onboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    restaurant: {
      restaurant_id: string;
      name: string;
      assigned_did_e164: string;
      telephony_sync_status: string;
    };
    welcome_kit: WelcomeKit;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Error al dar de alta el restaurante");
  }
  return data;
}

export async function fetchStripePrepayConfig(
  restaurantId: string,
  token: string
): Promise<StripePrepayConfig> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/stripe/config`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to fetch Stripe config`);
  }
  return (await res.json()) as StripePrepayConfig;
}

export async function updateStripePrepayConfig(
  restaurantId: string,
  token: string,
  config: {
    prepay_enabled: boolean;
    prepay_threshold_cents: number;
    prepay_expiry_minutes: number;
  }
): Promise<StripePrepayConfig> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/stripe/config`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    }
  );
  const data = (await res.json()) as StripePrepayConfig & {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to save Stripe config`);
  }
  return data;
}

export async function createStripeConnectUrl(
  restaurantId: string,
  token: string
): Promise<string> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/stripe/connect-url`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = (await res.json()) as {
    ok: boolean;
    connect_url?: string;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.connect_url) {
    throw new Error(data.error || "No se pudo generar el enlace de Stripe Connect");
  }
  return data.connect_url;
}

export async function disconnectStripeAccount(
  restaurantId: string,
  token: string
): Promise<StripePrepayConfig> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/stripe/disconnect`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = (await res.json()) as StripePrepayConfig & {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "No se pudo desconectar la cuenta de Stripe");
  }
  return data;
}

export async function resendOrderPaymentSms(
  restaurantId: string,
  ticketId: string,
  token: string
): Promise<{ short_url: string; recipient_masked: string }> {
  const res = await fetch(
    `${API_BASE_URL}/api/restaurants/${restaurantId}/orders/${ticketId}/resend-payment-sms`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = (await res.json()) as {
    ok: boolean;
    short_url: string;
    recipient_masked: string;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "No se pudo reenviar el SMS de pago");
  }
  return data;
}


