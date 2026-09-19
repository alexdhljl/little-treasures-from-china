import type { Metadata } from "next";
import SalesLeadList from "@/components/lead-discovery/SalesLeadList";

export const metadata: Metadata = { title: "Sales Lead List | Auctus Lab", robots: { index: false, follow: false } };

export default function SalesLeadListPage() {
  return <SalesLeadList />;
}
