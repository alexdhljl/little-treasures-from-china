import { afterEach, describe, expect, it } from "vitest";
import { cloudDatabaseVariable, hasCloudLeadDatabase } from "../lib/lead-discovery/cloud-db";
import { leadDiscoveryApiBase } from "../lib/lead-discovery/api";

const originalApi = process.env.NEXT_PUBLIC_LEAD_DISCOVERY_API_BASE_URL;
const originalDb = process.env.LEAD_DISCOVERY_DATABASE_URL;

afterEach(() => {
  if (originalApi === undefined) delete process.env.NEXT_PUBLIC_LEAD_DISCOVERY_API_BASE_URL;
  else process.env.NEXT_PUBLIC_LEAD_DISCOVERY_API_BASE_URL = originalApi;
  if (originalDb === undefined) delete process.env.LEAD_DISCOVERY_DATABASE_URL;
  else process.env.LEAD_DISCOVERY_DATABASE_URL = originalDb;
});

describe("Lead Discovery cloud configuration", () => {
  it("uses an explicit development API base URL without hard-coding it into components", () => {
    process.env.NEXT_PUBLIC_LEAD_DISCOVERY_API_BASE_URL = "http://127.0.0.1:8000/api/v1/";
    expect(leadDiscoveryApiBase("sales")).toBe("http://127.0.0.1:8000/api/v1/sales-leads");
  });

  it("only enables the cloud repository when its isolated database variable exists", () => {
    delete process.env.LEAD_DISCOVERY_DATABASE_URL;
    expect(hasCloudLeadDatabase()).toBe(false);
    process.env.LEAD_DISCOVERY_DATABASE_URL = "postgresql://example";
    expect(hasCloudLeadDatabase()).toBe(true);
    expect(cloudDatabaseVariable).toBe("LEAD_DISCOVERY_DATABASE_URL");
  });
});
