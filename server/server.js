import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { store } from "./db/store.js";
import { seedIfEmpty } from "./db/seed.js";

import authRoutes from "./routes/auth.js";
import jobsRoutes from "./routes/jobs.js";
import clientsRoutes from "./routes/clients.js";
import storefrontRoutes from "./routes/storefront.js";
import paymentsRoutes from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";
import usersRoutes from "./routes/users.js";
import materialsRoutes from "./routes/materials.js";
import ordersRoutes from "./routes/orders.js";
import messagesRoutes from "./routes/messages.js";
import reportsRoutes from "./routes/reports.js";
import auditRoutes from "./routes/audit.js";
import salesRoutes from "./routes/sales.js";
import expensesRoutes from "./routes/expenses.js";
import { SUPPORT_WHATSAPP, SUPPORT_EMAIL, REPORT_INTERVAL_DAYS } from "./config.js";

dotenv.config();

// Auto-seed if database is empty (first deploy on Render etc.)
seedIfEmpty();

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://fundipro-v2-app.vercel.app",
    /\.vercel\.app$/
  ],
  credentials: true
}));
// Higher limit than Express's 100kb default — product photos travel as base64
// data URLs in this JSON-store demo (see routes/storefront.js for the real-world note).
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, name: "FundiPro API" }));

// Public, static platform info — single source of truth for contact details
// shown in the Settings / Support pages on the frontend.
app.get("/api/config", (req, res) => {
  res.json({ support_whatsapp: SUPPORT_WHATSAPP, support_email: SUPPORT_EMAIL, report_interval_days: REPORT_INTERVAL_DAYS });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/audit-logs", auditRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/expenses", expensesRoutes);

// Centralized error fallback so a thrown error never leaks a stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`FundiPro API running on http://localhost:${PORT}`);
});
