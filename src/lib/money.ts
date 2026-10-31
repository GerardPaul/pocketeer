// Amounts are stored as integers in the currency's smallest unit (₱12.50 → 1250, ¥1250 → 1250).

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

// Parses user input like "12.5" or "12,50" into minor units. Returns null for anything invalid.
export function parseAmount(text: string, currency: string): number | null {
  const digits = currencyDigits(currency);
  const clean = text.trim().replace(",", ".");
  const pattern = digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{0,${digits}})?$`);
  if (!pattern.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  // String math avoids float rounding (0.1 + 0.2 problems).
  const minor = Number(whole + frac.padEnd(digits, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function toInputString(minor: number, currency: string): string {
  const digits = currencyDigits(currency);
  if (digits === 0) return String(minor);
  const s = String(Math.abs(minor)).padStart(digits + 1, "0");
  return `${minor < 0 ? "-" : ""}${s.slice(0, -digits)}.${s.slice(-digits)}`;
}
