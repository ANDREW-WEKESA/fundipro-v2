import { useEffect, useState } from "react";
import FundiLayout from "./FundiLayout";
import { Spinner, Banner, Modal } from "../../components/ui";
import api, { errMsg } from "../../lib/api";

const PAYMENT_METHODS = ["cash", "mpesa", "bank", "credit", "other"];

function getDateRange(filter) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (filter === "today") return { from: today, to: today };

  if (filter === "week") {
    const day = now.getDay(); // 0=Sun
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(now.setDate(diff));
    const from = `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`;
    return { from, to: today };
  }

  if (filter === "month") {
    return { from: `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-01`, to: today };
  }

  return { from: "", to: "" };
}

const EMPTY_FORM = { amount: "", description: "", customer_name: "", payment_method: "cash", date: new Date().toISOString().slice(0, 10) };

export default function Sales() {
  const [sales, setSales] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [filter, setFilter] = useState("month");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function load(f = filter) {
    const range = getDateRange(f);
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    api.get(`/sales?${params}`).then(({ data }) => {
      setSales(data.sales);
      setTotalAmount(data.total_amount);
    });
  }

  useEffect(() => { load(); }, [filter]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEdit(sale) {
    setEditing(sale);
    setForm({
      amount: sale.amount,
      description: sale.description,
      customer_name: sale.customer_name,
      payment_method: sale.payment_method || "cash",
      date: sale.date,
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      if (editing) {
        await api.patch(`/sales/${editing.id}`, form);
        setMsg("Sale updated.");
      } else {
        await api.post("/sales", form);
        setMsg("Sale recorded.");
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this sale?")) return;
    try {
      await api.delete(`/sales/${id}`);
      setMsg("Sale deleted.");
      load();
    } catch (err) {
      setMsg(errMsg(err));
    }
  }

  const FILTERS = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All" },
  ];

  return (
    <FundiLayout title="Sales">
      <div className="max-w-4xl space-y-6">
        {/* Total income header */}
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Total Income
            </p>
            <p className="text-3xl font-display font-bold text-good mt-1">
              KES {totalAmount.toLocaleString()}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {sales?.length ?? "—"} sale{sales?.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <button onClick={openAdd} className="btn-primary shrink-0">
            + Add Sale
          </button>
        </div>

        {msg && <Banner kind="success">{msg}</Banner>}

        {/* Date filter bar */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? "btn-primary" : "btn-secondary"}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sales list */}
        {sales === null ? (
          <Spinner />
        ) : sales.length === 0 ? (
          <div className="card py-14 text-center">
            <p className="text-4xl mb-3">💰</p>
            <p className="font-semibold" style={{ color: "var(--ink)" }}>No sales recorded yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: "var(--muted)" }}>
              Start tracking your direct sales and see your income grow.
            </p>
            <button onClick={openAdd} className="btn-primary">Record your first sale</button>
          </div>
        ) : (
          <div className="card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-left text-[11px] uppercase tracking-widest"
                  style={{ color: "var(--muted)", borderColor: "var(--border)" }}
                >
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--muted)" }}>{s.date}</td>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--ink)" }}>
                      {s.description || <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--muted)" }}>
                      {s.customer_name || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs rounded-full px-2 py-0.5 bg-sand/50 font-medium capitalize">
                        {s.payment_method || "cash"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-good">
                      KES {(s.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(s)} className="btn-secondary text-xs py-1">✏️</button>
                        <button onClick={() => handleDelete(s.id)} className="btn-danger text-xs py-1">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Edit Sale" : "Add Sale"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Banner kind="error">{error}</Banner>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (KES) *</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <input
                className="input"
                placeholder="e.g. Custom dress, gate repair…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Customer Name</label>
                <input
                  className="input"
                  placeholder="Optional"
                  value={form.customer_name}
                  onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input"
                  value={form.payment_method}
                  onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update Sale" : "Record Sale"}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </FundiLayout>
  );
}
