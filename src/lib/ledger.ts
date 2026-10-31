import type { CategoryIcon } from "@/lib/category-icons";

export type AccountType = "regular" | "credit_card";
export type TransactionType = "expense" | "income" | "transfer";

export type Account = {
  id: number;
  name: string;
  type: AccountType;
  // Regular: starting balance. Credit card: starting amount owed.
  starting_amount: number;
  credit_limit: number | null;
};

export type Category = { id: number; name: string; icon: CategoryIcon };

// The budget in effect from `month` (YYYY-MM) onward, until a later row replaces it.
export type CategoryBudget = { category_id: number; month: string; amount: number };

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
  account_id: number;
  to_account_id: number | null; // transfers only
  category_id: number | null; // expenses only
};

export type NewTransaction = Omit<Transaction, "id"> & { id?: number };

// Regular account: money held. Credit card: amount owed.
export function accountAmount(account: Account, txs: readonly NewTransaction[]): number {
  const sign = account.type === "regular" ? 1 : -1;
  let total = account.starting_amount;
  for (const t of txs) {
    if (t.account_id === account.id) total += sign * (t.type === "income" ? t.amount : -t.amount);
    else if (t.to_account_id === account.id) total += sign * t.amount;
  }
  return total;
}

function accountProblem(account: Account, amount: number): string | null {
  if (account.type === "regular") {
    return amount < 0 ? `${account.name} balance can't go below 0.` : null;
  }
  if (amount < 0) return `Can't pay ${account.name} more than is owed.`;
  if (account.credit_limit !== null && amount > account.credit_limit) {
    return `${account.name} would go over its credit limit.`;
  }
  return null;
}

// Checks the given accounts against a proposed list of all transactions.
// ponytail: checks final balances only, not the running balance on each past date.
function ledgerProblem(
  accounts: readonly Account[],
  txs: readonly NewTransaction[],
  accountIds: readonly (number | null)[],
): string | null {
  for (const account of accounts) {
    if (!accountIds.includes(account.id)) continue;
    const problem = accountProblem(account, accountAmount(account, txs));
    if (problem) return problem;
  }
  return null;
}

// Field rules for one transaction, without looking at balances.
export function transactionShapeProblem(tx: NewTransaction, accounts: readonly Account[]): string | null {
  if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) return "Enter an amount above 0.";
  if (!isRealDate(tx.date)) return "Pick a date.";
  if (!accounts.some((a) => a.id === tx.account_id)) return "Pick an account.";
  if (tx.type === "expense" && tx.category_id === null) return "Pick a category.";
  if (tx.type !== "expense" && tx.category_id !== null) return "Only expenses have a category.";
  if (tx.type === "transfer") {
    if (!accounts.some((a) => a.id === tx.to_account_id)) return "Pick an account to transfer to.";
    if (tx.to_account_id === tx.account_id) return "Pick two different accounts.";
  } else if (tx.to_account_id !== null) {
    return "Only transfers have a destination account.";
  }
  return null;
}

export function validateTransaction(
  tx: NewTransaction,
  accounts: readonly Account[],
  txs: readonly Transaction[],
): string | null {
  const shape = transactionShapeProblem(tx, accounts);
  if (shape) return shape;

  const old = tx.id === undefined ? undefined : txs.find((t) => t.id === tx.id);
  const next = [...txs.filter((t) => t.id !== tx.id), tx];
  return ledgerProblem(accounts, next, [
    tx.account_id,
    tx.to_account_id,
    old?.account_id ?? null,
    old?.to_account_id ?? null,
  ]);
}

export function deleteTransactionProblem(
  id: number,
  accounts: readonly Account[],
  txs: readonly Transaction[],
): string | null {
  const old = txs.find((t) => t.id === id);
  if (!old) return null;
  return ledgerProblem(
    accounts,
    txs.filter((t) => t.id !== id),
    [old.account_id, old.to_account_id],
  );
}

export function validateAccount(
  account: Account,
  existing: Account | undefined,
  txs: readonly Transaction[],
): string | null {
  if (!account.name.trim()) return "Enter a name.";
  if (!Number.isSafeInteger(account.starting_amount) || account.starting_amount < 0) {
    return account.type === "regular" ? "Starting balance can't be below 0." : "Amount owed can't be below 0.";
  }
  if (account.type === "credit_card") {
    if (account.credit_limit === null || !Number.isSafeInteger(account.credit_limit) || account.credit_limit <= 0) {
      return "Enter a credit limit above 0.";
    }
  }
  const used = txs.some((t) => t.account_id === account.id || t.to_account_id === account.id);
  // Flipping type would turn "money held" into "money owed" for every past transaction.
  if (existing && used && existing.type !== account.type) {
    return "Can't change the type of an account that has transactions.";
  }
  return accountProblem(account, accountAmount(account, txs));
}

export function budgetFor(
  categoryId: number,
  month: string,
  budgets: readonly CategoryBudget[],
): number | null {
  let best: CategoryBudget | null = null;
  for (const b of budgets) {
    if (b.category_id === categoryId && b.month <= month && (!best || b.month > best.month)) best = b;
  }
  return best?.amount ?? null;
}

export function spentFor(categoryId: number, month: string, txs: readonly Transaction[]): number {
  let total = 0;
  for (const t of txs) {
    if (t.type === "expense" && t.category_id === categoryId && t.date.startsWith(month)) total += t.amount;
  }
  return total;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// YYYY-MM-DD that exists on the calendar (rejects 2026-02-30, which Date would roll into March).
export function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  return toDateString(new Date(y, m - 1, d)) === s;
}

export function currentMonth(): string {
  return toDateString(new Date()).slice(0, 7);
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
