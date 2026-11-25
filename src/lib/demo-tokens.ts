import { PortalRole } from "../types/portal";

/**
 * Demo-only session tokens.
 *
 * Kept in its own module so the production bundle never carries them: the demo
 * deployment imports this chunk dynamically, production builds never do.
 * Debt: delete this file once the prospects are served from demo.escal-ai.com.
 */
export const DEMO_TOKENS: Record<PortalRole, string> = {
  owner:
    "eyJyZXN0YXVyYW50X2lkIjoicnN0X3RhcXVlcmlhX2VzdHJlbGxhX2xhIiwicm9sZSI6Im93bmVyIiwiaWF0IjoxNzk1NDUzMDA4LCJleHAiOjE4MjY5ODkwMDh9.grsRzUEyNJ7euclEVzX8Q0OAwF3LxDHQIa1bkOBpcFs",
  kitchen:
    "eyJyZXN0YXVyYW50X2lkIjoicnN0X3RhcXVlcmlhX2VzdHJlbGxhX2xhIiwicm9sZSI6ImtpdGNoZW4iLCJpYXQiOjE3OTU0NTMwMDgsImV4cCI6MTgyNjk4OTAwOH0.jO8giAsvzohyoNgbuHILTJ9R0jgBGtlPRdho2fenRvQ",
  support_latam:
    "eyJyZXN0YXVyYW50X2lkIjoicnN0X3RhcXVlcmlhX2VzdHJlbGxhX2xhIiwicm9sZSI6InN1cHBvcnRfbGF0YW0iLCJpYXQiOjE3OTU0NTMwMDgsImV4cCI6MTgyNjk4OTAwOH0.cc-NIsNk7A03Spa1cxyy5b8S4AQFcv3DNl2PgIfCNXQ",
};
