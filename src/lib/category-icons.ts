// Icons a category can use. Kept free of React Native so the backup parser can validate against it.
export const CATEGORY_ICONS = [
  "tag",
  "food",
  "groceries",
  "coffee",
  "transport",
  "commute",
  "fuel",
  "house",
  "bills",
  "water",
  "phone",
  "internet",
  "health",
  "fitness",
  "shopping",
  "clothes",
  "fun",
  "games",
  "education",
  "gifts",
  "travel",
  "pets",
  "family",
  "savings",
  "subscriptions",
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const DEFAULT_CATEGORY_ICON: CategoryIcon = "tag";

// Suggested category name for each icon; also the icon's accessible label in the picker.
export const CATEGORY_ICON_NAMES: Record<CategoryIcon, string> = {
  tag: "Other",
  food: "Food",
  groceries: "Groceries",
  coffee: "Coffee",
  transport: "Transport",
  commute: "Commute",
  fuel: "Fuel",
  house: "Housing",
  bills: "Bills",
  water: "Water",
  phone: "Phone",
  internet: "Internet",
  health: "Health",
  fitness: "Fitness",
  shopping: "Shopping",
  clothes: "Clothes",
  fun: "Entertainment",
  games: "Games",
  education: "Education",
  gifts: "Gifts",
  travel: "Travel",
  pets: "Pets",
  family: "Family",
  savings: "Savings",
  subscriptions: "Subscriptions",
};

export function toCategoryIcon(value: unknown): CategoryIcon {
  return CATEGORY_ICONS.includes(value as CategoryIcon) ? (value as CategoryIcon) : DEFAULT_CATEGORY_ICON;
}
