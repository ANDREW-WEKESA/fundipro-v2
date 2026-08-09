import { Router } from "express";
import PDFDocument from "pdfkit";
import { store } from "../db/store.js";
import { requireAuth } from "../middleware/auth.js";
import { REPORT_INTERVAL_DAYS } from "../config.js";

const router = Router();
router.use(requireAuth);

function lastReportFor(userId) {
  const reports = store
    .all("reports", (r) => r.user_id === userId)
    .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
  return reports[0] || null;
}

// GET /api/reports/status — is a fresh 20-day statement due?
router.get("/status", (req, res) => {
  const last = lastReportFor(req.user.id);
  const lastDate = last ? new Date(last.generated_at) : new Date(req.user.created_at);
  const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  res.json({
    due: daysSince >= REPORT_INTERVAL_DAYS,
    last_generated_at: last?.generated_at || null,
    days_since: daysSince,
    interval_days: REPORT_INTERVAL_DAYS,
  });
});

// GET /api/reports — past statement records (metadata only)
router.get("/", (req, res) => {
  const reports = store
    .all("reports", (r) => r.user_id === req.user.id)
    .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
  res.json({ reports });
});

// GET /api/reports/profit?from=&to= — profit aggregation for date range
router.get("/profit", (req, res) => {
  const { from, to } = req.query;
  const userId = req.user.id;

  // Sales in range
  let sales = store.all("sales", (s) => s.user_id === userId);
  if (from) sales = sales.filter((s) => s.date >= from);
  if (to) sales = sales.filter((s) => s.date <= to);
  const salesTotal = sales.reduce((acc, s) => acc + (s.amount || 0), 0);

  // Completed jobs with sale prices in range (use created_at date)
  let jobs = store.all("jobs", (j) => j.user_id === userId);
  if (from) jobs = jobs.filter((j) => (j.created_at || "").slice(0, 10) >= from);
  if (to) jobs = jobs.filter((j) => (j.created_at || "").slice(0, 10) <= to);
  const jobsTotal = jobs.reduce((acc, j) => acc + (j.sale_price || 0), 0);

  const total_income = salesTotal + jobsTotal;

  // Expenses in range
  let expenses = store.all("expenses", (e) => e.user_id === userId);
  if (from) expenses = expenses.filter((e) => e.date >= from);
  if (to) expenses = expenses.filter((e) => e.date <= to);
  const total_expenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const gross_profit = total_income - total_expenses;
  const margin_pct = total_income > 0 ? (gross_profit / total_income) * 100 : 0;

  const income_by_source = { jobs: jobsTotal, sales: salesTotal };

  const expenses_by_category = {};
  for (const e of expenses) {
    expenses_by_category[e.category] = (expenses_by_category[e.category] || 0) + (e.amount || 0);
  }

  res.json({
    total_income,
    total_expenses,
    gross_profit,
    margin_pct,
    income_by_source,
    expenses_by_category,
  });
});

// GET /api/reports/profit/pdf?from=&to= — profit report PDF
router.get("/profit/pdf", (req, res) => {
  const { from, to } = req.query;
  const user = req.user;
  const userId = user.id;

  // Sales
  let sales = store.all("sales", (s) => s.user_id === userId);
  if (from) sales = sales.filter((s) => s.date >= from);
  if (to) sales = sales.filter((s) => s.date <= to);
  const salesTotal = sales.reduce((acc, s) => acc + (s.amount || 0), 0);

  // Jobs
  let jobs = store.all("jobs", (j) => j.user_id === userId);
  if (from) jobs = jobs.filter((j) => (j.created_at || "").slice(0, 10) >= from);
  if (to) jobs = jobs.filter((j) => (j.created_at || "").slice(0, 10) <= to);
  const jobsTotal = jobs.reduce((acc, j) => acc + (j.sale_price || 0), 0);

  const total_income = salesTotal + jobsTotal;

  // Expenses
  let expenses = store.all("expenses", (e) => e.user_id === userId);
  if (from) expenses = expenses.filter((e) => e.date >= from);
  if (to) expenses = expenses.filter((e) => e.date <= to);
  const total_expenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const gross_profit = total_income - total_expenses;
  const margin_pct = total_income > 0 ? ((gross_profit / total_income) * 100).toFixed(1) : "0";

  const expenses_by_category = {};
  for (const e of expenses) {
    expenses_by_category[e.category] = (expenses_by_category[e.category] || 0) + (e.amount || 0);
  }

  const dateRange = from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `To ${to}` : "All time";
  const filename = `FundiPro-Profit-${user.slug || user.id}-${new Date().toISOString().slice(0, 10)}.pdf`;

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).fillColor("#B85042").text("FundiPro", { continued: true }).fillColor("#3A2E2A").text("  Profit Report");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#6B6058").text(`${user.name} · ${user.trade || ""} · ${user.location || ""}`);
  doc.text(`Period: ${dateRange}`);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  doc.strokeColor("#E7E8D1").lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  // Summary
  doc.fontSize(13).fillColor("#3A2E2A").text("Summary");
  doc.moveDown(0.4);
  doc.fontSize(11).fillColor("#33302E");
  doc.text(`Total Income:    KES ${total_income.toLocaleString()}`);
  doc.text(`Total Expenses:  KES ${total_expenses.toLocaleString()}`);
  doc.text(`Gross Profit:    KES ${gross_profit.toLocaleString()}`);
  doc.text(`Profit Margin:   ${margin_pct}%`);
  doc.moveDown();

  // Income breakdown
  doc.fontSize(13).fillColor("#3A2E2A").text("Income Breakdown");
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#6B6058");
  doc.text(`Jobs revenue:  KES ${jobsTotal.toLocaleString()} (${jobs.length} jobs)`);
  doc.text(`Direct sales:  KES ${salesTotal.toLocaleString()} (${sales.length} sales)`);
  doc.moveDown();

  // Expenses breakdown
  if (Object.keys(expenses_by_category).length > 0) {
    doc.fontSize(13).fillColor("#3A2E2A").text("Expenses by Category");
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#6B6058");
    for (const [cat, amt] of Object.entries(expenses_by_category)) {
      doc.text(`${cat.charAt(0).toUpperCase() + cat.slice(1)}:  KES ${amt.toLocaleString()}`);
    }
    doc.moveDown();
  }

  doc.moveDown();
  doc.fontSize(9).fillColor("#A7BEAE").text("Generated by FundiPro — track every shilling, grow your business.", { align: "center" });

  doc.end();
});

// GET /api/reports/generate — builds and streams a PDF statement, and logs it
router.get("/generate", (req, res) => {
  const user = req.user;
  const last = lastReportFor(user.id);
  const periodStart = last ? last.generated_at : user.created_at;
  const periodEnd = new Date().toISOString();

  const jobs = store
    .all("jobs", (j) => j.user_id === user.id && j.created_at >= periodStart && j.created_at <= periodEnd)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const allJobs = store.all("jobs", (j) => j.user_id === user.id);
  const orders = store.all("orders", (o) => o.fundi_id === user.id);
  const materials = store.all("materials", (m) => m.user_id === user.id);

  const revenue = jobs.reduce((a, j) => a + j.sale_price, 0);
  const profit = jobs.reduce((a, j) => a + j.profit, 0);
  const allTimeProfit = allJobs.reduce((a, j) => a + j.profit, 0);
  const lowStock = materials.filter((m) => m.quantity <= m.low_stock_threshold);

  store.insert("reports", { user_id: user.id, period_start: periodStart, period_end: periodEnd, generated_at: periodEnd, jobs_count: jobs.length, profit });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="FundiPro-Statement-${user.slug}-${periodEnd.slice(0, 10)}.pdf"`);
  doc.pipe(res);

  // -- Header --
  doc.fontSize(20).fillColor("#B85042").text("FundiPro", { continued: true }).fillColor("#3A2E2A").text("  Business Statement");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#6B6058").text(`${user.name} · ${user.trade} · ${user.location}`);
  doc.text(`Period: ${periodStart.slice(0, 10)} to ${periodEnd.slice(0, 10)}`);
  doc.moveDown();
  doc.strokeColor("#E7E8D1").lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  // -- Summary --
  doc.fontSize(13).fillColor("#3A2E2A").text("Summary for this period");
  doc.moveDown(0.4);
  doc.fontSize(11).fillColor("#33302E");
  doc.text(`Jobs recorded: ${jobs.length}`);
  doc.text(`Revenue: KES ${revenue.toLocaleString()}`);
  doc.text(`Profit: KES ${profit.toLocaleString()}`);
  doc.text(`Lifetime profit on FundiPro: KES ${allTimeProfit.toLocaleString()} (${allJobs.length} jobs total)`);
  doc.moveDown();

  // -- Job list --
  doc.fontSize(13).fillColor("#3A2E2A").text("Jobs this period");
  doc.moveDown(0.4);
  if (jobs.length === 0) {
    doc.fontSize(10).fillColor("#6B6058").text("No jobs were recorded in this period. Keep logging your work daily!");
  } else {
    doc.fontSize(9).fillColor("#6B6058");
    jobs.forEach((j) => {
      doc.text(
        `${j.created_at.slice(0, 10)}  ·  ${j.title}  ·  Sold KES ${j.sale_price.toLocaleString()}  ·  Profit KES ${j.profit.toLocaleString()} (${j.margin_pct}%)`
      );
    });
  }
  doc.moveDown();

  // -- Orders --
  doc.fontSize(13).fillColor("#3A2E2A").text("Orders on the books");
  doc.moveDown(0.4);
  const openOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  if (openOrders.length === 0) {
    doc.fontSize(10).fillColor("#6B6058").text("No open orders right now.");
  } else {
    doc.fontSize(9).fillColor("#6B6058");
    openOrders.forEach((o) => {
      doc.text(`${o.product_title} — ${o.customer_name} — ${o.status} — KES ${o.amount_paid.toLocaleString()} / ${o.total_price.toLocaleString()} paid`);
    });
  }
  doc.moveDown();

  // -- Materials --
  if (lowStock.length > 0) {
    doc.fontSize(13).fillColor("#9E3B3B").text("Materials running low");
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor("#6B6058");
    lowStock.forEach((m) => doc.text(`${m.name}: ${m.quantity} ${m.unit} left (reorder at ${m.low_stock_threshold})`));
    doc.moveDown();
  }

  doc.moveDown();
  doc.fontSize(9).fillColor("#A7BEAE").text("Generated automatically by FundiPro — be your own boss, track every shilling.", { align: "center" });

  doc.end();
});

export default router;
