import { useEffect, useState } from "react";
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

function PayModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-bark/60 flex items-center justify-center z-50 px-5">
      <div className="bg-white rounded-2xl p-7 max-w-sm w-full text-center shadow-card space-y-4">
        <div className="text-4xl">📱</div>
        <h3 className="font-display font-bold text-bark text-lg">Pay KES 1,200 via M-Pesa</h3>
        <div className="bg-sand/60 rounded-xl p-4 text-left space-y-2 text-sm">
          <p className="font-semibold" style={{color:"var(--ink)"}}>Send to:</p>
          <p style={{color:"var(--ink)"}}>📞 <strong>0710435113</strong> — Andrew Wekesa</p>
          <p className="text-xs mt-1" style={{color:"var(--muted)"}}>Use your phone number as the M-Pesa reference so Andrew can identify your payment.</p>
        </div>
        <p className="text-sm" style={{color:"var(--muted)"}}>After paying, tap the button below to notify Andrew. Your account will be activated within minutes.</p>
        <div className="flex gap-3">
          <a
            href={`https://wa.me/254107875549?text=Hi%20Andrew%2C%20I%20just%20paid%20KES%201200%20for%20FundiPro.%20Please%20activate%20my%20account.%20My%20phone%3A%20`}
            target="_blank" rel="noreferrer"
            className="btn-primary flex-1 justify-center"
          >
            💬 Contact Support on WhatsApp
          </a>
          <button className="btn-secondary flex-1" onClick={onClose}>Close</button>
        </div>
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
          onClose={() => { setShowModal(false); loadPayments(); }}
        />
      )}
    </FundiLayout>
  );
}
