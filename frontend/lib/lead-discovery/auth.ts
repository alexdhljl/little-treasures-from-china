import { timingSafeEqual } from "node:crypto";

export const writeTokenVariable = "LEAD_DISCOVERY_WRITE_TOKEN";

/** Preview-only write gate. Read access is protected separately by Vercel Deployment Protection. */
export function canMutateLeadDiscovery(token: string | null) {
  const expected = process.env[writeTokenVariable];
  if (!expected || !token) return false;
  const left = Buffer.from(expected), right = Buffer.from(token);
  return left.length === right.length && timingSafeEqual(left, right);
}
