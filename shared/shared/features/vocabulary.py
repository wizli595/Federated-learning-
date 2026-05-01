"""Keyword vocabularies used for spam signal detection."""

SPAM_KEYWORDS = {
    "free", "win", "winner", "prize", "click", "offer", "deal", "buy",
    "discount", "sale", "limited", "exclusive", "congratulations", "earn",
    "subscribe", "unsubscribe", "promotion", "guaranteed", "selected",
    "special", "bonus", "gift", "reward", "coupon", "cheap",
}

URGENCY_WORDS = {
    "urgent", "immediately", "asap", "expires", "deadline", "act now",
    "hurry", "last chance", "time sensitive", "respond now", "today only",
    "don't miss", "final notice", "warning", "alert",
}

MONEY_WORDS = {
    "money", "cash", "dollar", "bank", "account", "transfer", "payment",
    "invoice", "wire", "bitcoin", "crypto", "earn", "income", "profit",
    "revenue", "financial", "loan", "credit", "debt", "fund",
}

FEATURE_NAMES = [
    "word_count",           # 0  total words in body
    "char_count",           # 1  total characters in body
    "caps_ratio",           # 2  uppercase / total chars
    "exclamation_count",    # 3  number of !
    "question_count",       # 4  number of ?
    "url_count",            # 5  number of http/www links
    "spam_keyword_count",   # 6  hits from SPAM_KEYWORDS
    "digit_ratio",          # 7  digits / total chars
    "special_char_ratio",   # 8  $%*# / total chars
    "subject_length",       # 9  subject char length
    "subject_caps_ratio",   # 10 caps ratio in subject
    "subject_spam_keywords",# 11 spam keyword hits in subject
    "has_attachment",       # 12 binary 0/1
    "reply_to_mismatch",    # 13 sender domain != reply-to domain
    "sender_domain_len",    # 14 length of sender domain string
    "html_ratio",           # 15 html tag chars / total body chars
    "urgency_word_count",   # 16 hits from URGENCY_WORDS
    "money_word_count",     # 17 hits from MONEY_WORDS
    "personal_greeting",    # 18 1=named greeting, 0=generic
    "line_break_ratio",     # 19 newline count / word count
]

INPUT_DIM = len(FEATURE_NAMES)  # 20
