import type { Metadata } from "next";
import DashboardView from "@/components/lead-discovery/DashboardView";

export const metadata: Metadata = {
  title: "Lead Discovery | Auctus Lab",
  description: "North American cultural commerce lead discovery workspace.",
  robots: { index: false, follow: false },
};

export default function LeadDiscoveryPage() {
  return <DashboardView />;
}
