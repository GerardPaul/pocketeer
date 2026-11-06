import { cleanDateInput, cleanDayInput, cleanTextInput } from "./input";

test("text input drops control characters but keeps normal text", () => {
  expect(cleanTextInput("Food\n\t\u0000")).toBe("Food");
  expect(cleanTextInput("Café & <b>Bar</b> 'x'")).toBe("Café & <b>Bar</b> 'x'");
});

test("date input keeps digits and dashes", () => {
  expect(cleanDateInput("2026-1o-31x")).toBe("2026-1-31");
});

test("day input keeps up to two digits", () => {
  expect(cleanDayInput("1st")).toBe("1");
  expect(cleanDayInput("-315")).toBe("31");
});
