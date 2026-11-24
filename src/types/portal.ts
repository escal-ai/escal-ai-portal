export type PortalRole = "owner" | "kitchen" | "support_latam";

export type OrderStatus =
  | "confirmed"
  | "in_kitchen"
  | "ready_for_pickup"
  | "completed"
  | "transferred_to_human"
  | "abandoned"
  | "failed";

export interface TicketModifier {
  group_id: string;
  option_id: string;
  name_es: string;
  name_en: string;
  price_cents: number;
}

export interface TicketLineItem {
  line_id: string;
  item_id: string;
  name_es: string;
  name_en: string;
  qty: number;
  base_unit_price_cents: number;
  modifiers: TicketModifier[];
  unit_price_with_modifiers_cents: number;
  line_total_cents: number;
  special_instructions: string | null;
}

export interface OrderTicket {
  schema_version: "1.0";
  ticket_id: string;
  restaurant_id: string;
  channel: "voice" | "whatsapp" | "web";
  language_detected: "es" | "en" | "spanglish";
  status: OrderStatus;
  received_at: string;
  customer: {
    name: string | null;
    phone_e164?: string;
    phone_masked: string;
    requested_pickup_time: string;
    fulfillment_notes: string | null;
  };
  items: TicketLineItem[];
  totals: {
    subtotal_cents: number;
    tax_cents: number;
    mandatory_fee_cents: number;
    tip_cents: number;
    total_cents: number;
    currency: "USD";
    formatted_total: string;
  };
  safety_and_escalation: {
    allergy_flag: boolean;
    allergy_details: string | null;
    exceeded_unpaid_limit: boolean;
    transfer_reason: string | null;
    human_transfer_target: string | null;
  };
  artifacts: {
    transcript_url: string | null;
    audio_url: string | null;
  };
}

export interface CallLogEntry {
  call_id: string;
  restaurant_id: string;
  caller_phone_e164: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  channel: "voice" | "whatsapp" | "web";
  language_detected: "es" | "en" | "spanglish";
  status: "completed" | "transferred" | "abandoned" | "allergy_escalated";
  ticket_id: string | null;
  no_recording_mode: boolean;
  audio_url: string | null;
  transcript_url: string | null;
  call_summary?: string;
}

export interface TopSellingItemMetric {
  item_id: string;
  name_es: string;
  qty_sold: number;
  revenue_cents: number;
  formatted_revenue: string;
}

export interface RestaurantRoiMetrics {
  restaurant_id: string;
  period: "all_time";
  total_calls: number;
  total_orders_captured: number;
  total_revenue_cents: number;
  formatted_total_revenue: string;
  average_order_value_cents: number;
  formatted_average_order_value: string;
  total_voice_minutes: number;
  transferred_to_human_count: number;
  allergies_escalated_count: number;
  abandoned_calls_count: number;
  top_selling_items: TopSellingItemMetric[];
}

export interface MenuOptionAvailability {
  id: string;
  name_es: string;
  available: boolean;
  price_cents: number;
}

export interface MenuGroupAvailability {
  id: string;
  name_es: string;
  options: MenuOptionAvailability[];
}

export interface MenuItemAvailability {
  id: string;
  name_es: string;
  name_en: string;
  category_id: string;
  price_usd: string;
  base_price_cents: number;
  available: boolean;
  modifier_groups: MenuGroupAvailability[];
}

export interface RestaurantBranding {
  brand_logo_url: string | null;
  brand_primary_color: string;
  preferred_language: "es" | "en";
}

export interface FailoverConfig {
  restaurant_id: string;
  restaurant_name: string;
  primary_phone_e164: string;
  assigned_did_e164?: string | null;
  failover_mode: "forward_to_phone" | "contingency_message";
  failover_phone_e164: string | null;
  telephony_sync_status?: "synced" | "partial" | "mock" | "error" | null;
  telephony_synced_at?: string | null;
  updated_at?: string;
}

export interface TelnyxInventoryItem {
  id: string;
  phone_number_e164: string;
  status: string;
  connection_name?: string | null;
  is_assigned: boolean;
  assigned_restaurant_id?: string | null;
  assigned_restaurant_name?: string | null;
  call_forwarding_enabled?: boolean;
}

export interface TenantOnboardingData {
  restaurant_id: string;
  display_name: string;
  primary_phone_e164: string;
  assigned_did_e164: string;
  telnyx_number_id?: string;
  failover_mode: "forward" | "message";
  failover_phone_e164?: string | null;
  owner_whatsapp_e164?: string | null;
  kitchen_pin: string;
  address: {
    street: string;
    city: string;
    state: "CA";
    zip: string;
  };
  tax_rate_bps: number;
  menu_template: "tacos_birria" | "pupuseria" | "custom";
}

export interface WelcomeKit {
  restaurant_id: string;
  display_name: string;
  assigned_did_e164: string;
  kitchen_pin: string;
  portal_url: string;
  forwarding_activation_code: string;
  forwarding_deactivation_code: string;
  whatsapp_message_text: string;
}
