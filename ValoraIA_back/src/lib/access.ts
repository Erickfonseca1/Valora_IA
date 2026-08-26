import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/db/supabase";

export interface CurrentUser {
  id: string;
  email: string | null;
}

// Validates the session token from the Authorization header and returns the
// authenticated user (or null). All product routes must call this.
export async function getCurrentUser(req: NextRequest): Promise<CurrentUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const { data, error } = await getAdminClient().auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

export interface MembershipRow {
  organization_id: string;
  role: "owner" | "admin" | "avaliador" | "pending";
}

// Organizations the user belongs to, with their role.
export async function getUserMemberships(
  db: SupabaseClient,
  userId: string
): Promise<MembershipRow[]> {
  const { data } = await db
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", userId);
  return (data ?? []) as MembershipRow[];
}

// Active (non-pending) memberships.
export async function getUserActiveMemberships(
  db: SupabaseClient,
  userId: string
): Promise<MembershipRow[]> {
  const rows = await getUserMemberships(db, userId);
  return rows.filter((m) => m.role !== "pending");
}

// Resolves the active organization from the x-org-id header. Falls back to the
// user's first active organization. Returns null if the user has none.
export async function resolveActiveOrg(
  db: SupabaseClient,
  userId: string,
  req: NextRequest
): Promise<string | null> {
  const memberships = await getUserActiveMemberships(db, userId);
  if (memberships.length === 0) return null;

  const headerOrg = req.headers.get("x-org-id");
  if (headerOrg && memberships.some((m) => m.organization_id === headerOrg)) {
    return headerOrg;
  }
  return memberships[0].organization_id;
}

// Scope used to filter valuations: authored by the user, or belonging to
// organizations where the user is owner/admin.
export async function getValuationScope(
  db: SupabaseClient,
  userId: string
): Promise<{ userId: string; adminOrgIds: string[] }> {
  const memberships = await getUserMemberships(db, userId);
  return {
    userId,
    adminOrgIds: memberships
      .filter((m) => m.role === "owner" || m.role === "admin")
      .map((m) => m.organization_id),
  };
}

export function canAccessValuation(
  scope: { userId: string; adminOrgIds: string[] },
  valuation: { created_by: string | null; organization_id: string | null }
): boolean {
  return (
    valuation.created_by === scope.userId ||
    (valuation.organization_id != null &&
      scope.adminOrgIds.includes(valuation.organization_id))
  );
}