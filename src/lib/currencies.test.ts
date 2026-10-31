import { CURRENCIES } from "./currencies";
import { isValidCurrency } from "./money";

test("every currency is a unique, valid code with a symbol", () => {
  expect(new Set(CURRENCIES.map((c) => c.code)).size).toBe(CURRENCIES.length);
  for (const c of CURRENCIES) {
    expect(isValidCurrency(c.code)).toBe(true);
    expect(c.symbol.trim()).not.toBe("");
  }
});
