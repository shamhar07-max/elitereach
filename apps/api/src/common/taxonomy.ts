/* Deterministic taxonomy for Level-1 rule-based extraction (spec §26, §28).
 * Small and hardcoded for Phase 1 — the spec calls for an admin-managed
 * taxonomy table with aliases eventually; this is the seed list that table
 * would be populated from. */

export const DESTINATION_ALIASES: Record<string, string> = {
  japan: "Japan", tokyo: "Japan", osaka: "Japan", kyoto: "Japan",
  georgia: "Georgia", tbilisi: "Georgia", batumi: "Georgia",
  turkey: "Turkey", istanbul: "Turkey", antalya: "Turkey",
  maldives: "Maldives",
  thailand: "Thailand", bangkok: "Thailand", phuket: "Thailand",
  bali: "Indonesia", indonesia: "Indonesia",
  schengen: "Schengen", france: "Schengen", italy: "Schengen", spain: "Schengen",
  uk: "United Kingdom", "united kingdom": "United Kingdom", london: "United Kingdom",
  usa: "United States", "united states": "United States",
  canada: "Canada",
  australia: "Australia",
  dubai: "UAE", "abu dhabi": "UAE", uae: "UAE", "united arab emirates": "UAE",
};

export const ORIGIN_KEYWORDS = ["dubai", "abu dhabi", "sharjah", "uae", "united arab emirates"];

export const TRIP_TYPE_KEYWORDS: Record<string, string[]> = {
  visa: ["visa", "documents required", "appointment"],
  flight: ["flight", "airfare", "ticket", "airline"],
  hotel: ["hotel", "resort", "check-in", "accommodation"],
  attraction: ["safari", "burj khalifa", "aquaventure", "theme park", "excursion", "tour"],
  insurance: ["travel insurance", "insurance policy"],
  holiday: ["package", "honeymoon", "holiday", "trip", "vacation", "itinerary"],
};

export const READY_TO_BUY_PHRASES = ["ready to book", "book now", "send quote", "want to book", "please quote", "can you quote"];
export const COMPARISON_PHRASES = [" vs ", "compare", "which is better", "cheaper option", "or should i"];
export const DISCOVERY_PHRASES = ["just curious", "thinking about", "someday", "dream trip", "not sure yet"];

export const SPAM_PATTERNS = [/\bcrypto\b/i, /\bforex\b/i, /\bcasino\b/i, /\bwin \$?\d+/i, /click here/i, /(https?:\/\/\S+){3,}/];

export const HIGH_URGENCY_PATTERNS = [/\btomorrow\b/i, /\bthis week(end)?\b/i, /\bnext (\d+ )?days?\b/i, /\burgent(ly)?\b/i, /\basap\b/i];
export const MEDIUM_URGENCY_PATTERNS = [/\bnext month\b/i, /\bin \d+ weeks?\b/i];

export const GROUP_SIZE_PATTERN = /\b(\d{1,3})\s*(pax|people|persons|travellers|travelers|guests)\b/i;
export const FAMILY_OF_PATTERN = /\bfamily of\s*(\d{1,2})\b/i;
export const BUDGET_AED_PATTERN = /\baed\s*([\d,]+)\b/i;
export const BUDGET_DOLLAR_PATTERN = /\$\s*([\d,]+)\b/;
