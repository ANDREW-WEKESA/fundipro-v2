import { store } from "../db/store.js";

export function auditLog(event_type, actor, target, metadata = {}) {
  store.insert("audit_logs", {
    event_type,
    actor_id: actor?.id || null,
    actor_name: actor?.name || "System",
    target_id: target?.id || null,
    target_name: target?.name || null,
    metadata,
  });
}
