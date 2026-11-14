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
  // Credit cards only, both optional: day of the month (1–31) the statement closes and payment is due.
  cutoff_day: number | null;
  due_day: number | null;
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
    if (!isDay(account.cutoff_day)) return "Cutoff date must be a day from 1 to 31.";
    if (!isDay(account.due_day)) return "Due date must be a day from 1 to 31.";
  }
  const used = txs.some((t) => t.account_id === account.id || t.to_account_id === account.id);
  // Flipping type would turn "money held" into "money owed" for every past transaction.
  if (existing && used && existing.type !== account.type) {
    return "Can't change the type of an account that has transactions.";
  }
  return accountProblem(account, accountAmount(account, txs));
}

export function isDay(day: number | null): boolean {
  return day === null || (Number.isInteger(day) && day >= 1 && day <= 31);
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

// "Sat, Nov 14" for a YYYY-MM-DD day.
export function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(y, m - 1, d),
  );
}

// Splits a date-sorted list into one group per day, keeping the order.
export function groupByDay<T extends { date: string }>(txs: readonly T[]): { date: string; data: T[] }[] {
  const groups: { date: string; data: T[] }[] = [];
  for (const t of txs) {
    const last = groups.at(-1);
    if (last?.date === t.date) last.data.push(t);
    else groups.push({ date: t.date, data: [t] });
  }
  return groups;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// Money in and out across the given transactions. Transfers only move money between accounts, so they don't count.
export function summarize(txs: readonly Transaction[]): { income: number; spent: number; net: number } {
  let income = 0;
  let spent = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") spent += t.amount;
  }
  return { income, spent, net: income - spent };
}

const BACKUP_EVERY_DAYS = 30;

// Whole days from one YYYY-MM-DD to another, ignoring time zones and daylight saving.
export function daysBetween(from: string, to: string): number {
  const utc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

// Days since the data was last safe in a backup file, or null when no reminder is due. Without a backup, the clock
// starts at the oldest transaction, so a new user isn't nagged on day one. Data logged after clearing everything starts
// its own clock, since an older backup doesn't hold it.
export function backupDueDays(
  lastBackup: string | null,
  txs: readonly Transaction[],
  today: string,
): number | null {
  if (txs.length === 0) return null;
  const oldest = txs.reduce((min, t) => (t.date < min ? t.date : min), txs[0].date);
  const since = lastBackup && lastBackup > oldest ? lastBackup : oldest;
  const days = daysBetween(since, today);
  return days >= BACKUP_EVERY_DAYS ? days : null;
}

// The given day in that month, moved back to the month's last day when it's shorter (day 31 in February → 28 or 29).
function dayInMonth(year: number, month0: number, day: number): string {
  const last = new Date(year, month0 + 1, 0).getDate();
  return toDateString(new Date(year, month0, Math.min(day, last)));
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return toDateString(new Date(y, m - 1, d + days));
}

// What's been charged to a card since its last cutoff: expenses and transfers paid from it. Payments into the card
// don't reduce it, since this is the new statement building up, not the amount owed (that's accountAmount).
export function cardCycle(
  account: Account,
  txs: readonly Transaction[],
  today: string,
): { since: string; charges: number } | null {
  if (account.type !== "credit_card" || account.cutoff_day === null) return null;
  const [y, m] = today.split("-").map(Number);
  let cutoff = dayInMonth(y, m - 1, account.cutoff_day);
  if (cutoff >= today) cutoff = dayInMonth(y, m - 2, account.cutoff_day);
  let charges = 0;
  for (const t of txs) {
    if (t.account_id === account.id && t.type !== "income" && t.date > cutoff && t.date <= today) charges += t.amount;
  }
  return { since: addDays(cutoff, 1), charges };
}

// The next due date on or after today, and how many days away it is.
export function nextDueDate(account: Account, today: string): { date: string; days: number } | null {
  if (account.type !== "credit_card" || account.due_day === null) return null;
  const [y, m] = today.split("-").map(Number);
  let date = dayInMonth(y, m - 1, account.due_day);
  if (date < today) date = dayInMonth(y, m, account.due_day);
  return { date, days: daysBetween(today, date) };
}

// Search words each have to match the note, a category or account name, or the amount ("1250", "1,250.50").
// `names` maps account and category ids to names; amounts compare as plain digits so grouping marks don't matter.
export function matchesSearch(
  t: Transaction,
  query: string,
  names: { accounts: ReadonlyMap<number, string>; categories: ReadonlyMap<number, string> },
  digits: number,
): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = [
    t.note,
    names.accounts.get(t.account_id),
    t.to_account_id !== null ? names.accounts.get(t.to_account_id) : "",
    t.category_id !== null ? names.categories.get(t.category_id) : "",
  ]
    .join(" ")
    .toLowerCase();
  const amount = (t.amount / 10 ** digits).toFixed(digits);
  return words.every((w) => {
    if (text.includes(w)) return true;
    const number = w.replace(/[^\d.]/g, "");
    return number !== "" && /\d/.test(number) && amount.startsWith(number);
  });
}

// Expense totals per category, biggest first.
export function spendingByCategory(txs: readonly Transaction[]): { categoryId: number; amount: number }[] {
  const totals = new Map<number, number>();
  for (const t of txs) {
    if (t.type === "expense" && t.category_id !== null) {
      totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount);
    }
  }
  return [...totals].map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount);
}

// Income and spending for each of the `count` months ending at `lastMonth`, oldest first.
export function monthlyTotals(
  txs: readonly Transaction[],
  lastMonth: string,
  count: number,
): { month: string; income: number; spent: number }[] {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(lastMonth, i - count + 1));
  return months.map((month) => {
    const { income, spent } = summarize(txs.filter((t) => t.date.startsWith(month)));
    return { month, income, spent };
  });
}
