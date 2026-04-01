export const PROFILES = ["marketing", "balanced", "phishing"] as const;

export const PROFILE_DESC: Record<string, string> = {
  marketing: "70% spam — bulk promo emails vs transactional receipts (URL-heavy)",
  balanced:  "65% spam — credential phishing vs casual personal emails (CAPS + urgency)",
  phishing:  "55% spam — money scam emails vs professional work emails (money words)",
};

export const PROFILE_COLOR: Record<string, string> = {
  marketing: "text-amber-400  bg-amber-400/10  border-amber-400/20",
  balanced:  "text-blue-400   bg-blue-400/10   border-blue-400/20",
  phishing:  "text-red-400    bg-red-400/10    border-red-400/20",
};

export const PROFILE_GRADIENT: Record<string, string> = {
  marketing: "from-amber-500 to-orange-600",
  balanced:  "from-blue-500  to-indigo-600",
  phishing:  "from-red-500   to-rose-700",
};
