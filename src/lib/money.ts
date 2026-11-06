// Amounts are stored as integers in the currency's smallest unit (₱12.50 → 1250, ¥1250 → 1250).
// Input helpers take an optional locale for tests; the app uses the phone's, the same one formatMoney uses.

export function currencyDigits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
}

export function isValidCurrency(code: string): boolean {
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return /^[A-Z]{3}$/.test(code);
  } catch {
    return false;
  }
}

export function formatMoney(minor: number, currency: string): string {
  const digits = currencyDigits(currency);
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    minor / 10 ** digits,
  );
}

// The locale's grouping and decimal marks, e.g. "," and "." in en-US, "." and "," in de-DE.
function separators(locale?: string) {
  const s = new Intl.NumberFormat(locale).format(1234567.5);
  return { group: s.slice(0, -2).replace(/\d/g, "").charAt(0), decimal: s.charAt(s.length - 2) };
}

// Intl groups the way the locale does, including en-IN's 12,34,567.
function groupDigits(whole: string, locale?: string): string {
  return new Intl.NumberFormat(locale).format(Number(whole));
}

// Typing filter for amount fields: digits and one decimal mark (none for currencies without minor units),
// grouped as the user types, so "1234.5" shows as "1,234.5".
export function formatAmountInput(text: string, currency: string, locale?: string): string {
  const { group, decimal } = separators(locale);
  const [whole, ...rest] = text.split(group).join("").split(decimal);
  // 13 digits keeps the amount in minor units a safe integer, so grouping never rounds it.
  const wholeDigits = whole.replace(/\D/g, "").slice(0, 13);
  const grouped = wholeDigits ? groupDigits(wholeDigits, locale) : "";
  const digits = currencyDigits(currency);
  if (rest.length === 0 || digits === 0) return grouped;
  return `${grouped || "0"}${decimal}${rest.join("").replace(/\D/g, "").slice(0, digits)}`;
}

// Parses user input like "1,234.5" into minor units. Returns null for anything invalid.
export function parseAmount(text: string, currency: string, locale?: string): number | null {
  const digits = currencyDigits(currency);
  const { group, decimal } = separators(locale);
  const clean = text.trim().split(group).join("").replace(decimal, ".");
  const pattern = digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{0,${digits}})?$`);
  if (!pattern.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  // String math avoids float rounding (0.1 + 0.2 problems).
  const minor = Number(whole + frac.padEnd(digits, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

// Stored amount back to what the field shows, e.g. 123450 → "1,234.50".
export function toInputString(minor: number, currency: string, locale?: string): string {
  const digits = currencyDigits(currency);
  const s = String(minor).padStart(digits + 1, "0");
  if (digits === 0) return groupDigits(s, locale);
  return `${groupDigits(s.slice(0, -digits), locale)}${separators(locale).decimal}${s.slice(-digits)}`;
}
