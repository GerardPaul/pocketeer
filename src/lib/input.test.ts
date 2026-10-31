import { cleanAmountInput, cleanDateInput, cleanTextInput } from "./input";

test("amount input keeps digits and the first separator only", () => {
  expect(cleanAmountInput("1,234.56")).toBe("1,23456");
  expect(cleanAmountInput("12.5")).toBe("12.5");
  expect(cleanAmountInput("-12e3abc")).toBe("123");
  expect(cleanAmountInput("1'; DROP TABLE accounts;--")).toBe("1");
  expect(cleanAmountInput("")).toBe("");
});

test("text input drops control characters but keeps normal text", () => {
  expect(cleanTextInput("Food\n\t\u0000")).toBe("Food");
  expect(cleanTextInput("Café & <b>Bar</b> 'x'")).toBe("Café & <b>Bar</b> 'x'");
});

test("date input keeps digits and dashes", () => {
  expect(cleanDateInput("2026-1o-31x")).toBe("2026-1-31");
});
