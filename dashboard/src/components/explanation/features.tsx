const SOURCE_COLOR: Record<string, string> = {
  Body:    "text-blue-400 bg-blue-500/10",
  Subject: "text-amber-400 bg-amber-500/10",
  Header:  "text-emerald-400 bg-emerald-500/10",
};

const FEATURES: [number, string, string, string][] = [
  [0,  "word_count",             "Body",    "Total words in email body"],
  [1,  "char_count",             "Body",    "Total characters"],
  [2,  "caps_ratio",             "Body",    "Fraction of uppercase characters — high in phishing"],
  [3,  "exclamation_count",      "Body",    "Number of ! marks — normalized"],
  [4,  "question_count",         "Body",    "Number of ? marks"],
  [5,  "url_count",              "Body",    "Number of URLs/links — hallmark of marketing spam"],
  [6,  "spam_keyword_count",     "Body",    "Occurrences of: free, win, prize, click, offer"],
  [7,  "digit_ratio",            "Body",    "Ratio of digits to total characters"],
  [8,  "special_char_ratio",     "Body",    "$, %, * and other special characters"],
  [9,  "subject_length",         "Subject", "Length of the subject line (normalized)"],
  [10, "subject_caps_ratio",     "Subject", "Uppercase ratio in subject — high in phishing"],
  [11, "subject_spam_keywords",  "Subject", "Spam keywords found in the subject line"],
  [12, "has_attachment",         "Header",  "Binary 1 if email has an attachment"],
  [13, "reply_to_mismatch",      "Header",  "1 if sender domain ≠ reply-to domain — phishing indicator"],
  [14, "sender_domain_len",      "Header",  "Length of the sender's domain name (normalized)"],
  [15, "html_ratio",             "Body",    "Fraction of body that is HTML markup — marketing indicator"],
  [16, "urgency_word_count",     "Body",    "Occurrences of: urgent, immediately, limited time"],
  [17, "money_word_count",       "Body",    "Occurrences of: cash, earn, $, €, free money"],
  [18, "personal_greeting",      "Body",    "0 = generic 'dear customer', 1 = named greeting"],
  [19, "line_break_ratio",       "Body",    "Line breaks / total chars — formatting density"],
];

export function Features() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Raw email text is <span className="text-zinc-200">never stored or transmitted</span>. Instead,
        the text is converted into 20 numeric features (all normalized 0–1) the moment an email arrives.
        These features are what the ML model actually sees.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700/60">
              <th className="text-left py-2 pr-3 text-zinc-400 font-semibold w-8">#</th>
              <th className="text-left py-2 pr-3 text-zinc-400 font-semibold">Feature</th>
              <th className="text-left py-2 pr-3 text-zinc-400 font-semibold">Source</th>
              <th className="text-left py-2 text-zinc-400 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map(([idx, name, source, desc]) => (
              <tr key={idx} className="border-b border-zinc-800/40">
                <td className="py-1.5 pr-3 text-zinc-600 font-mono">{idx}</td>
                <td className="py-1.5 pr-3 font-mono text-zinc-200">{name}</td>
                <td className="py-1.5 pr-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${SOURCE_COLOR[source]}`}>
                    {source}
                  </span>
                </td>
                <td className="py-1.5 text-zinc-500">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
        <p className="text-xs text-zinc-400">
          <span className="text-zinc-200 font-semibold">Why normalize to 0–1?</span>{" "}
          Neural networks train poorly on features with very different scales (e.g., word_count can be 500
          while has_attachment is 0 or 1). Normalization puts all features on the same scale, making
          gradient descent stable.
        </p>
      </div>
    </>
  );
}
