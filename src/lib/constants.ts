import { PortalRole } from "../types/portal";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_ENGINE_API_URL ||
  "https://escal-ai-voice-engine-production.up.railway.app";

export const DEFAULT_RESTAURANT_ID = "rst_taqueria_estrella_la";

/**
 * Pre-configured development session tokens for instant role-switching in the UI
 */
export const DEMO_TOKENS: Record<PortalRole, string> = {
  owner:
    "eyJyZXN0YXVyYW50X2lkIjoicnN0X3RhcXVlcmlhX2VzdHJlbGxhX2xhIiwicm9sZSI6Im93bmVyIiwiaWF0IjoxNzk1NDUzMDA4LCJleHAiOjE4MjY5ODkwMDh9.grsRzUEyNJ7euclEVzX8Q0OAwF3LxDHQIa1bkOBpcFs",
  kitchen:
    "eyJyZXN0YXVyYW50X2lkIjoicnN0X3RhcXVlcmlhX2VzdHJlbGxhX2xhIiwicm9sZSI6ImtpdGNoZW4iLCJpYXQiOjE3OTU0NTMwMDgsImV4cCI6MTgyNjk4OTAwOH0.jO8giAsvzohyoNgbuHILTJ9R0jgBGtlPRdho2fenRvQ",
  support_latam:
    "eyJyZXN0YXVyYW50X2lkIjoicnN0X3RhcXVlcmlhX2VzdHJlbGxhX2xhIiwicm9sZSI6InN1cHBvcnRfbGF0YW0iLCJpYXQiOjE3OTU0NTMwMDgsImV4cCI6MTgyNjk4OTAwOH0.cc-NIsNk7A03Spa1cxyy5b8S4AQFcv3DNl2PgIfCNXQ",
};
