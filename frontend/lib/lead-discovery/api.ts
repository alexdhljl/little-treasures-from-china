const localFallback = "http://127.0.0.1:8000/api/v1";

/**
 * Browser-safe API selection. Cloud deployments use same-origin Next routes;
 * local development continues to use the recovered FastAPI service.
 */
export function leadDiscoveryApiBase(path: "sales" | "legacy") {
  const configured = process.env.NEXT_PUBLIC_LEAD_DISCOVERY_API_BASE_URL?.replace(/\/$/, "");
  if (configured) return `${configured}/${path === "sales" ? "sales-leads" : "leads"}`;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return path === "sales" ? "/api/lead-discovery/sales" : "/api/lead-discovery/leads";
  }
  return `${localFallback}/${path === "sales" ? "sales-leads" : "leads"}`;
}
