/* Seed values for a brand-new tenant's taxonomy_terms — exactly what
 * shipped hardcoded in Phase 1 (common/taxonomy.ts), now the starting
 * point an admin edits from rather than the permanent ceiling. */
export const DEFAULT_TAXONOMY = {
  destinationAliases: {
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
  } as Record<string, string>,
  originKeywords: ["dubai", "abu dhabi", "sharjah", "uae", "united arab emirates"],
  tripTypeKeywords: {
    visa: ["visa", "documents required", "appointment"],
    flight: ["flight", "airfare", "ticket", "airline"],
    hotel: ["hotel", "resort", "check-in", "accommodation"],
    attraction: ["safari", "burj khalifa", "aquaventure", "theme park", "excursion", "tour"],
    insurance: ["travel insurance", "insurance policy"],
    holiday: ["package", "honeymoon", "holiday", "trip", "vacation", "itinerary"],
  } as Record<string, string[]>,
  readyToBuyPhrases: ["ready to book", "book now", "send quote", "want to book", "please quote", "can you quote"],
  comparisonPhrases: [" vs ", "compare", "which is better", "cheaper option", "or should i"],
  discoveryPhrases: ["just curious", "thinking about", "someday", "dream trip", "not sure yet"],
};
