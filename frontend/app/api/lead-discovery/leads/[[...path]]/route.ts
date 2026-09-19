import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const phases: Record<string, string[]> = {
  museums: ["museum gift shop", "art museum store", "cultural institution merchandise"],
  universities: ["university bookstore merchandise", "campus store gifts"],
  attractions: ["tourist attraction gift shop", "visitor center merchandise"],
  corporate: ["cultural corporate gifts", "tourism brand merchandise"],
  schools: ["school spirit store", "education cultural merchandise"],
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const path = (await params).path || [];
  if (path[0] === "discover-targets") {
    const body = await request.json().catch(() => ({})) as { phase?: string; max_results?: number; region?: string };
    const phase = body.phase || "museums";
    const queries = phases[phase] || phases.museums;
    const max = Math.min(Math.max(Number(body.max_results) || 12, 1), 50);
    return NextResponse.json({
      mode: "query_plan_no_api_key", requires_api_key_for_live_search: true, region: body.region || "North America",
      targets: Array.from({ length: Math.min(max, queries.length) }, (_, index) => ({ homepage_url: `discovery://preview-${phase}-${index + 1}`, category: phase === "universities" || phase === "schools" ? "University" : phase === "attractions" ? "Attraction" : "Museum", source: "offline_query_plan", query: queries[index] })),
    });
  }
  return NextResponse.json({ detail: "Live crawling is disabled in Preview." }, { status: 403 });
}
