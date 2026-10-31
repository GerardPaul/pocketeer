import { CURRENCIES } from "./currencies";
import { currencyDigits, isValidCurrency, parseAmount, toInputString } from "./money";

test("every listed currency is a real ISO code", () => {
  for (const c of CURRENCIES) expect(isValidCurrency(c.code)).toBe(true);
  expect(new Set(CURRENCIES.map((c) => c.code)).size).toBe(CURRENCIES.length);
});

test("currency decimal places follow the currency", () => {
  expect(currencyDigits("PHP")).toBe(2);
  expect(currencyDigits("JPY")).toBe(0);
});

test("parseAmount converts to minor units without float errors", () => {
  expect(parseAmount("12.50", "PHP")).toBe(1250);
  expect(parseAmount("12.5", "PHP")).toBe(1250);
  expect(parseAmount("12,5", "PHP")).toBe(1250);
  expect(parseAmount("0.1", "USD")).toBe(10);
  expect(parseAmount("1250", "JPY")).toBe(1250);
});

test("parseAmount rejects invalid input", () => {
  expect(parseAmount("", "PHP")).toBeNull();
  expect(parseAmount("abc", "PHP")).toBeNull();
  expect(parseAmount("-5", "PHP")).toBeNull();
  expect(parseAmount("1.234", "PHP")).toBeNull();
  expect(parseAmount("12.5", "JPY")).toBeNull();
  expect(parseAmount("99999999999999999999", "PHP")).toBeNull();
});

test("toInputString round-trips with parseAmount", () => {
  expect(toInputString(1250, "PHP")).toBe("12.50");
  expect(toInputString(5, "PHP")).toBe("0.05");
  expect(toInputString(1250, "JPY")).toBe("1250");
  expect(parseAmount(toInputString(123456, "USD"), "USD")).toBe(123456);
});

test("isValidCurrency accepts ISO codes only", () => {
  expect(isValidCurrency("PHP")).toBe(true);
  expect(isValidCurrency("php")).toBe(false);
  expect(isValidCurrency("XX")).toBe(false);
});
