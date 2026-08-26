import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  userId?: string | null;
  organizationId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

// Best-effort write; auditing must never fail the business operation.
export async function logAudit(db: SupabaseClient, entry: AuditEntry): Promise<void> {
  try {
    await db.from("audit_logs").insert({
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      user_id: entry.userId ?? null,
      organization_id: entry.organizationId ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}