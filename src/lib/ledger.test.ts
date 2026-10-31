import {
  type Account,
  type Transaction,
  accountAmount,
  budgetFor,
  deleteTransactionProblem,
  shiftMonth,
  spentFor,
  validateAccount,
  validateTransaction,
} from "./ledger";

const cash: Account = { id: 1, name: "Cash", type: "regular", starting_amount: 1000, credit_limit: null };
const bank: Account = { id: 2, name: "Bank", type: "regular", starting_amount: 5000, credit_limit: null };
const visa: Account = { id: 3, name: "Visa", type: "credit_card", starting_amount: 0, credit_limit: 3000 };
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
