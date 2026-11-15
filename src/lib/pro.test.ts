import { FREE_LIMITS, atFreeLimit, isProFeature } from "./pro";

test("Free stops adding at each limit, Pro never does", () => {
  expect(FREE_LIMITS).toEqual({ categories: 10, goals: 1, recurring: 2 });
  expect(atFreeLimit("categories", 9, false)).toBe(false);
  expect(atFreeLimit("categories", 10, false)).toBe(true);
  // An import can bring more than the limit; still locked for adding, nothing else.
  expect(atFreeLimit("categories", 14, false)).toBe(true);
  expect(atFreeLimit("goals", 1, false)).toBe(true);
  expect(atFreeLimit("recurring", 1, false)).toBe(false);
  expect(atFreeLimit("recurring", 50, true)).toBe(false);
});

test("only known features open the paywall with a reason", () => {
  expect(isProFeature("csv")).toBe(true);
  expect(isProFeature("toString")).toBe(false);
  expect(isProFeature(undefined)).toBe(false);
});
