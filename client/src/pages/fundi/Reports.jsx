import { useEffect, useState } from "react";
import FundiLayout from "./FundiLayout";
import { Spinner, Banner, StatCard } from "../../components/ui";
import api, { errMsg } from "../../lib/api";

function pad(n) { return String(n).padStart(2, "0"); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getPresetRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = todayStr();

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.getFullYear(), now.getMonth(), diff);
      return { from: `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`, to: today };
    }
    case "month":
      return { from: `${y}-${pad(m + 1)}-01`, to: today };
    case "last_month": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const lastDay = new Date(y, m, 0).getDate();
      return { from: `${ly}-${pad(lm + 1)}-01`, to: `${ly}-${pad(lm + 1)}-${pad(lastDay)}` };
    }
    case "year":
      return { from: `${y}-01-01`, to: today };
    default:
      return { from: "", to: "" };
  }
}

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

export default function Reports() {
  const [preset, setPreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(todayStr());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  function getRange() {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPresetRange(preset);
  }

  async function fetchReport() {
    const { from, to } = getRange();
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { data } = await api.get(`/reports/profit?${params}`);
      setReport(data);
    } catch (err) {
      setError(errMsg(err, "Could not load report."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (preset !== "custom") fetchReport();
  }, [preset]);

  async function downloadPDF() {
    const { from, to } = getRange();
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const token = localStorage.getItem("fundipro_token");
      const baseURL = import.meta.env.PROD
        ? "https://fundipro-v2.onrender.com/api"
        : "/api";
      const res = await fetch(`${baseURL}/reports/profit/pdf?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FundiPro-Profit-Report-${from || "all"}-to-${to || "all"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const formatKES = (n) => `KES ${(n || 0).toLocaleString()}`;
  const { from, to } = getRange();

  return (
    <FundiLayout title="Profit Reports">
      <div className="max-w-4xl space-y-6">
        {/* Date range selector */}
        <div className="card space-y-4">
          <h2 className="section-title">Date Range</h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={preset === p.key ? "btn-primary" : "btn-secondary"}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="label">From</label>
                <input
                  className="input"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="label">To</label>
                <input
                  className="input"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={fetchReport}>
                Run Report
              </button>
            </div>
          )}
          {from && to && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Showing: {from} → {to}
            </p>
          )}
        </div>

        {error && <Banner kind="error">{error}</Banner>}

        {loading ? (
          <Spinner />
        ) : report ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon="📥"
                label="Total Income"
                value={formatKES(report.total_income)}
                accent="text-good"
                sub="jobs + sales"
              />
              <StatCard
                icon="📤"
                label="Total Expenses"
                value={formatKES(report.total_expenses)}
                accent="text-bad"
                sub="all categories"
              />
              <StatCard
                icon="💎"
                label="Gross Profit"
                value={formatKES(report.gross_profit)}
                accent={report.gross_profit >= 0 ? "text-good" : "text-bad"}
                sub="income − expenses"
              />
              <StatCard
                icon="📐"
                label="Profit Margin"
                value={`${(report.margin_pct || 0).toFixed(1)}%`}
                accent="text-bark"
                sub={report.total_income > 0 ? "of total income" : "no income recorded"}
              />
            </div>

            {/* Income breakdown */}
            <div className="card">
              <h2 className="section-title mb-4">Income Breakdown</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-widest" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
                    <th className="py-2">Source</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-right">% of Income</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2.5 font-medium" style={{ color: "var(--ink)" }}>Jobs (sale prices)</td>
                    <td className="py-2.5 text-right text-good font-semibold">{formatKES(report.income_by_source.jobs)}</td>
                    <td className="py-2.5 text-right" style={{ color: "var(--muted)" }}>
                      {report.total_income > 0 ? `${((report.income_by_source.jobs / report.total_income) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2.5 font-medium" style={{ color: "var(--ink)" }}>Direct Sales</td>
                    <td className="py-2.5 text-right text-good font-semibold">{formatKES(report.income_by_source.sales)}</td>
                    <td className="py-2.5 text-right" style={{ color: "var(--muted)" }}>
                      {report.total_income > 0 ? `${((report.income_by_source.sales / report.total_income) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2.5" style={{ color: "var(--ink)" }}>Total</td>
                    <td className="py-2.5 text-right text-good">{formatKES(report.total_income)}</td>
                    <td className="py-2.5 text-right" style={{ color: "var(--muted)" }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Expenses breakdown */}
            <div className="card">
              <h2 className="section-title mb-4">Expenses by Category</h2>
              {Object.keys(report.expenses_by_category).length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted)" }}>No expenses recorded in this period.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] uppercase tracking-widest" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 text-right">% of Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.expenses_by_category)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amt]) => (
                        <tr key={cat} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                          <td className="py-2.5 font-medium capitalize" style={{ color: "var(--ink)" }}>{cat}</td>
                          <td className="py-2.5 text-right text-bad font-semibold">{formatKES(amt)}</td>
                          <td className="py-2.5 text-right" style={{ color: "var(--muted)" }}>
                            {report.total_expenses > 0 ? `${((amt / report.total_expenses) * 100).toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    <tr className="font-bold">
                      <td className="py-2.5" style={{ color: "var(--ink)" }}>Total</td>
                      <td className="py-2.5 text-right text-bad">{formatKES(report.total_expenses)}</td>
                      <td className="py-2.5 text-right" style={{ color: "var(--muted)" }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Download PDF */}
            <div className="flex justify-end">
              <button onClick={downloadPDF} disabled={downloading} className="btn-primary">
                {downloading ? "Generating PDF…" : "📄 Download PDF Report"}
              </button>
            </div>
          </>
        ) : (
          <div className="card py-14 text-center">
            <p className="text-4xl mb-3">📈</p>
            <p className="font-semibold" style={{ color: "var(--ink)" }}>Select a date range to see your profit report</p>
          </div>
        )}
      </div>
    </FundiLayout>
  );
}
