import { seedDashboardLeads } from "@/data/lead-discovery/seed-leads";

// Preserve the original seed records. Only restore explicit signal labels for
// the detail drawer; this does not perform a live crawl or verify the URLs.
export const initialLeads = seedDashboardLeads.map((lead) => ({
  ...lead,
  notes: [
    ...lead.notes.map((note) => note.replace(/^Confidence:/, "Confidence score:")),
    ...(lead.seed.online_store_url ? ["Online store detected (existing seed data)."] : []),
  ],
}));
