import { Router } from "express";
import { store } from "../db/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/sales?from=&to=
router.get("/", (req, res) => {
  const { from, to } = req.query;
  let sales = store.all("sales", (s) => s.user_id === req.user.id);

  if (from) sales = sales.filter((s) => s.date >= from);
  if (to) sales = sales.filter((s) => s.date <= to);

  sales = sales.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at));

  const total_amount = sales.reduce((acc, s) => acc + (s.amount || 0), 0);
  res.json({ sales, total_amount });
});

// POST /api/sales
router.post("/", (req, res) => {
  const { amount, description, customer_name, payment_method, date } = req.body || {};
  if (amount == null || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Amount is required and must be a number." });
  }

  const sale = store.insert("sales", {
    user_id: req.user.id,
    amount: Number(amount),
    description: description || "",
    customer_name: customer_name || "",
    payment_method: payment_method || "cash",
    date: date || new Date().toISOString().slice(0, 10),
  });
  res.status(201).json({ sale });
});

// PATCH /api/sales/:id
router.patch("/:id", (req, res) => {
  const sale = store.get("sales", (s) => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale not found." });
  if (sale.user_id !== req.user.id) return res.status(403).json({ error: "Not your sale." });

  const { amount, description, customer_name, payment_method, date } = req.body || {};
  const patch = {};
  if (amount != null) patch.amount = Number(amount);
  if (description != null) patch.description = description;
  if (customer_name != null) patch.customer_name = customer_name;
  if (payment_method != null) patch.payment_method = payment_method;
  if (date != null) patch.date = date;

  const updated = store.update("sales", (s) => s.id === req.params.id, patch);
  res.json({ sale: updated });
});

// DELETE /api/sales/:id
router.delete("/:id", (req, res) => {
  const sale = store.get("sales", (s) => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale not found." });
  if (sale.user_id !== req.user.id) return res.status(403).json({ error: "Not your sale." });

  store.remove("sales", (s) => s.id === req.params.id);
  res.json({ ok: true });
});

export default router;
