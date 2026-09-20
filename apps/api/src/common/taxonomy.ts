/* Structural parsing rules for Level-1 rule-based extraction (spec §26,
 * §28) — regex patterns, not business vocabulary. The vocabulary that used
 * to live here (destinations, trip types, intent phrases) moved to the
 * admin-managed taxonomy_terms table (see modules/taxonomy/) in Phase 2;
 * what's left below is deliberately still code, because an ops admin
 * editing a regex for parsing "family of N" is not a realistic UI. */

export const SPAM_PATTERNS = [/\bcrypto\b/i, /\bforex\b/i, /\bcasino\b/i, /\bwin \$?\d+/i, /click here/i, /(https?:\/\/\S+){3,}/];

export const HIGH_URGENCY_PATTERNS = [/\btomorrow\b/i, /\bthis week(end)?\b/i, /\bnext (\d+ )?days?\b/i, /\burgent(ly)?\b/i, /\basap\b/i];
export const MEDIUM_URGENCY_PATTERNS = [/\bnext month\b/i, /\bin \d+ weeks?\b/i];

export const GROUP_SIZE_PATTERN = /\b(\d{1,3})\s*(pax|people|persons|travellers|travelers|guests)\b/i;
export const FAMILY_OF_PATTERN = /\bfamily of\s*(\d{1,2})\b/i;
export const BUDGET_AED_PATTERN = /\baed\s*([\d,]+)\b/i;
export const BUDGET_DOLLAR_PATTERN = /\$\s*([\d,]+)\b/;
