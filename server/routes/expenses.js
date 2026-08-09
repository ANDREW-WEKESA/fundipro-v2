import { Router } from "express";
import { store } from "../db/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const VALID_CATEGORIES = ["materials", "tools", "transport", "rent", "utilities", "labour", "marketing", "other"];

// GET /api/expenses?from=&to=&category=
router.get("/", (req, res) => {
  const { from, to, category } = req.query;
  let expenses = store.all("expenses", (e) => e.user_id === req.user.id);

  if (from) expenses = expenses.filter((e) => e.date >= from);
  if (to) expenses = expenses.filter((e) => e.date <= to);
  if (category) expenses = expenses.filter((e) => e.category === category);

  expenses = expenses.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at));

  const total_amount = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  res.json({ expenses, total_amount });
});

// POST /api/expenses
router.post("/", (req, res) => {
  const { amount, category, description, date } = req.body || {};
  if (amount == null || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Amount is required and must be a number." });
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Category must be one of: ${VALID_CATEGORIES.join(", ")}.` });
  }

  const expense = store.insert("expenses", {
    user_id: req.user.id,
    amount: Number(amount),
    category,
    description: description || "",
    date: date || new Date().toISOString().slice(0, 10),
  });
  res.status(201).json({ expense });
});

// PATCH /api/expenses/:id
router.patch("/:id", (req, res) => {
  const expense = store.get("expenses", (e) => e.id === req.params.id);
  if (!expense) return res.status(404).json({ error: "Expense not found." });
  if (expense.user_id !== req.user.id) return res.status(403).json({ error: "Not your expense." });

  const { amount, category, description, date } = req.body || {};
  const patch = {};
  if (amount != null) patch.amount = Number(amount);
  if (category != null) {
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category.` });
    }
    patch.category = category;
  }
  if (description != null) patch.description = description;
  if (date != null) patch.date = date;

  const updated = store.update("expenses", (e) => e.id === req.params.id, patch);
  res.json({ expense: updated });
});

// DELETE /api/expenses/:id
router.delete("/:id", (req, res) => {
  const expense = store.get("expenses", (e) => e.id === req.params.id);
  if (!expense) return res.status(404).json({ error: "Expense not found." });
  if (expense.user_id !== req.user.id) return res.status(403).json({ error: "Not your expense." });

  store.remove("expenses", (e) => e.id === req.params.id);
  res.json({ ok: true });
});

export default router;
