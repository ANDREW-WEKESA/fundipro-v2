import { useEffect, useState, useRef } from "react";
import FundiLayout from "./FundiLayout";
import { Banner } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

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

function StkModal({ onClose, onSuccess }) {
  const [status, setStatus] = useState("sending");
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    let poll;
    api.post("/payments/stk-push", { tier: "pro" }).then(({ data }) => {
      setStatus("pending");
      poll = setInterval(async () => {
        const { data: s } = await api.get(`/payments/${data.payment.id}/status`);
        if (s.payment.status !== "pending") {
          clearInterval(poll);
          setStatus(s.payment.status);
          if (s.payment.status === "success") onSuccess();
        }
      }, 1200);
    });
    return () => clearInterval(poll);
  }, []);

  return (
    <div className="fixed inset-0 bg-bark/60 flex items-center justify-center z-50 px-5">
      <div className="bg-white rounded-2xl p-7 max-w-sm w-full text-center shadow-card">
        {status !== "success" && status !== "failed" && (
          <>
            <span className="h-10 w-10 mx-auto rounded-full border-2 border-terracotta border-t-transparent animate-spin block mb-4"/>
            <h3 className="font-display font-bold text-bark">Check your phone</h3>
            <p className="text-sm text-muted mt-2">M-Pesa STK push sent — KES {PLAN_PRICE}. Enter your PIN to confirm.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-display font-bold text-good">Payment confirmed!</h3>
            <p className="text-sm text-muted mt-2">You now have full access to FundiPro for 30 days.</p>
            <button className="btn-primary mt-5 w-full" onClick={onClose}>Done</button>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="font-display font-bold text-bad">Payment failed</h3>
            <p className="text-sm text-muted mt-2">Wrong PIN or low balance. Try again anytime.</p>
            <button className="btn-secondary mt-5 w-full" onClick={onClose}>Close</button>
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
                    {p.status === "success" ? `KES ${p.amount.toLocaleString()}` : p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <StkModal
          onClose={() => { setShowModal(false); loadPayments(); }}
          onSuccess={() => { refreshMe(); loadPayments(); }}
        />
      )}
    </FundiLayout>
  );
}

const PLANS = [
  { id: "free", label: "Free", price: 0, features: ["3 jobs / month", "Cost calculator", "Basic profit tool"] },
  { id: "pro", label: "Pro", price: 500, features: ["Unlimited jobs", "Full job history", "Public storefront", "M-Pesa invoices"] },
  { id: "business", label: "Business", price: 1200, features: ["Everything in Pro", "Client management", "SMS reminders", "Priority support"] },
];

const FEATURE_COMPARISON = [
  { feature: "Monthly jobs limit", free: "3 jobs", pro: "Unlimited", business: "Unlimited" },
  { feature: "Job cost calculator", free: "✅", pro: "✅", business: "✅" },
  { feature: "Full job history", free: "✅", pro: "✅", business: "✅" },
  { feature: "Sales tracking", free: "✅", pro: "✅", business: "✅" },
  { feature: "Expense tracking", free: "✅", pro: "✅", business: "✅" },
  { feature: "Profit reports + PDF", free: "✅", pro: "✅", business: "✅" },
  { feature: "Materials inventory", free: "✅", pro: "✅", business: "✅" },
  { feature: "Public storefront", free: "❌", pro: "✅", business: "✅" },
  { feature: "M-Pesa invoices", free: "❌", pro: "✅", business: "✅" },
  { feature: "Client management", free: "❌", pro: "❌", business: "✅" },
  { feature: "SMS reminders to clients", free: "❌", pro: "❌", business: "✅" },
  { feature: "Priority support", free: "❌", pro: "❌", business: "✅" },
];

function StkModal({ tier, onClose, onSuccess }) {
  const [status, setStatus] = useState("sending"); // sending -> pending -> success/failed
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    let poll;
    api.post("/payments/stk-push", { tier }).then(({ data }) => {
      setStatus("pending");
      poll = setInterval(async () => {
        const { data: s } = await api.get(`/payments/${data.payment.id}/status`);
        if (s.payment.status !== "pending") {
          clearInterval(poll);
          setStatus(s.payment.status);
          if (s.payment.status === "success") onSuccess();
        }
      }, 1200);
    });
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  return (
    <div className="fixed inset-0 bg-bark/60 flex items-center justify-center z-50 px-5">
      <div className="bg-white rounded-2xl p-7 max-w-sm w-full text-center shadow-card">
        {status !== "success" && status !== "failed" && (
          <>
            <span className="h-10 w-10 mx-auto rounded-full border-2 border-terracotta border-t-transparent animate-spin block mb-4" />
            <h3 className="font-display font-bold text-bark">Check your phone</h3>
            <p className="text-sm text-muted mt-2">
              We sent an M-Pesa STK push to your phone for KES {PLANS.find((p) => p.id === tier)?.price}. Enter your PIN to confirm.
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-display font-bold text-good">Payment confirmed</h3>
            <p className="text-sm text-muted mt-2">You're now on the {PLANS.find((p) => p.id === tier)?.label} plan.</p>
            <button className="btn-primary mt-5 w-full" onClick={onClose}>Done</button>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="font-display font-bold text-bad">Payment didn't go through</h3>
            <p className="text-sm text-muted mt-2">This can happen with a wrong PIN or low balance. You can try again any time.</p>
            <button className="btn-secondary mt-5 w-full" onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Billing() {
  const { user, refreshMe } = useAuth();
  const [modalTier, setModalTier] = useState(null);
  const [payments, setPayments] = useState([]);

  function loadPayments() {
    api.get("/payments").then(({ data }) => setPayments(data.payments));
  }
  useEffect(loadPayments, []);

  return (
    <FundiLayout title="Billing & Plan">
      <div className="space-y-8">
        <Banner kind="info">
          FundiPro never deletes your data if a payment is missed. You get a 7-day grace period before quietly
          dropping back to Free — your job history stays safe either way.
        </Banner>

        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((p) => {
            const isCurrent = user.tier === p.id;
            return (
              <div key={p.id} className={`card ${p.id === "pro" ? "border-terracotta ring-1 ring-terracotta" : ""}`}>
                <h3 className="font-display font-bold text-bark">{p.label}</h3>
                <p className="font-display text-2xl font-bold text-bark mt-1">KES {p.price}<span className="text-sm font-body font-normal text-muted">/mo</span></p>
                <ul className="text-sm text-ink/80 mt-3 space-y-1.5">
                  {p.features.map((f) => <li key={f}>• {f}</li>)}
                </ul>
                {isCurrent ? (
                  <span className="btn-secondary w-full mt-5 cursor-default opacity-70">Current plan</span>
                ) : p.id === "free" ? (
                  <span className="text-xs text-muted block mt-5">Downgrade by letting your plan lapse.</span>
                ) : (
                  <button className="btn-primary w-full mt-5" onClick={() => setModalTier(p.id)}>
                    Upgrade via M-Pesa
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <h2 className="font-display font-bold text-bark mb-3">Payment history</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-muted">No payments yet.</p>
          ) : (
            <div className="card divide-y divide-bark/10">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                  <span className="text-bark">{p.tier} upgrade</span>
                  <span className="text-muted">{new Date(p.created_at).toLocaleDateString()}</span>
                  <span className={p.status === "success" ? "text-good font-semibold" : p.status === "failed" ? "text-bad" : "text-muted"}>
                    {p.status === "success" ? `KES ${p.amount}` : p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature comparison table */}
        <div>
          <h2 className="font-display font-bold text-bark mb-3">What's included in each plan</h2>
          <div className="card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Feature</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Free</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-terracotta">Pro</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Business</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((row, i) => (
                  <tr key={i} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--ink)" }}>{row.feature}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>{row.free}</td>
                    <td className="px-4 py-3 text-center font-semibold"
                      style={{ color: row.pro === "❌" ? "var(--muted)" : "var(--ink)", background: user.tier === "pro" ? "var(--sand)" : undefined }}>
                      {row.pro}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: row.business === "❌" ? "var(--muted)" : "var(--ink)" }}>{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalTier && (
        <StkModal
          tier={modalTier}
          onClose={() => {
            setModalTier(null);
            loadPayments();
          }}
          onSuccess={() => {
            refreshMe();
            loadPayments();
          }}
        />
      )}
    </FundiLayout>
  );
}
