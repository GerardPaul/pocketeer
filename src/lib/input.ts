// Typing filters for form fields. Saved values still go through parseAmount and the validators.

// Digits plus a single decimal separator, so letters and symbols never reach an amount field.
export function cleanAmountInput(text: string): string {
  const s = text.replace(/[^\d.,]/g, "");
  const i = s.search(/[.,]/);
  return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/[.,]/g, "");
}

// Drops control characters (newlines, tabs, null bytes) that a paste can sneak into a one-line field.
export function cleanTextInput(text: string): string {
  return text.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function cleanDateInput(text: string): string {
  return text.replace(/[^\d-]/g, "");
}
