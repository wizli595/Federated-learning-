import type { ClassifyRequest } from "../../services/api";

const SAMPLES = {
  marketing: {
    subjects: [
      "EXCLUSIVE DEAL: 70% OFF — TODAY ONLY!!!",
      "You've been selected for our special offer",
      "Free gift inside — claim now before it expires",
      "Congratulations! You're our lucky winner",
    ],
    bodies: [
      `Dear Customer,\n\nCLICK HERE to claim your FREE gift!\nVisit www.deals.com/offer www.promo.com/sale\n\nBuy now and save 70%! Limited time offer!!!\nwww.shop.com/discount\n\nUnsubscribe | Terms`,
      `Dear Valued Member,\n\nYou've WON a prize! Claim at www.win.com/prize\nSpecial discount: www.sale.com/exclusive\nFree bonus: www.free.com/gift\n\n© 2024 Promotions Inc.`,
    ],
    sender:   "offers@promo-deals-99.com",
    reply_to: "noreply@track-clicks.net",
  },
  phishing: {
    subjects: [
      "URGENT: Your account has been compromised",
      "IMMEDIATE ACTION REQUIRED — Verify your identity",
      "Your bank account will be suspended",
      "WARNING: Unauthorized login detected",
    ],
    bodies: [
      `DEAR CUSTOMER,\n\nYOUR ACCOUNT HAS BEEN COMPROMISED!!!\nYOU MUST ACT NOW OR YOUR ACCOUNT WILL BE CLOSED.\n\nCLICK HERE IMMEDIATELY: http://verify-now.tk\n\nFINAL WARNING - RESPOND NOW\n\nSecurity Team`,
      `URGENT NOTICE!!!\n\nWE DETECTED UNAUTHORIZED ACCESS TO YOUR BANK ACCOUNT.\nTRANSFER YOUR FUNDS IMMEDIATELY TO SECURE ACCOUNT.\n\nDeadline: TODAY\n\nBank Security Department`,
    ],
    sender:   "security@bank-verify-now.tk",
    reply_to: "collect@phish-farm.ru",
  },
  ham: {
    subjects: [
      "Meeting notes from Tuesday",
      "Re: Project update — next steps",
      "Your order has shipped",
      "Lunch tomorrow?",
      "Q1 report attached",
    ],
    bodies: [
      `Hi Sarah,\n\nJust following up on the project — everything looks good on my end.\nCan we sync up Thursday afternoon?\n\nBest,\nMike`,
      `Hello James,\n\nAttached the Q1 report as requested. Let me know if you have questions.\n\nThanks,\nAnna`,
    ],
    sender:   "colleague@company.com",
    reply_to: "",
  },
} as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandom(type: keyof typeof SAMPLES): ClassifyRequest {
  const s = SAMPLES[type];
  return {
    subject:        pick(s.subjects),
    body:           pick(s.bodies),
    sender:         s.sender,
    reply_to:       s.reply_to,
    has_attachment: type === "phishing" ? Math.random() > 0.5 : false,
  };
}
