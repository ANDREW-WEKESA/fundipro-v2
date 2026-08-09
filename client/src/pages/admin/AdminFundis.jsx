import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { TierBadge, Spinner, Banner, Modal } from "../../components/ui";
import api, { errMsg } from "../../lib/api";

const TIERS = ["free", "pro", "business"];
const TIER_STATUSES = ["active", "expired", "grace"];

export default function AdminFundis() {
  const [fundis, setFundis] = useState(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Reset password modal state
  const [showResetPw, setShowResetPw] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Change tier modal state
  const [showTier, setShowTier] = useState(false);
  const [tierForm, setTierForm] = useState({ tier: "", tier_status: "" });

  async function load() {
    const { data } = await api.get("/admin/fundis");
    setFundis(data.fundis);
  }
  useEffect(() => { load(); }, []);

  function openModal(fundi) {
    setSelected(fundi);
    setMsg("");
    setShowResetPw(false);
    setShowTier(false);
    setNewPassword("");
    setTierForm({ tier: fundi.tier, tier_status: fundi.tier_status || "active" });
  }

  async function updateStatus(fundi, status) {
    setBusy(true); setMsg("");
    try {
      await api.patch(`/admin/users/${fundi.id}/status`, { status });
      const label = status === "suspended" ? "suspended" : status === "deleted" ? "deleted" : "reactivated";
      setMsg(`${fundi.name} has been ${label}.`);
      await load();
      setSelected(null);
    } catch (err) { setMsg(errMsg(err)); }
    finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!newPassword || newPassword.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    setBusy(true); setMsg("");
    try {
      await api.patch(`/admin/users/${selected.id}/reset-password`, { new_password: newPassword });
      setMsg(`Password for ${selected.name} has been reset.`);
      setShowResetPw(false);
      setNewPassword("");
    } catch (err) { setMsg(errMsg(err)); }
    finally { setBusy(false); }
  }

  async function changeTier() {
    setBusy(true); setMsg("");
    try {
      await api.patch(`/admin/users/${selected.id}/tier`, tierForm);
      setMsg(`${selected.name}'s plan updated to ${tierForm.tier} (${tierForm.tier_status}).`);
      await load();
      // Update selected with new data
      const { data } = await api.get("/admin/fundis");
      const updated = data.fundis.find((f) => f.id === selected.id);
      setSelected(updated || null);
      setShowTier(false);
    } catch (err) { setMsg(errMsg(err)); }
    finally { setBusy(false); }
  }

  const filtered = (fundis || []).filter((f) =>
    [f.name, f.trade, f.location, f.phone].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AdminLayout
      title="All Fundis"
      headerRight={
        <input
          className="input max-w-xs"
          placeholder="Search by name, trade, location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      }
    >
      {msg && !selected && <Banner kind="info" className="mb-4">{msg}</Banner>}

      {selected && (
        <Modal title={`Manage: ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            {msg && <Banner kind={msg.includes("error") || msg.includes("must") ? "error" : "success"}>{msg}</Banner>}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span style={{ color: "var(--muted)" }}>Phone:</span> <span className="font-semibold">{selected.phone}</span></div>
              <div><span style={{ color: "var(--muted)" }}>Trade:</span> <span className="font-semibold">{selected.trade}</span></div>
              <div><span style={{ color: "var(--muted)" }}>Location:</span> <span className="font-semibold">{selected.location}</span></div>
              <div><span style={{ color: "var(--muted)" }}>Plan:</span> <TierBadge tier={selected.tier} /></div>
              <div><span style={{ color: "var(--muted)" }}>Jobs:</span> <span className="font-semibold">{selected.job_count}</span></div>
              <div><span style={{ color: "var(--muted)" }}>Revenue:</span> <span className="font-semibold">KES {selected.total_revenue?.toLocaleString()}</span></div>
            </div>

            <div className="flex gap-3">
              <a href={`/s/${selected.slug}`} target="_blank" rel="noreferrer" className="btn-secondary flex-1">🏪 View storefront</a>
              <Link to={`/admin/chat?with=${selected.id}`} className="btn-secondary flex-1" onClick={() => setSelected(null)}>💬 Message</Link>
            </div>

            {/* Status actions */}
            <div className="flex gap-2">
              {selected.status === "suspended" ? (
                <button onClick={() => updateStatus(selected, "active")} disabled={busy} className="btn-primary flex-1">
                  {busy ? "…" : "✅ Reactivate"}
                </button>
              ) : (
                <button onClick={() => updateStatus(selected, "suspended")} disabled={busy} className="btn-danger flex-1">
                  {busy ? "…" : "🚫 Suspend"}
                </button>
              )}
              <button
                onClick={() => { if (window.confirm(`Delete ${selected.name}? This marks them as deleted.`)) updateStatus(selected, "deleted"); }}
                disabled={busy}
                className="btn-danger flex-1"
              >
                🗑️ Delete
              </button>
            </div>

            {/* Reset Password */}
            {!showResetPw ? (
              <button onClick={() => setShowResetPw(true)} className="btn-secondary w-full">🔑 Reset Password</button>
            ) : (
              <div className="space-y-2 border rounded-xl p-3" style={{ borderColor: "var(--border)" }}>
                <label className="label">New Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={resetPassword} disabled={busy} className="btn-primary flex-1">
                    {busy ? "Saving…" : "Set Password"}
                  </button>
                  <button onClick={() => { setShowResetPw(false); setNewPassword(""); }} className="btn-secondary flex-1">Cancel</button>
                </div>
              </div>
            )}

            {/* Change Tier */}
            {!showTier ? (
              <button onClick={() => setShowTier(true)} className="btn-secondary w-full">⭐ Change Tier</button>
            ) : (
              <div className="space-y-2 border rounded-xl p-3" style={{ borderColor: "var(--border)" }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tier</label>
                    <select
                      className="input"
                      value={tierForm.tier}
                      onChange={(e) => setTierForm((f) => ({ ...f, tier: e.target.value }))}
                    >
                      {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      className="input"
                      value={tierForm.tier_status}
                      onChange={(e) => setTierForm((f) => ({ ...f, tier_status: e.target.value }))}
                    >
                      {TIER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={changeTier} disabled={busy} className="btn-primary flex-1">
                    {busy ? "Saving…" : "Update Tier"}
                  </button>
                  <button onClick={() => setShowTier(false)} className="btn-secondary flex-1">Cancel</button>
                </div>
              </div>
            )}

            <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
              Suspended fundis cannot log in until you reactivate them. Use this only during genuine disputes.
            </p>
          </div>
        </Modal>
      )}

      {fundis === null ? (
        <Spinner />
      ) : (
        <div className="card !p-0 overflow-hidden max-w-6xl">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-left text-[11px] uppercase tracking-widest"
                style={{ color: "var(--muted)", borderColor: "var(--border)" }}
              >
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Trade</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3 text-right">Jobs</th>
                <th className="px-5 py-3 text-right">Revenue</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Storefront</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr
                  key={f.id}
                  className="border-b last:border-0 hover:opacity-80 cursor-pointer transition-opacity"
                  style={{ borderColor: "var(--border)" }}
                  onClick={() => openModal(f)}
                >
                  <td className="px-5 py-3 font-medium" style={{ color: "var(--ink)" }}>{f.name}</td>
                  <td className="px-5 py-3" style={{ color: "var(--muted)" }}>{f.trade}</td>
                  <td className="px-5 py-3" style={{ color: "var(--muted)" }}>{f.location}</td>
                  <td className="px-5 py-3"><TierBadge tier={f.tier} /></td>
                  <td className="px-5 py-3 text-right" style={{ color: "var(--muted)" }}>{f.job_count}</td>
                  <td className="px-5 py-3 text-right" style={{ color: "var(--muted)" }}>KES {f.total_revenue?.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${
                      f.status === "suspended" ? "bg-bad/15 text-bad" :
                      f.status === "deleted" ? "bg-muted/20 text-muted" :
                      "bg-good/15 text-good"
                    }`}>
                      {f.status === "suspended" ? "Suspended" : f.status === "deleted" ? "Deleted" : "Active"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <a
                      href={`/s/${f.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-terracotta font-medium hover:underline text-xs"
                    >
                      /s/{f.slug}
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>
                    No fundis match "{q}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
