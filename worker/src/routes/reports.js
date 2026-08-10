import { json } from "../index.js";
import { requireAuth } from "../lib/auth.js";

export async function handleReports(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);

  if (path === "/api/reports/profit" && method === "GET") {
    const { results: sales } = await env.DB.prepare("SELECT amount FROM sales WHERE user_id = ? AND date >= ? AND date <= ?").bind(user.id, from, to).all();
    const { results: jobs } = await env.DB.prepare("SELECT sale_price FROM jobs WHERE user_id = ? AND created_at >= ? AND created_at <= ?").bind(user.id, from + "T00:00:00", to + "T23:59:59").all();
    const { results: expenses } = await env.DB.prepare("SELECT amount, category FROM expenses WHERE user_id = ? AND date >= ? AND date <= ?").bind(user.id, from, to).all();

    const salesIncome = sales.reduce((a, s) => a + s.amount, 0);
    const jobsIncome = jobs.reduce((a, j) => a + j.sale_price, 0);
    const totalIncome = salesIncome + jobsIncome;
    const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
    const grossProfit = totalIncome - totalExpenses;
    const marginPct = totalIncome > 0 ? Math.round((grossProfit / totalIncome) * 1000) / 10 : 0;

    const expensesByCategory = {};
    for (const e of expenses) expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;

    return json({ from, to, total_income: totalIncome, total_expenses: totalExpenses, gross_profit: grossProfit, margin_pct: marginPct, income_by_source: { jobs: jobsIncome, sales: salesIncome }, expenses_by_category: expensesByCategory });
  }

  return json({ error: "Not found." }, 404);
}
