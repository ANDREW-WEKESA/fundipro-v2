import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";
import { initiateSTKPush, processCallback } from "../lib/mpesa.js";

const TIERS = {
  free: { price: 0 },
  pro: { price: 1200 },
  business: { price: 1200 },
};

export async function handlePayments(request, env, path) {
  const method = request.method;
  const url = new URL(request.url);

  // M-Pesa callback endpoint (public, no auth required)
  if (path === "/api/payments/mpesa-callback" && method === "POST") {
    try {
      const callbackData = await request.json();
      const result = processCallback(callbackData);

      // Find the payment by CheckoutRequestID
      const { results } = await env.DB.prepare(
        "SELECT * FROM payments WHERE checkout_request_id = ? LIMIT 1"
      ).bind(result.checkoutRequestID).all();

      if (results.length === 0) {
        console.error("Payment not found for CheckoutRequestID:", result.checkoutRequestID);
        return json({ ResultCode: 0, ResultDesc: "Accepted" }); // Always return success to M-Pesa
      }

      const payment = results[0];

      if (result.success) {
        // Update payment to success
        await env.DB.prepare(
          "UPDATE payments SET status = ?, mpesa_ref = ? WHERE id = ?"
        ).bind("success", result.mpesaReceiptNumber, payment.id).run();

        // Activate user's tier
        if (payment.tier && payment.tier !== "free") {
          await env.DB.prepare(
            "UPDATE users SET tier = ?, tier_status = 'active', updated_at = datetime('now') WHERE id = ?"
          ).bind(payment.tier, payment.user_id).run();
        }
      } else {
        // Update payment to failed
        await env.DB.prepare(
          "UPDATE payments SET status = ? WHERE id = ?"
        ).bind("failed", payment.id).run();
      }

      // Always respond with success to M-Pesa
      return json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error) {
      console.error("M-Pesa callback error:", error);
      return json({ ResultCode: 0, ResultDesc: "Accepted" }); // Still return success
    }
  }

  // All other endpoints require auth
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);

  // GET /api/payments - Get user's payment history
  if (path === "/api/payments" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC"
    ).bind(user.id).all();
    return json({ payments: results });
  }

  // POST /api/payments/stk-push - Initiate STK Push for subscription payment
  if (path === "/api/payments/stk-push" && method === "POST") {
    try {
      const { tier, phone } = await request.json();

      if (!tier || !TIERS[tier] || tier === "free") {
        return json({ error: "Invalid tier. Choose 'pro' or 'business'." }, 400);
      }

      const amount = TIERS[tier].price;
      const phoneNumber = phone || user.phone;

      if (!phoneNumber) {
        return json({ error: "Phone number required." }, 400);
      }

      // Create pending payment record
      const paymentId = nanoid();
      await env.DB.prepare(
        "INSERT INTO payments (id, user_id, tier, amount, status, mpesa_ref, checkout_request_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(paymentId, user.id, tier, amount, "pending", null, null).run();

      // Generate callback URL
      const callbackUrl = `${url.origin}/api/payments/mpesa-callback`;

      // Initiate STK Push
      const stkResult = await initiateSTKPush(
        env,
        phoneNumber,
        amount,
        `FundiPro-${tier}`, // Account reference
        `FundiPro ${tier} subscription`, // Transaction description
        callbackUrl
      );

      if (!stkResult.success) {
        // Update payment to failed
        await env.DB.prepare("UPDATE payments SET status = ? WHERE id = ?").bind("failed", paymentId).run();
        return json({ error: stkResult.error || "STK Push failed" }, 400);
      }

      // Update payment with checkout request ID
      await env.DB.prepare(
        "UPDATE payments SET checkout_request_id = ? WHERE id = ?"
      ).bind(stkResult.checkoutRequestID, paymentId).run();

      return json({
        success: true,
        paymentId,
        checkoutRequestID: stkResult.checkoutRequestID,
        message: "STK Push sent. Check your phone and enter M-Pesa PIN to confirm payment.",
      }, 202);
    } catch (error) {
      console.error("STK Push error:", error);
      return json({ error: error.message || "Failed to initiate payment" }, 500);
    }
  }

  // GET /api/payments/:id/status - Check payment status (for polling)
  if (path.match(/^\/api\/payments\/[^/]+\/status$/) && method === "GET") {
    const paymentId = path.split("/")[3];
    const { results } = await env.DB.prepare(
      "SELECT * FROM payments WHERE id = ? AND user_id = ? LIMIT 1"
    ).bind(paymentId, user.id).all();

    if (results.length === 0) {
      return json({ error: "Payment not found." }, 404);
    }

    return json({ payment: results[0] });
  }

  return json({ error: "Not found." }, 404);
}
