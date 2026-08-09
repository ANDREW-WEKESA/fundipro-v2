import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TIER_LABELS = { free: "Free", pro: "Pro", business: "Business" };

export default function UpgradePrompt({ feature, requiredTier = "pro" }) {
  const { user } = useAuth();
  const currentPlan = TIER_LABELS[user?.tier] || "Free";
  const requiredPlan = TIER_LABELS[requiredTier] || requiredTier;

  return (
    <div className="card border border-terracotta/30 text-center py-10 space-y-4">
      <div className="text-4xl">🔒</div>
      <div>
        <h3 className="font-display font-bold text-lg" style={{ color: "var(--ink)" }}>
          {feature || "This feature"} requires the {requiredPlan} plan
        </h3>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          You're currently on the <strong>{currentPlan}</strong> plan.
          Upgrade to unlock {feature?.toLowerCase() || "this feature"} and much more.
        </p>
      </div>
      <Link to="/app/billing" className="btn-primary inline-flex">
        ⬆️ Upgrade to {requiredPlan}
      </Link>
    </div>
  );
}
