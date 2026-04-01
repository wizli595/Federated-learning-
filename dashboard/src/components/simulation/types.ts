import type { ClassifyResponse } from "../../services/api";

export const PRESETS = {
  ham: {
    label: "Legitimate", color: "emerald" as const,
    from: "colleague@company.com", reply_to: "", has_attachment: false,
    subject: "Team sync tomorrow at 10am",
    body: "Hi everyone, just a quick reminder about our weekly sync tomorrow at 10am. Please bring your updates. Thanks, Sarah",
  },
  marketing: {
    label: "Marketing Spam", color: "amber" as const,
    from: "deals@shopnow-promo.biz", reply_to: "", has_attachment: false,
    subject: "EXCLUSIVE: 70% OFF — Today only!",
    body: "Congratulations! You have been selected for our exclusive limited offer! FREE shipping + 70% off everything. Click now to claim your bonus reward! Expires tonight! http://click-deal.biz http://claim-reward.biz http://shop-now.biz",
  },
  phishing: {
    label: "Phishing", color: "red" as const,
    from: "security@bankofamerica-alert.net",
    reply_to: "collect@harvest-form.ru", has_attachment: true,
    subject: "URGENT: Your account has been compromised",
    body: "Dear Valued Customer, We have detected SUSPICIOUS activity on your account. It will be IMMEDIATELY suspended unless you verify NOW. Click: http://verify-account-now.net http://secure-login.phish.ru — Urgent action required! Limited time!",
  },
  bec: {
    label: "CEO Fraud", color: "orange" as const,
    from: "d.johnson@company-board.net",
    reply_to: "replies@external-mail.io", has_attachment: false,
    subject: "Urgent wire transfer needed",
    body: "Hi, I am in a board meeting and cannot take calls. Please process a wire transfer of $47,500 to our new vendor immediately. Account: 8821-0047-3312, Routing: 021000021. Time sensitive. Confirm when done. - David",
  },
  invoice: {
    label: "Fake Invoice", color: "violet" as const,
    from: "billing@paypal-invoice.net",
    reply_to: "payment@collect-invoices.biz", has_attachment: true,
    subject: "Invoice #INV-2026-0892 — Payment due",
    body: "Dear customer, your invoice of $249.00 is now due. Please transfer payment to account 4421-8812 by end of day to avoid service suspension. Wire reference: INV-2026-0892. Financial department.",
  },
} as const;

export type PresetKey    = keyof typeof PRESETS;
export type PacketStatus = "idle" | "sending" | "at-server" | "delivering" | "done" | "error";

export const PRESET_CYCLE: PresetKey[] = ["ham", "marketing", "phishing", "bec", "invoice"];

export const C = {
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400", beam: "#10b981" },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/40",   text: "text-amber-400",   dot: "bg-amber-400",   beam: "#f59e0b" },
  red:     { bg: "bg-red-500/10",     border: "border-red-500/40",     text: "text-red-400",     dot: "bg-red-400",     beam: "#ef4444" },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/40",  text: "text-orange-400",  dot: "bg-orange-400",  beam: "#f97316" },
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/40",  text: "text-violet-400",  dot: "bg-violet-400",  beam: "#8b5cf6" },
  custom:  { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-400",    dot: "bg-blue-400",    beam: "#60a5fa" },
} as const;

export interface SimEmail {
  id: string; preset: PresetKey;
  from: string; reply_to: string; has_attachment: boolean;
  subject: string; body: string;
  status: PacketStatus; result?: ClassifyResponse;
  editing: boolean;
  customized: boolean;
}

export const STATUS_ORDER: PacketStatus[] = ["idle","sending","at-server","delivering","done","error"];
export const gte = (s: PacketStatus, t: PacketStatus) =>
  STATUS_ORDER.indexOf(s) >= STATUS_ORDER.indexOf(t);

export const uid = () => Math.random().toString(36).slice(2, 8);
export const makeEmail = (p: PresetKey): SimEmail =>
  ({ id: uid(), preset: p, ...PRESETS[p], status: "idle", editing: false, customized: false });
