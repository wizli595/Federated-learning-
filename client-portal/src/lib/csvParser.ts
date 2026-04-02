/**
 * csvParser.ts — Lightweight RFC 4180 CSV parser + column auto-detection.
 */

/** Parse a CSV string into headers + rows. Handles quoted fields and CRLF. */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = "";
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") lines.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  // Flush final field/row
  row.push(field);
  if (row.length > 1 || row[0] !== "") lines.push(row);

  if (lines.length === 0) return { headers: [], rows: [] };
  return { headers: lines[0].map(h => h.trim()), rows: lines.slice(1) };
}

// ── Column role detection ──────────────────────────────────────────────────────

const LABEL_COLS  = ["label", "spam", "class", "v1", "category", "ham_or_spam", "type", "target", "is_spam"];
const BODY_COLS   = ["body", "text", "message", "v2", "content", "email_body", "email_text", "message_body"];
const SUBJ_COLS   = ["subject", "subject_line", "title"];
const SENDER_COLS = ["sender", "from", "from_address", "email_from"];
const REPLY_COLS  = ["reply_to", "replyto", "reply-to"];

function findCol(headers: string[], candidates: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

export interface ColMap {
  label:   number;  // required — -1 if not detected
  body:    number;  // required — -1 if not detected
  subject: number;  // optional — -1 if not detected
  sender:  number;  // optional — -1 if not detected
  replyTo: number;  // optional — -1 if not detected
}

export function detectColumns(headers: string[]): ColMap {
  return {
    label:   findCol(headers, LABEL_COLS),
    body:    findCol(headers, BODY_COLS),
    subject: findCol(headers, SUBJ_COLS),
    sender:  findCol(headers, SENDER_COLS),
    replyTo: findCol(headers, REPLY_COLS),
  };
}

/** Map raw label string → 1 (spam), 0 (ham), or -1 (unknown). */
export function normalizeLabel(raw: string): number {
  const v = raw.trim().toLowerCase();
  if (["spam", "1", "yes", "true", "junk", "1.0"].includes(v)) return 1;
  if (["ham", "0", "no", "false", "not spam", "0.0"].includes(v)) return 0;
  return -1;
}
