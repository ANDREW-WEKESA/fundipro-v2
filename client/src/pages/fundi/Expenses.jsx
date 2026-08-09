import { useEffect, useState } from "react";
import FundiLayout from "./FundiLayout";
import { Spinner, Banner, Modal } from "../../components/ui";
import api, { errMsg } from "../../lib/api";

const CATEGORIES = ["materials", "tools", "transport", "rent", "utilities", "labour", "marketing", "other"];

const CATEGORY_COLORS = {
  materials:  "bg-blue-100 text-blue-700",
  tools:      "bg-purple-100 text-purple-700",
  transport:  "bg-yellow-100 text-yellow-700",
  rent:       "bg-orange-100 text-orange-700",
  utilities:  "bg-cyan-100 text-cyan-700",
  labour:     "bg-green-100 text-green-700",
  marketing:  "bg-pink-100 text-pink-700",
  other:      "bg-gray-100 text-gray-600",
};

function getDateRange(filter) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (filter === "today") return { from: today, to: today };

  if (filter === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(new Date().setDate(diff));
    return { from: `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`, to: today };
  }

  if (filter === "month") {
    return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: today };
  }

  return { from: "", to: "" };
}

const EMPTY_FORM = { amount: "", category: "materials", description: "", date: new Date().toISOString().slice(0, 10) };

export default function Expenses() {
  const [expenses, setExpenses] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [filter, setFilter] = useState("month");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function load(f = filter, cat = categoryFilter) {
    const range = getDateRange(f);
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    if (cat) params.set("category", cat);
    api.get(`/expenses?${params}`).then(({ data }) => {
      setExpenses(data.expenses);
      setTotalAmount(data.total_amount);
    });
  }

  useEffect(() => { load(); }, [filter, categoryFilter]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEdit(expense) {
    setEditing(expense);
    setForm({
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date,
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      if (editing) {
        await api.patch(`/expenses/${editing.id}`, form);
        setMsg("Expense updated.");
      } else {
        await api.post("/expenses", form);
        setMsg("Expense recorded.");
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
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      setMsg("Expense deleted.");
      load();
    } catch (err) {
      setMsg(errMsg(err));
    }
  }

  const DATE_FILTERS = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All" },
  ];

  return (
    <FundiLayout title="Expenses">
      <div className="max-w-4xl space-y-6">
        {/* Total header */}
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Total Expenses
            </p>
            <p className="text-3xl font-display font-bold text-bad mt-1">
              KES {totalAmount.toLocaleString()}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {expenses?.length ?? "—"} expense{expenses?.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <button onClick={openAdd} className="btn-primary shrink-0">
            + Add Expense
          </button>
        </div>

        {msg && <Banner kind="success">{msg}</Banner>}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? "btn-primary" : "btn-secondary"}
            >
              {f.label}
            </button>
          ))}
          <select
            className="input max-w-[160px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Expenses list */}
        {expenses === null ? (
          <Spinner />
        ) : expenses.length === 0 ? (
          <div className="card py-14 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-semibold" style={{ color: "var(--ink)" }}>No expenses recorded yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: "var(--muted)" }}>
              Track your business expenses to understand your true profit.
            </p>
            <button onClick={openAdd} className="btn-primary">Record your first expense</button>
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
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--muted)" }}>{e.date}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs rounded-full px-2.5 py-1 font-semibold capitalize ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.other}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--ink)" }}>
                      {e.description || <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-bad">
                      KES {(e.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(e)} className="btn-secondary text-xs py-1">✏️</button>
                        <button onClick={() => handleDelete(e.id)} className="btn-danger text-xs py-1">🗑️</button>
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
        <Modal title={editing ? "Edit Expense" : "Add Expense"} onClose={() => setShowModal(false)}>
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
              <label className="label">Category *</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <input
                className="input"
                placeholder="e.g. Timber from supplier, fuel for delivery…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update Expense" : "Record Expense"}
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
