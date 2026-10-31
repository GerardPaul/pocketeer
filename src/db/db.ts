import type { SQLiteDatabase } from "expo-sqlite";

import type { Account, Category, CategoryBudget, Transaction } from "@/lib/ledger";

const DATABASE_VERSION = 1;

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA foreign_keys = ON;");
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    // Foreign keys without ON DELETE block deleting accounts/categories that have transactions.
    await db.execAsync(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('regular', 'credit_card')),
        starting_amount INTEGER NOT NULL CHECK (starting_amount >= 0),
        credit_limit INTEGER,
        CHECK (type = 'regular' OR credit_limit > 0)
      );
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE category_budgets (
        category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
        month TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK (amount >= 0),
        PRIMARY KEY (category_id, month)
      );
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        amount INTEGER NOT NULL CHECK (amount > 0),
        date TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        account_id INTEGER NOT NULL REFERENCES accounts (id),
        to_account_id INTEGER REFERENCES accounts (id),
        category_id INTEGER REFERENCES categories (id),
        CHECK ((type = 'expense') = (category_id IS NOT NULL)),
        CHECK ((type = 'transfer') = (to_account_id IS NOT NULL)),
        CHECK (to_account_id IS NULL OR to_account_id <> account_id)
      );
      CREATE INDEX transactions_date ON transactions (date);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export type Data = {
  currency: string | null;
  accounts: Account[];
  categories: Category[];
  budgets: CategoryBudget[];
  transactions: Transaction[];
};

// ponytail: loads everything and computes in JS; fine for one person's data, switch to SQL aggregates if it gets slow.
export async function loadData(db: SQLiteDatabase): Promise<Data> {
  const [setting, accounts, categories, budgets, transactions] = await Promise.all([
    db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'currency'"),
    db.getAllAsync<Account>("SELECT * FROM accounts ORDER BY name COLLATE NOCASE"),
    db.getAllAsync<Category>("SELECT * FROM categories ORDER BY name COLLATE NOCASE"),
    db.getAllAsync<CategoryBudget>("SELECT * FROM category_budgets"),
    db.getAllAsync<Transaction>("SELECT * FROM transactions ORDER BY date DESC, id DESC"),
  ]);
  return { currency: setting?.value ?? null, accounts, categories, budgets, transactions };
}
