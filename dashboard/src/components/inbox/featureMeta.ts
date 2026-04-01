export const FEATURE_NAMES = [
  "word_count","char_count","caps_ratio","exclamation_count","question_count",
  "url_count","spam_keyword_count","digit_ratio","special_char_ratio","subject_length",
  "subject_caps_ratio","subject_spam_keywords","has_attachment","reply_to_mismatch",
  "sender_domain_len","html_ratio","urgency_word_count","money_word_count",
  "personal_greeting","line_break_ratio",
];

export const FEATURE_LABELS: Record<string, string> = {
  word_count:"Word Count", char_count:"Char Count", caps_ratio:"Caps Ratio",
  exclamation_count:"Exclamations", question_count:"Questions", url_count:"URL Count",
  spam_keyword_count:"Spam Keywords", digit_ratio:"Digit Ratio", special_char_ratio:"Special Chars",
  subject_length:"Subject Length", subject_caps_ratio:"Subject Caps",
  subject_spam_keywords:"Subject Spam KW", has_attachment:"Has Attachment",
  reply_to_mismatch:"Reply-To Mismatch", sender_domain_len:"Sender Domain Len",
  html_ratio:"HTML Ratio", urgency_word_count:"Urgency Words", money_word_count:"Money Words",
  personal_greeting:"Personal Greeting", line_break_ratio:"Line Break Ratio",
};

export const SPAM_INDICATORS = new Set([
  "caps_ratio","exclamation_count","url_count","spam_keyword_count",
  "subject_caps_ratio","subject_spam_keywords","reply_to_mismatch",
  "urgency_word_count","money_word_count",
]);
