import { handleAuth } from "./routes/auth.js";
import { handleStorefront } from "./routes/storefront.js";
import { handleUploads } from "./routes/uploads.js";
import { handleJobs } from "./routes/jobs.js";
import { handleOrders } from "./routes/orders.js";
import { handleMaterials } from "./routes/materials.js";
import { handleMessages } from "./routes/messages.js";
import { handleAdmin } from "./routes/admin.js";
import { handleUsers } from "./routes/users.js";
import { handleSales } from "./routes/sales.js";
import { handleExpenses } from "./routes/expenses.js";
import { handleReports } from "./routes/reports.js";
import { handlePayments } from "./routes/payments.js";
import { handleAudit } from "./routes/audit.js";
import { corsHeaders, handleOptions } from "./lib/cors.js";

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") return handleOptions(request);

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check
      if (path === "/api/health") {
        return json({ ok: true, name: "FundiPro API (Cloudflare Workers)" });
      }

      // Config
      if (path === "/api/config") {
        return json({
          support_whatsapp: env.SUPPORT_WHATSAPP || "0107875549",
          support_email: env.SUPPORT_EMAIL || "andrewwekesa675@gmail.com",
          report_interval_days: 20,
        });
      }

      // Route dispatch
      if (path.startsWith("/api/uploads"))         return handleUploads(request, env, path);
      if (path.startsWith("/api/auth"))             return handleAuth(request, env, path);
      if (path.startsWith("/api/storefront"))     return handleStorefront(request, env, path);
      if (path.startsWith("/api/jobs"))           return handleJobs(request, env, path);
      if (path.startsWith("/api/orders"))         return handleOrders(request, env, path);
      if (path.startsWith("/api/materials"))      return handleMaterials(request, env, path);
      if (path.startsWith("/api/messages"))       return handleMessages(request, env, path);
      if (path.startsWith("/api/admin/audit-logs")) return handleAudit(request, env, path);
      if (path.startsWith("/api/admin"))          return handleAdmin(request, env, path);
      if (path.startsWith("/api/users"))          return handleUsers(request, env, path);
      if (path.startsWith("/api/sales"))          return handleSales(request, env, path);
      if (path.startsWith("/api/expenses"))       return handleExpenses(request, env, path);
      if (path.startsWith("/api/reports"))        return handleReports(request, env, path);
      if (path.startsWith("/api/payments"))       return handlePayments(request, env, path);

      return json({ error: "Not found", path }, 404);
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Something went wrong on our side.", details: err.message }, 500);
    }
  },
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
