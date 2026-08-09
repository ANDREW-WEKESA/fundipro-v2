import { Router } from "express";
import { store } from "../db/store.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/audit-logs?page=1&limit=20
router.get("/", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const all = store
    .all("audit_logs")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const logs = all.slice((page - 1) * limit, page * limit);

  res.json({ logs, total, page, pages });
});

export default router;
