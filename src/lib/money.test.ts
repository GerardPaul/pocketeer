import { CURRENCIES } from "./currencies";
import { currencyDigits, formatAmountInput, isValidCurrency, parseAmount, toInputString } from "./money";

test("every listed currency is a real ISO code", () => {
  for (const c of CURRENCIES) expect(isValidCurrency(c.code)).toBe(true);
  expect(new Set(CURRENCIES.map((c) => c.code)).size).toBe(CURRENCIES.length);
});

test("currency decimal places follow the currency", () => {
  expect(currencyDigits("PHP")).toBe(2);
  expect(currencyDigits("JPY")).toBe(0);
});

test("parseAmount converts to minor units without float errors", () => {
  expect(parseAmount("12.50", "PHP", "en-US")).toBe(1250);
  expect(parseAmount("12.5", "PHP", "en-US")).toBe(1250);
  expect(parseAmount("0.1", "USD", "en-US")).toBe(10);
  expect(parseAmount("1250", "JPY", "en-US")).toBe(1250);
});

test("parseAmount reads the locale's grouping and decimal marks", () => {
  expect(parseAmount("1,234.50", "PHP", "en-US")).toBe(123450);
  expect(parseAmount("1.234,5", "EUR", "de-DE")).toBe(123450);
  expect(parseAmount("12,34,567", "INR", "en-IN")).toBe(123456700);
});

test("parseAmount rejects invalid input", () => {
  expect(parseAmount("", "PHP", "en-US")).toBeNull();
  expect(parseAmount("abc", "PHP", "en-US")).toBeNull();
  expect(parseAmount("-5", "PHP", "en-US")).toBeNull();
  expect(parseAmount("1.234", "PHP", "en-US")).toBeNull();
  expect(parseAmount("12.5", "JPY", "en-US")).toBeNull();
  expect(parseAmount("99999999999999999999", "PHP", "en-US")).toBeNull();
});

test("amount input is grouped as it's typed", () => {
  expect(formatAmountInput("1234567", "PHP", "en-US")).toBe("1,234,567");
  expect(formatAmountInput("1,2345", "PHP", "en-US")).toBe("12,345");
  expect(formatAmountInput("1234.", "PHP", "en-US")).toBe("1,234.");
  expect(formatAmountInput("1234.567", "PHP", "en-US")).toBe("1,234.56");
  expect(formatAmountInput(".5", "PHP", "en-US")).toBe("0.5");
  expect(formatAmountInput("1234,5", "EUR", "de-DE")).toBe("1.234,5");
  expect(formatAmountInput("1234567", "INR", "en-IN")).toBe("12,34,567");
  expect(formatAmountInput("1234.5", "JPY", "en-US")).toBe("1,234");
  expect(formatAmountInput("", "PHP", "en-US")).toBe("");
});

test("amount input drops anything but digits and one decimal mark", () => {
  expect(formatAmountInput("-12e3abc", "PHP", "en-US")).toBe("123");
  expect(formatAmountInput("1.2.3", "PHP", "en-US")).toBe("1.23");
  expect(formatAmountInput("1'; DROP TABLE accounts;--", "PHP", "en-US")).toBe("1");
  expect(formatAmountInput("99999999999999999999", "PHP", "en-US")).toBe("9,999,999,999,999");
});

test("toInputString round-trips with parseAmount", () => {
  expect(toInputString(1250, "PHP", "en-US")).toBe("12.50");
  expect(toInputString(5, "PHP", "en-US")).toBe("0.05");
  expect(toInputString(123450, "PHP", "en-US")).toBe("1,234.50");
  expect(toInputString(1250, "JPY", "en-US")).toBe("1,250");
  expect(toInputString(123450, "EUR", "de-DE")).toBe("1.234,50");
  expect(parseAmount(toInputString(123456789, "USD", "en-US"), "USD", "en-US")).toBe(123456789);
});

test("isValidCurrency accepts ISO codes only", () => {
  expect(isValidCurrency("PHP")).toBe(true);
  expect(isValidCurrency("php")).toBe(false);
  expect(isValidCurrency("XX")).toBe(false);
});
