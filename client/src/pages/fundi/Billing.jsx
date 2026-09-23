import { useEffect, useState } from "react";
import FundiLayout from "./FundiLayout";
import { Banner, Spinner } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import api, { errMsg } from "../../lib/api";

const PLAN_PRICE = 1200;

const FEATURES = [
  "Unlimited jobs per month",
  "Job cost calculator & profit tool",
  "Full job history",
  "Sales & expense tracking",
  "Profit reports + PDF export",
  "Materials inventory",
  "Public storefront (verified)",
  "Client management",
  "SMS reminders to clients",
  "Priority WhatsApp support",
];

function PayModal({ onClose, userPhone }) {
  const config = useConfig();
  const [stkPushActive, setStkPushActive] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(userPhone || "");

  async function initiateSTKPush() {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    
    setStkPushActive(true);
    setPaymentStatus("initiating");
    setError("");
    
    try {
      const { data } = await api.post("/payments/stk-push", {
        tier: "pro",
        phone: phoneNumber,
      });
      
      setPaymentStatus("pending");
      
      // Poll for payment status
      const paymentId = data.paymentId;
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await api.get(`/payments/${paymentId}/status`);
          const payment = statusRes.data.payment;
          
          if (payment.status === "success") {
            clearInterval(pollInterval);
            setPaymentStatus("success");
            setTimeout(() => {
              window.location.reload(); // Refresh to show updated tier
            }, 2000);
          } else if (payment.status === "failed") {
            clearInterval(pollInterval);
            setPaymentStatus("failed");
            setError("Payment failed. Please try again or use manual payment.");
          }
        } catch (err) {
          console.error("Status check error:", err);
        }
      }, 3000); // Poll every 3 seconds
      
      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (paymentStatus === "pending") {
          setPaymentStatus("timeout");
          setError("Payment timed out. Check your M-Pesa and contact support if payment went through.");
        }
      }, 120000);
      
    } catch (err) {
      setPaymentStatus("failed");
      setError(errMsg(err));
    }
  }

  return (
    <div className="fixed inset-0 bg-bark/60 flex items-center justify-center z-50 px-5">
      <div className="bg-white dark:bg-bark rounded-2xl p-7 max-w-md w-full shadow-card space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">📱</div>
          <h3 className="font-display font-bold text-lg" style={{color:"var(--ink)"}}>Pay KES 1,200 for FundiPro</h3>
        </div>

        {stkPushActive ? (
          <div className="bg-terracotta/10 dark:bg-terracotta/20 rounded-xl p-6 text-center space-y-3">
            {paymentStatus === "initiating" && (
              <>
                <div className="text-4xl">⏳</div>
                <p className="font-semibold" style={{color:"var(--ink)"}}>Initiating payment...</p>
              </>
            )}
            {paymentStatus === "pending" && (
              <>
                <div className="text-4xl">📱</div>
                <p className="font-semibold" style={{color:"var(--ink)"}}>Check your phone!</p>
                <p className="text-sm" style={{color:"var(--muted)"}}>
                  Enter your M-Pesa PIN to complete payment of KES 1,200
                </p>
                <Spinner />
              </>
            )}
            {paymentStatus === "success" && (
              <>
                <div className="text-4xl">✅</div>
                <p className="font-semibold text-good">Payment successful!</p>
                <p className="text-sm" style={{color:"var(--muted)"}}>Your account is now active. Refreshing...</p>
              </>
            )}
            {(paymentStatus === "failed" || paymentStatus === "timeout") && (
              <>
                <div className="text-4xl">⚠️</div>
                <p className="font-semibold" style={{color:"var(--ink)"}}>Automatic payment unavailable</p>
                <p className="text-xs" style={{color:"var(--muted)"}}>{error}</p>
                <p className="text-sm mt-2" style={{color:"var(--ink)"}}>Please use manual payment below instead.</p>
                <button onClick={() => setStkPushActive(false)} className="btn-secondary w-full">Use Manual Payment</button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Manual Payment Option - Now Primary */}
              <div className="bg-terracotta/10 dark:bg-terracotta/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💳</span>
                  <div>
                    <p className="font-semibold" style={{color:"var(--ink)"}}>Pay via M-Pesa Lipa Na M-Pesa</p>
                    <p className="text-xs" style={{color:"var(--muted)"}}>Quick and reliable</p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-bark rounded-lg p-4 text-center">
                  <p className="text-xs font-semibold mb-2" style={{color:"var(--muted)"}}>Till Number</p>
                  <p className="text-3xl font-bold text-terracotta mb-2">{config.platform_till_number || "1725732"}</p>
                  <p className="text-xs" style={{color:"var(--muted)"}}>Amount: KES 1,200</p>
                </div>

                <div className="text-xs space-y-1" style={{color:"var(--muted)"}}>
                  <p className="font-semibold" style={{color:"var(--ink)"}}>📍 How to pay:</p>
                  <ol className="list-decimal ml-5 space-y-0.5">
                    <li>Open M-Pesa on your phone</li>
                    <li>Select "Lipa Na M-Pesa"</li>
                    <li>Select "Buy Goods and Services"</li>
                    <li>Enter Till Number: <strong>{config.platform_till_number || "1725732"}</strong></li>
                    <li>Enter Amount: <strong>KES 1,200</strong></li>
                    <li>Enter your M-Pesa PIN and confirm</li>
                  </ol>
                </div>

                <a
                  href={`https://wa.me/254107875549?text=Hi%2C%20I%20just%20paid%20KES%201200%20for%20FundiPro%20via%20till%20${config.platform_till_number || "1725732"}.%20Please%20activate%20my%20account.%20My%20phone%3A%20${userPhone}`}
                  target="_blank" rel="noreferrer"
                  className="btn-primary w-full text-center py-3"
                >
                  💬 Confirm Payment on WhatsApp
                </a>
                <p className="text-xs text-center" style={{color:"var(--muted)"}}>
                  ✅ Account activated within 1 hour after confirmation
                </p>
              </div>

              {/* Note about STK Push */}
              <div className="text-center text-xs pt-2" style={{color:"var(--muted)"}}>
                💡 Automatic payment (STK Push) coming soon when we upgrade the till
              </div>
            </div>

            <button className="btn-ghost w-full" onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Billing() {
  const { user, refreshMe } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [payments, setPayments] = useState([]);
  const isActive = user?.tier !== "free" && user?.tier_status === "active";

  function loadPayments() {
    api.get("/payments").then(({ data }) => setPayments(data.payments || [])).catch(() => {});
  }
  useEffect(loadPayments, []);
  return (
    <FundiLayout title="Billing & Plan">
      <div className="max-w-xl space-y-8">

        {/* Current status */}
        <div className={`card text-center space-y-2 ${isActive ? "border-good/40" : "border-terracotta/40"}`}>
          {isActive ? (
            <>
              <div className="text-3xl">✅</div>
              <h2 className="font-display font-bold text-lg" style={{color:"var(--ink)"}}>Your plan is active</h2>
              <p className="text-sm" style={{color:"var(--muted)"}}>Full access to all FundiPro features.</p>
            </>
          ) : (
            <>
              <div className="text-3xl">🔒</div>
              <h2 className="font-display font-bold text-lg" style={{color:"var(--ink)"}}>Free plan — limited access</h2>
              <p className="text-sm" style={{color:"var(--muted)"}}>You're on the free plan (3 jobs/month). Upgrade to unlock everything.</p>
            </>
          )}
        </div>

        {/* The one plan */}
        <div className="card border-2 border-terracotta space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-xl font-bold" style={{color:"var(--ink)"}}>FundiPro Full Access</h3>
              <p className="text-sm mt-1" style={{color:"var(--muted)"}}>Everything you need to run your business professionally.</p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-display text-3xl font-bold text-terracotta">KES 1,200</span>
              <span className="text-sm block" style={{color:"var(--muted)"}}>per month</span>
            </div>
          </div>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm" style={{color:"var(--ink)"}}>
                <span className="text-good font-bold">✓</span> {f}
              </li>
            ))}
          </ul>
          {isActive ? (
            <div className="bg-good/10 text-good text-sm font-semibold px-4 py-3 rounded-xl text-center">Active — renews monthly via M-Pesa</div>
          ) : (
            <button className="btn-primary w-full py-3 text-base" onClick={() => setShowModal(true)}>
              Pay KES 1,200 via M-Pesa
            </button>
          )}
          <p className="text-xs text-center" style={{color:"var(--muted)"}}>
            No contracts. Cancel anytime by simply not renewing. Your data is always safe.
          </p>
        </div>

        {/* Grace period note */}
        <Banner kind="info">
          If a payment is missed you get a 7-day grace period before access is restricted. Your job history and data are never deleted.
        </Banner>

        {/* Payment history */}
        <div>
          <h2 className="section-title mb-3">Payment history</h2>
          {payments.length === 0 ? (
            <p className="text-sm" style={{color:"var(--muted)"}}>No payments yet.</p>
          ) : (
            <div className="card divide-y" style={{borderColor:"var(--border)"}}>
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                  <span style={{color:"var(--ink)"}}>Monthly subscription</span>
                  <span style={{color:"var(--muted)"}}>{new Date(p.created_at).toLocaleDateString()}</span>
                  <span className={p.status === "success" ? "text-good font-semibold" : p.status === "failed" ? "text-bad" : ""}>
                    {p.status === "success" ? `KES ${Number(p.amount).toLocaleString()}` : p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <PayModal
          userPhone={user?.phone}
          onClose={() => { setShowModal(false); loadPayments(); }}
        />
      )}
    </FundiLayout>
  );
}
