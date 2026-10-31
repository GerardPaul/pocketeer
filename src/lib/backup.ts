import type { Data } from "@/db/db";
import {
  type Account,
  type Category,
  type CategoryBudget,
  type Transaction,
  transactionShapeProblem,
  validateAccount,
} from "@/lib/ledger";
import { isValidCurrency } from "@/lib/money";

const APP = "pocketeer";
const VERSION = 1;

export type Backup = Required<{ [K in keyof Data]: NonNullable<Data[K]> }>;

export function toBackupJson(data: Backup, exportedAt: Date): string {
  return JSON.stringify(
    { app: APP, version: VERSION, exported_at: exportedAt.toISOString(), ...data },
    null,
    2,
  );
}

type Result = { ok: true; backup: Backup } | { ok: false; error: string };

function fail(error: string): Result {
  return { ok: false, error };
}

const isId = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
const isAmount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

// The file comes from outside the app, so every field is checked before anything touches the database.
export function parseBackup(text: string): Result {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("This file isn't valid JSON.");
  }
  if (!isRecord(raw) || raw.app !== APP) return fail("This isn't a Pocketeer backup file.");
  if (raw.version !== VERSION) return fail(`Unsupported backup version: ${String(raw.version)}.`);
  if (typeof raw.currency !== "string" || !isValidCurrency(raw.currency)) return fail("Backup has an invalid currency.");
  for (const key of ["accounts", "categories", "budgets", "transactions"] as const) {
    if (!Array.isArray(raw[key])) return fail(`Backup is missing ${key}.`);
  }

  const accounts: Account[] = [];
  for (const a of raw.accounts as unknown[]) {
    if (
      !isRecord(a) ||
      !isId(a.id) ||
      typeof a.name !== "string" ||
      (a.type !== "regular" && a.type !== "credit_card") ||
      !isAmount(a.starting_amount) ||
      !(a.credit_limit === null || isId(a.credit_limit))
    ) {
      return fail("Backup has an invalid account.");
    }
    accounts.push({
      id: a.id,
      name: a.name,
      type: a.type,
      starting_amount: a.starting_amount,
      credit_limit: a.type === "credit_card" ? a.credit_limit : null,
    });
  }

  const categories: Category[] = [];
  for (const c of raw.categories as unknown[]) {
    if (!isRecord(c) || !isId(c.id) || typeof c.name !== "string" || !c.name.trim()) {
      return fail("Backup has an invalid category.");
    }
    categories.push({ id: c.id, name: c.name });
  }

  const budgets: CategoryBudget[] = [];
  for (const b of raw.budgets as unknown[]) {
    if (
      !isRecord(b) ||
      !categories.some((c) => c.id === b.category_id) ||
      typeof b.month !== "string" ||
      !/^\d{4}-\d{2}$/.test(b.month) ||
      !isAmount(b.amount)
    ) {
      return fail("Backup has an invalid budget.");
    }
    budgets.push({ category_id: b.category_id as number, month: b.month, amount: b.amount });
  }

  const transactions: Transaction[] = [];
  for (const t of raw.transactions as unknown[]) {
    if (
      !isRecord(t) ||
      !isId(t.id) ||
      (t.type !== "expense" && t.type !== "income" && t.type !== "transfer") ||
      typeof t.date !== "string" ||
      typeof t.note !== "string" ||
      !(t.to_account_id === null || isId(t.to_account_id)) ||
      !(t.category_id === null || categories.some((c) => c.id === t.category_id))
    ) {
      return fail("Backup has an invalid transaction.");
    }
    const tx: Transaction = {
      id: t.id,
      type: t.type,
      amount: t.amount as number,
      date: t.date,
      note: t.note,
      account_id: t.account_id as number,
      to_account_id: t.to_account_id as number | null,
      category_id: t.category_id as number | null,
    };
    const problem = transactionShapeProblem(tx, accounts);
    if (problem) return fail(`Backup has an invalid transaction (${problem})`);
    transactions.push(tx);
  }

  const unique = (ids: number[]) => new Set(ids).size === ids.length;
  if (!unique(accounts.map((a) => a.id))) return fail("Backup has duplicate accounts.");
  if (!unique(categories.map((c) => c.id))) return fail("Backup has duplicate categories.");
  if (!unique(transactions.map((t) => t.id))) return fail("Backup has duplicate transactions.");
  if (new Set(budgets.map((b) => `${b.category_id}:${b.month}`)).size !== budgets.length) {
    return fail("Backup has duplicate budgets.");
  }

  // Same rules as the app: names, limits, no negative balances, no card over its limit.
  for (const a of accounts) {
    const problem = validateAccount(a, undefined, transactions);
    if (problem) return fail(`Backup breaks a balance rule: ${problem}`);
  }

  return { ok: true, backup: { currency: raw.currency, accounts, categories, budgets, transactions } };
}
