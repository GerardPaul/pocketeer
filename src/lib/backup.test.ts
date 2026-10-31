import { type Backup, parseBackup, toBackupJson } from "./backup";

const sample: Backup = {
  currency: "PHP",
  accounts: [
    { id: 1, name: "Cash", type: "regular", starting_amount: 100000, credit_limit: null },
    { id: 2, name: "Visa", type: "credit_card", starting_amount: 0, credit_limit: 300000 },
  ],
  categories: [{ id: 1, name: "Food", icon: "food" }],
  budgets: [{ category_id: 1, month: "2026-10", amount: 800000 }],
  transactions: [
    { id: 1, type: "expense", amount: 30000, date: "2026-10-31", note: "Lunch", account_id: 1, to_account_id: null, category_id: 1 },
    { id: 2, type: "expense", amount: 200000, date: "2026-10-31", note: "", account_id: 2, to_account_id: null, category_id: 1 },
    { id: 3, type: "transfer", amount: 50000, date: "2026-10-31", note: "", account_id: 1, to_account_id: 2, category_id: null },
  ],
};

const json = () => JSON.parse(toBackupJson(sample, new Date("2026-10-31T00:00:00Z")));
const parse = (obj: unknown) => parseBackup(JSON.stringify(obj));

test("export then import round-trips the data", () => {
  const result = parseBackup(toBackupJson(sample, new Date("2026-10-31T00:00:00Z")));
  expect(result).toEqual({ ok: true, backup: sample });
});

test("category icons are optional and unknown ones fall back to the default", () => {
  const b = json();
  delete b.categories[0].icon;
  expect(parse(b)).toMatchObject({ ok: true, backup: { categories: [{ icon: "tag" }] } });
  b.categories[0].icon = "<script>";
  expect(parse(b)).toMatchObject({ ok: true, backup: { categories: [{ icon: "tag" }] } });
});

test("rejects files that aren't Pocketeer backups", () => {
  expect(parseBackup("not json")).toEqual({ ok: false, error: "This file isn't valid JSON." });
  expect(parse({ ...json(), app: "other" })).toMatchObject({ ok: false, error: /isn't a Pocketeer/ });
  expect(parse({ ...json(), version: 2 })).toMatchObject({ ok: false, error: /version/ });
  expect(parse({ ...json(), currency: "XX" })).toMatchObject({ ok: false, error: /currency/ });
  expect(parse({ ...json(), transactions: undefined })).toMatchObject({ ok: false, error: /missing transactions/ });
});

test("rejects bad fields and broken references", () => {
  const bad = (patch: (b: ReturnType<typeof json>) => void) => {
    const b = json();
    patch(b);
    return parse(b);
  };
  expect(bad((b) => (b.accounts[0].starting_amount = 1.5))).toMatchObject({ ok: false });
  expect(bad((b) => (b.accounts[0].type = "loan"))).toMatchObject({ ok: false });
  expect(bad((b) => (b.transactions[0].account_id = 99))).toMatchObject({ ok: false });
  expect(bad((b) => (b.transactions[0].category_id = 99))).toMatchObject({ ok: false });
  expect(bad((b) => (b.transactions[0].amount = -5))).toMatchObject({ ok: false });
  expect(bad((b) => (b.budgets[0].category_id = 99))).toMatchObject({ ok: false });
  expect(bad((b) => b.accounts.push({ ...b.accounts[0] }))).toMatchObject({ ok: false, error: /duplicate/ });
  expect(bad((b) => (b.accounts[1].credit_limit = null))).toMatchObject({ ok: false, error: /credit limit/ });
});

test("rejects backups that break balance rules", () => {
  const b = json();
  b.transactions[0].amount = 999999;
  expect(parse(b)).toMatchObject({ ok: false, error: /balance rule.*below 0/ });
});
