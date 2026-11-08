import {
  type Account,
  type Transaction,
  accountAmount,
  backupDueDays,
  budgetFor,
  cardCycle,
  daysBetween,
  deleteTransactionProblem,
  isRealDate,
  matchesSearch,
  monthlyTotals,
  nextDueDate,
  shiftMonth,
  spendingByCategory,
  spentFor,
  summarize,
  validateAccount,
  validateTransaction,
} from "./ledger";

const cash: Account = { id: 1, name: "Cash", type: "regular", starting_amount: 1000, credit_limit: null, cutoff_day: null, due_day: null };
const bank: Account = { id: 2, name: "Bank", type: "regular", starting_amount: 5000, credit_limit: null, cutoff_day: null, due_day: null };
const visa: Account = { id: 3, name: "Visa", type: "credit_card", starting_amount: 0, credit_limit: 3000, cutoff_day: 5, due_day: 25 };
const accounts = [cash, bank, visa];

let nextId = 1;
function tx(t: Partial<Transaction> & Pick<Transaction, "type" | "amount" | "account_id">): Transaction {
  return { id: nextId++, date: "2026-11-05", note: "", to_account_id: null, category_id: null, ...t };
}

test("regular account balance: start + income + transfers in - expenses - transfers out", () => {
  const txs = [
    tx({ type: "income", amount: 500, account_id: 1 }),
    tx({ type: "expense", amount: 300, account_id: 1, category_id: 1 }),
    tx({ type: "transfer", amount: 200, account_id: 2, to_account_id: 1 }),
    tx({ type: "transfer", amount: 100, account_id: 1, to_account_id: 2 }),
  ];
  expect(accountAmount(cash, txs)).toBe(1000 + 500 - 300 + 200 - 100);
  expect(accountAmount(bank, txs)).toBe(5000 - 200 + 100);
});

test("credit card owed: expenses add, payments and refunds subtract", () => {
  const txs = [
    tx({ type: "expense", amount: 2000, account_id: 3, category_id: 1 }),
    tx({ type: "transfer", amount: 1500, account_id: 2, to_account_id: 3 }),
    tx({ type: "income", amount: 100, account_id: 3 }),
  ];
  expect(accountAmount(visa, txs)).toBe(2000 - 1500 - 100);
});

test("expense can't push a regular account below 0", () => {
  const t = tx({ type: "expense", amount: 1001, account_id: 1, category_id: 1 });
  expect(validateTransaction(t, accounts, [])).toMatch(/below 0/);
  expect(validateTransaction({ ...t, amount: 1000 }, accounts, [])).toBeNull();
});

test("credit card can't go over limit or be overpaid", () => {
  expect(
    validateTransaction(tx({ type: "expense", amount: 3001, account_id: 3, category_id: 1 }), accounts, []),
  ).toMatch(/credit limit/);
  expect(
    validateTransaction(tx({ type: "transfer", amount: 1, account_id: 2, to_account_id: 3 }), accounts, []),
  ).toMatch(/more than is owed/);
});

test("transaction shape rules", () => {
  expect(validateTransaction(tx({ type: "expense", amount: 10, account_id: 1 }), accounts, [])).toMatch(
    /category/,
  );
  expect(
    validateTransaction(tx({ type: "transfer", amount: 10, account_id: 1, to_account_id: 1 }), accounts, []),
  ).toMatch(/different/);
  expect(validateTransaction(tx({ type: "income", amount: 0, account_id: 1 }), accounts, [])).toMatch(/above 0/);
  expect(validateTransaction(tx({ type: "income", amount: 10, account_id: 99 }), accounts, [])).toMatch(
    /account/,
  );
});

test("editing a transaction replaces the old one instead of adding to it", () => {
  const original = tx({ type: "expense", amount: 900, account_id: 1, category_id: 1 });
  expect(validateTransaction({ ...original, amount: 1000 }, accounts, [original])).toBeNull();
});

test("moving a transaction to another account re-checks both accounts", () => {
  // Bank can afford a 4000 expense; Cash (1000) can't.
  const spend = tx({ type: "expense", amount: 4000, account_id: 2, category_id: 1 });
  expect(validateTransaction({ ...spend, account_id: 1 }, accounts, [spend])).toMatch(/Cash/);
  // Moving a payment off the card leaves the card overpaid.
  const charge = tx({ type: "expense", amount: 500, account_id: 3, category_id: 1 });
  const pay = tx({ type: "transfer", amount: 500, account_id: 2, to_account_id: 3 });
  expect(validateTransaction({ ...charge, account_id: 2 }, accounts, [charge, pay])).toMatch(/Visa/);
});

test("deleting income that was already spent is blocked", () => {
  const income = tx({ type: "income", amount: 500, account_id: 1 });
  const spend = tx({ type: "expense", amount: 1400, account_id: 1, category_id: 1 });
  expect(deleteTransactionProblem(income.id, accounts, [income, spend])).toMatch(/below 0/);
  expect(deleteTransactionProblem(spend.id, accounts, [income, spend])).toBeNull();
});

test("account edits: can't flip type once used, can't break balance rules", () => {
  const spend = tx({ type: "expense", amount: 800, account_id: 1, category_id: 1 });
  expect(validateAccount({ ...cash, type: "credit_card", credit_limit: 5000 }, cash, [spend])).toMatch(/type/);
  expect(validateAccount({ ...cash, starting_amount: 700 }, cash, [spend])).toMatch(/below 0/);
  expect(validateAccount({ ...cash, name: " " }, cash, [])).toMatch(/name/);
  expect(validateAccount({ ...visa, credit_limit: null }, visa, [])).toMatch(/credit limit/);
  expect(validateAccount({ ...cash, starting_amount: 800 }, cash, [spend])).toBeNull();
});

test("credit card cutoff and due days are optional days of the month", () => {
  expect(validateAccount({ ...visa, cutoff_day: null, due_day: null }, visa, [])).toBeNull();
  expect(validateAccount({ ...visa, cutoff_day: 31, due_day: 1 }, visa, [])).toBeNull();
  expect(validateAccount({ ...visa, cutoff_day: 0 }, visa, [])).toMatch(/Cutoff/);
  expect(validateAccount({ ...visa, due_day: 32 }, visa, [])).toMatch(/Due/);
});

test("budget in effect is the latest one at or before the month", () => {
  const budgets = [
    { category_id: 1, month: "2026-09", amount: 8000 },
    { category_id: 1, month: "2026-11", amount: 9000 },
    { category_id: 2, month: "2026-01", amount: 100 },
  ];
  expect(budgetFor(1, "2026-08", budgets)).toBeNull();
  expect(budgetFor(1, "2026-10", budgets)).toBe(8000);
  expect(budgetFor(1, "2026-11", budgets)).toBe(9000);
  expect(budgetFor(1, "2027-03", budgets)).toBe(9000);
});

test("spent counts only that category's expenses in that month", () => {
  const txs = [
    tx({ type: "expense", amount: 300, account_id: 1, category_id: 1, date: "2026-11-01" }),
    tx({ type: "expense", amount: 200, account_id: 3, category_id: 1, date: "2026-11-30" }),
    tx({ type: "expense", amount: 999, account_id: 1, category_id: 1, date: "2026-10-31" }),
    tx({ type: "expense", amount: 999, account_id: 1, category_id: 2, date: "2026-11-02" }),
    tx({ type: "transfer", amount: 999, account_id: 2, to_account_id: 3, date: "2026-11-03" }),
  ];
  expect(spentFor(1, "2026-11", txs)).toBe(500);
});

test("shiftMonth crosses year boundaries", () => {
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
});

test("only real calendar dates pass", () => {
  expect(isRealDate("2026-02-28")).toBe(true);
  expect(isRealDate("2028-02-29")).toBe(true);
  expect(isRealDate("2026-02-30")).toBe(false);
  expect(isRealDate("2026-13-01")).toBe(false);
  expect(isRealDate("2026-1-01")).toBe(false);
  expect(isRealDate("2026-01-01'; DROP TABLE transactions;--")).toBe(false);
});

describe("summarize", () => {
  it("adds income and expenses and leaves transfers out", () => {
    const txs = [
      tx({ type: "income", amount: 5000, account_id: 1 }),
      tx({ type: "expense", amount: 1200, account_id: 1, category_id: 1 }),
      tx({ type: "expense", amount: 300, account_id: 3, category_id: 1 }),
      tx({ type: "transfer", amount: 900, account_id: 1, to_account_id: 3 }),
    ];
    expect(summarize(txs)).toEqual({ income: 5000, spent: 1500, net: 3500 });
  });

  it("goes negative when spending is more than income", () => {
    expect(summarize([tx({ type: "expense", amount: 700, account_id: 1, category_id: 1 })]).net).toBe(-700);
  });
});

describe("backupDueDays", () => {
  const on = (date: string) => tx({ type: "expense", amount: 100, account_id: 1, category_id: 1, date });

  it("counts whole days across months and leap years", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2026-11-08", "2026-11-08")).toBe(0);
  });

  it("isn't due with no transactions or within 30 days", () => {
    expect(backupDueDays(null, [], "2026-11-08")).toBeNull();
    expect(backupDueDays(null, [on("2026-10-10")], "2026-11-08")).toBeNull();
    expect(backupDueDays("2026-10-10", [on("2026-01-01")], "2026-11-08")).toBeNull();
  });

  it("counts from the oldest transaction when there's no backup", () => {
    expect(backupDueDays(null, [on("2026-11-01"), on("2026-10-01")], "2026-11-08")).toBe(38);
  });

  it("counts from the last backup", () => {
    expect(backupDueDays("2026-09-01", [on("2026-01-01")], "2026-11-08")).toBe(68);
  });

  it("ignores a backup older than all the data", () => {
    expect(backupDueDays("2025-01-01", [on("2026-10-20")], "2026-11-08")).toBeNull();
  });
});

describe("cardCycle", () => {
  // visa: cutoff day 5, due day 25
  const charge = (date: string, amount: number, type: Transaction["type"] = "expense") =>
    tx({ type, amount, account_id: 3, category_id: type === "expense" ? 1 : null, to_account_id: type === "transfer" ? 1 : null, date });

  it("adds charges since the day after the last cutoff", () => {
    const txs = [charge("2026-11-05", 100), charge("2026-11-06", 200), charge("2026-11-08", 300, "transfer")];
    expect(cardCycle(visa, txs, "2026-11-08")).toEqual({ since: "2026-11-06", charges: 500 });
  });

  it("uses last month's cutoff on or before the cutoff day", () => {
    const txs = [charge("2026-10-05", 100), charge("2026-10-20", 200), charge("2026-11-05", 50)];
    expect(cardCycle(visa, txs, "2026-11-05")).toEqual({ since: "2026-10-06", charges: 250 });
  });

  it("leaves out payments into the card and other accounts", () => {
    const payment = tx({ type: "transfer", amount: 900, account_id: 1, to_account_id: 3, date: "2026-11-07" });
    const cashSpend = tx({ type: "expense", amount: 400, account_id: 1, category_id: 1, date: "2026-11-07" });
    expect(cardCycle(visa, [payment, cashSpend], "2026-11-08")?.charges).toBe(0);
  });

  it("clamps a day-31 cutoff to short months", () => {
    const card = { ...visa, cutoff_day: 31 };
    expect(cardCycle(card, [], "2026-03-10")?.since).toBe("2026-03-01");
  });

  it("is null without a cutoff day or for regular accounts", () => {
    expect(cardCycle({ ...visa, cutoff_day: null }, [], "2026-11-08")).toBeNull();
    expect(cardCycle(cash, [], "2026-11-08")).toBeNull();
  });
});

describe("nextDueDate", () => {
  it("is this month's due day when it hasn't passed", () => {
    expect(nextDueDate(visa, "2026-11-08")).toEqual({ date: "2026-11-25", days: 17 });
    expect(nextDueDate(visa, "2026-11-25")).toEqual({ date: "2026-11-25", days: 0 });
  });

  it("moves to next month after the due day, across the year end", () => {
    expect(nextDueDate(visa, "2026-12-26")).toEqual({ date: "2027-01-25", days: 30 });
  });

  it("clamps a day-31 due date to short months", () => {
    expect(nextDueDate({ ...visa, due_day: 31 }, "2027-02-10")).toEqual({ date: "2027-02-28", days: 18 });
  });

  it("is null without a due day", () => {
    expect(nextDueDate({ ...visa, due_day: null }, "2026-11-08")).toBeNull();
  });
});

describe("matchesSearch", () => {
  const names = {
    accounts: new Map([[1, "Cash"], [3, "Visa"]]),
    categories: new Map([[1, "Food"]]),
  };
  const lunch = tx({ type: "expense", amount: 125050, account_id: 1, category_id: 1, note: "Lunch with Ana" });
  const pay = tx({ type: "transfer", amount: 30000, account_id: 1, to_account_id: 3 });
  const find = (t: Transaction, q: string) => matchesSearch(t, q, names, 2);

  it("matches notes, categories and accounts, ignoring case", () => {
    expect(find(lunch, "ana")).toBe(true);
    expect(find(lunch, "FOOD")).toBe(true);
    expect(find(pay, "visa")).toBe(true);
    expect(find(lunch, "visa")).toBe(false);
  });

  it("matches amounts with or without grouping and decimals", () => {
    expect(find(lunch, "1250")).toBe(true);
    expect(find(lunch, "1,250.50")).toBe(true);
    expect(find(lunch, "1251")).toBe(false);
  });

  it("needs every word to match", () => {
    expect(find(lunch, "lunch 1250")).toBe(true);
    expect(find(lunch, "lunch visa")).toBe(false);
  });

  it("matches everything for an empty search, and nothing for stray marks", () => {
    expect(find(pay, "  ")).toBe(true);
    expect(find(pay, ".")).toBe(false);
  });
});

describe("charts", () => {
  it("totals spending per category, biggest first, leaving out income and transfers", () => {
    const txs = [
      tx({ type: "expense", amount: 100, account_id: 1, category_id: 1 }),
      tx({ type: "expense", amount: 500, account_id: 1, category_id: 2 }),
      tx({ type: "expense", amount: 150, account_id: 3, category_id: 1 }),
      tx({ type: "income", amount: 9000, account_id: 1 }),
      tx({ type: "transfer", amount: 700, account_id: 1, to_account_id: 3 }),
    ];
    expect(spendingByCategory(txs)).toEqual([
      { categoryId: 2, amount: 500 },
      { categoryId: 1, amount: 250 },
    ]);
  });

  it("gives every month in the range, oldest first, across the year end, empty months as zero", () => {
    const txs = [
      tx({ type: "income", amount: 1000, account_id: 1, date: "2026-12-15" }),
      tx({ type: "expense", amount: 300, account_id: 1, category_id: 1, date: "2027-02-01" }),
      tx({ type: "expense", amount: 999, account_id: 1, category_id: 1, date: "2026-10-31" }),
    ];
    expect(monthlyTotals(txs, "2027-02", 3)).toEqual([
      { month: "2026-12", income: 1000, spent: 0 },
      { month: "2027-01", income: 0, spent: 0 },
      { month: "2027-02", income: 0, spent: 300 },
    ]);
  });
});
