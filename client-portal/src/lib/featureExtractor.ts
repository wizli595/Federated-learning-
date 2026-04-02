/**
 * featureExtractor.ts — JS port of fl/shared/features.py
 * Extracts 20 normalised features from raw email fields.
 * Raw text never leaves the browser — only the feature vector is sent.
 */

export const FEATURE_NAMES = [
  "word_count", "char_count", "caps_ratio", "exclamation_count", "question_count",
  "url_count", "spam_keyword_count", "digit_ratio", "special_char_ratio",
  "subject_length", "subject_caps_ratio", "subject_spam_keywords",
  "has_attachment", "reply_to_mismatch", "sender_domain_len",
  "html_ratio", "urgency_word_count", "money_word_count",
  "personal_greeting", "line_break_ratio",
];

const SPAM_KEYWORDS = new Set([
  "free", "win", "winner", "prize", "click", "offer", "deal", "buy",
  "discount", "sale", "limited", "exclusive", "congratulations", "earn",
  "subscribe", "unsubscribe", "promotion", "guaranteed", "selected",
  "special", "bonus", "gift", "reward", "coupon", "cheap",
]);

const URGENCY_WORDS = new Set([
  "urgent", "immediately", "asap", "expires", "deadline", "act now",
  "hurry", "last chance", "time sensitive", "respond now", "today only",
  "don't miss", "final notice", "warning", "alert",
]);

const MONEY_WORDS = new Set([
  "money", "cash", "dollar", "bank", "account", "transfer", "payment",
  "invoice", "wire", "bitcoin", "crypto", "earn", "income", "profit",
  "revenue", "financial", "loan", "credit", "debt", "fund",
]);

const GENERIC_GREETINGS = new Set([
  "customer", "sir", "madam", "user", "friend", "member", "valued",
]);

function keywordHits(text: string, vocab: Set<string>): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const w of vocab) if (lower.includes(w)) count++;
  return count;
}

function urlCount(text: string): number {
  return (text.match(/https?:\/\/|www\./gi) ?? []).length;
}

function htmlRatio(text: string): number {
  const tags = text.match(/<[^>]+>/g) ?? [];
  const htmlChars = tags.reduce((s, t) => s + t.length, 0);
  return htmlChars / Math.max(text.length, 1);
}

function extractDomain(email: string): string {
  const m = email.match(/@([\w.\-]+)/);
  return m ? m[1].toLowerCase() : "";
}

/**
 * Returns a 20-element float array (all values in [0, 1]).
 * Mirrors extract_features() in fl/shared/features.py exactly.
 */
export function extractFeatures(
  subject: string,
  body: string,
  sender = "",
  hasAttachment = false,
  replyTo = "",
): number[] {
  body    = body    || "";
  subject = subject || "";
  sender  = sender  || "";
  replyTo = replyTo || "";

  const totalChars = Math.max(body.length, 1);
  const wordCount  = body.split(/\s+/).filter(Boolean).length;

  const capsRatio        = [...body].filter(c => c >= "A" && c <= "Z").length / totalChars;
  const digitRatio       = [...body].filter(c => c >= "0" && c <= "9").length / totalChars;
  const specialCharRatio = [...body].filter(c => "$%*#@~^".includes(c)).length / totalChars;

  const subjLen       = subject.length;
  const subjCapsRatio = [...subject].filter(c => c >= "A" && c <= "Z").length / Math.max(subject.length, 1);
  const subjSpamKw    = keywordHits(subject, SPAM_KEYWORDS);

  const senderDomain = extractDomain(sender);
  const replyDomain  = extractDomain(replyTo);
  const replyMismatch = (replyDomain && replyDomain !== senderDomain) ? 1.0 : 0.0;

  let personalGreeting = 0.0;
  const gm = body.trim().match(/^dear\s+(\w+)/i);
  if (gm && !GENERIC_GREETINGS.has(gm[1].toLowerCase())) personalGreeting = 1.0;

  const lineBreaks = (body.match(/\n/g) ?? []).length;

  return [
    Math.min(wordCount, 500) / 500,                               // 0  word_count
    Math.min(totalChars, 3000) / 3000,                            // 1  char_count
    capsRatio,                                                    // 2  caps_ratio
    Math.min((body.match(/!/g) ?? []).length, 20) / 20,           // 3  exclamation_count
    Math.min((body.match(/\?/g) ?? []).length, 20) / 20,          // 4  question_count
    Math.min(urlCount(body), 20) / 20,                            // 5  url_count
    Math.min(keywordHits(body, SPAM_KEYWORDS), 15) / 15,          // 6  spam_keyword_count
    digitRatio,                                                   // 7  digit_ratio
    specialCharRatio,                                             // 8  special_char_ratio
    Math.min(subjLen, 150) / 150,                                 // 9  subject_length
    subjCapsRatio,                                                // 10 subject_caps_ratio
    Math.min(subjSpamKw, 5) / 5,                                  // 11 subject_spam_keywords
    hasAttachment ? 1.0 : 0.0,                                    // 12 has_attachment
    replyMismatch,                                                // 13 reply_to_mismatch
    Math.min(senderDomain.length, 50) / 50,                      // 14 sender_domain_len
    htmlRatio(body),                                              // 15 html_ratio
    Math.min(keywordHits(body, URGENCY_WORDS), 10) / 10,          // 16 urgency_word_count
    Math.min(keywordHits(body, MONEY_WORDS), 10) / 10,            // 17 money_word_count
    personalGreeting,                                             // 18 personal_greeting
    Math.min(lineBreaks, 50) / 50,                                // 19 line_break_ratio
  ];
}
