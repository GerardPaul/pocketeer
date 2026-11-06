// Typing filters for form fields. Saved values still go through the validators.
// Amount fields use formatAmountInput in money.ts, since grouping depends on the currency and locale.

// Drops control characters (newlines, tabs, null bytes) that a paste can sneak into a one-line field.
export function cleanTextInput(text: string): string {
  return text.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function cleanDateInput(text: string): string {
  return text.replace(/[^\d-]/g, "");
}

// Day of the month (1–31) for credit card cutoff and due dates; at most two digits.
export function cleanDayInput(text: string): string {
  return text.replace(/\D/g, "").slice(0, 2);
}
