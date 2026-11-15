// What Free includes before Pocketeer Pro. Limits only stop adding: anything already past one (from an import)
// stays usable.
export const FREE_LIMITS = { categories: 10, goals: 1, recurring: 2 } as const;

export type ProFeature = keyof typeof FREE_LIMITS | "search" | "insights" | "csv";

export function atFreeLimit(kind: keyof typeof FREE_LIMITS, count: number, pro: boolean): boolean {
  return !pro && count >= FREE_LIMITS[kind];
}

// The paywall's headline for whatever sent the user there.
export const PRO_REASONS: Record<ProFeature, string> = {
  categories: `Free includes ${FREE_LIMITS.categories} categories. Pro adds as many as you like.`,
  goals: `Free includes ${FREE_LIMITS.goals} savings goal. Pro adds as many as you like.`,
  recurring: `Free includes ${FREE_LIMITS.recurring} recurring transactions. Pro adds as many as you like.`,
  search: "Searching every month at once is part of Pro.",
  insights: "The full spending charts are part of Pro.",
  csv: "Exporting a CSV spreadsheet is part of Pro.",
};

export function isProFeature(v: unknown): v is ProFeature {
  return typeof v === "string" && Object.hasOwn(PRO_REASONS, v);
}
