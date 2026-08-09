import { TIERS } from "../config.js";

const TIER_ORDER = { free: 0, pro: 1, business: 2 };

export function requireTier(minTier) {
  return (req, res, next) => {
    const userTier = req.user?.tier || "free";
    const userTierStatus = req.user?.tier_status;
    const effectiveTier = userTierStatus === "active" ? userTier : "free";
    if (TIER_ORDER[effectiveTier] >= TIER_ORDER[minTier]) return next();
    return res.status(403).json({
      error: `This feature requires the ${minTier} plan.`,
      upgrade_required: true,
      required_tier: minTier,
    });
  };
}
