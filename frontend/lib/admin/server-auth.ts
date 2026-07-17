import "server-only";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Admin authentication is not configured.");
  return { url, anonKey };
}

export async function requireAdminRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { url, anonKey } = config();
  const headers = { apikey: anonKey, Authorization: `Bearer ${token}` };
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers, cache: "no-store" });
  if (!userResponse.ok) return false;
  const user = await userResponse.json() as { id?: string };
  if (!user.id) return false;
  const adminResponse = await fetch(`${url}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`, { headers, cache: "no-store" });
  if (!adminResponse.ok) return false;
  const admins = await adminResponse.json() as Array<{ user_id: string }>;
  return admins.length > 0;
}
