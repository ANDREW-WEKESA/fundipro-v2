import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { Spinner } from "../../components/ui";
import api from "../../lib/api";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLogs(null);
    api.get(`/admin/audit-logs?page=${page}&limit=20`).then(({ data }) => {
      setLogs(data.logs);
      setTotal(data.total);
      setPages(data.pages);
    });
  }, [page]);

  return (
    <AdminLayout title="Audit Log">
      <div className="max-w-6xl space-y-4">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          All sensitive admin actions are recorded here. {total > 0 && `${total} total events.`}
        </p>

        {logs === null ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <div className="card py-14 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold" style={{ color: "var(--ink)" }}>No audit events yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Events will appear here as admin actions are performed.
            </p>
          </div>
        ) : (
          <div className="card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-left text-[11px] uppercase tracking-widest"
                  style={{ color: "var(--muted)", borderColor: "var(--border)" }}
                >
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--ink)" }}>
                      {log.event_type}
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--muted)" }}>
                      {log.actor_name || "—"}
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--muted)" }}>
                      {log.target_name || "—"}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--muted)" }}>
                      {log.metadata && Object.keys(log.metadata).length > 0
                        ? Object.entries(log.metadata)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center gap-3">
            <button
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Previous
            </button>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              Page {page} of {pages}
            </span>
            <button
              className="btn-secondary"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
