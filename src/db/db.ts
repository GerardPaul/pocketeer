import type { SQLiteDatabase } from "expo-sqlite";

import type { Account, Category, CategoryBudget, NewTransaction, Transaction } from "@/lib/ledger";

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

// DO NOTHING keeps the first choice: currency is locked once set.
export async function setCurrency(db: SQLiteDatabase, code: string) {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES ('currency', ?) ON CONFLICT (key) DO NOTHING",
    code,
  );
}

export async function saveAccount(db: SQLiteDatabase, a: Omit<Account, "id"> & { id?: number }) {
  const limit = a.type === "credit_card" ? a.credit_limit : null;
  if (a.id === undefined) {
    await db.runAsync(
      "INSERT INTO accounts (name, type, starting_amount, credit_limit) VALUES (?, ?, ?, ?)",
      a.name.trim(), a.type, a.starting_amount, limit,
    );
  } else {
    await db.runAsync(
      "UPDATE accounts SET name = ?, type = ?, starting_amount = ?, credit_limit = ? WHERE id = ?",
      a.name.trim(), a.type, a.starting_amount, limit, a.id,
    );
  }
}

// The transactions foreign key makes SQLite reject this if the account is in use.
export async function deleteAccount(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM accounts WHERE id = ?", id);
}

// The budget applies from `month` on; earlier months keep whatever budget they had.
export async function saveCategory(
  db: SQLiteDatabase,
  c: { id?: number; name: string },
  budget: number,
  month: string,
) {
  await db.withTransactionAsync(async () => {
    let id = c.id;
    if (id === undefined) {
      id = (await db.runAsync("INSERT INTO categories (name) VALUES (?)", c.name.trim())).lastInsertRowId;
    } else {
      await db.runAsync("UPDATE categories SET name = ? WHERE id = ?", c.name.trim(), id);
    }
    await db.runAsync(
      `INSERT INTO category_budgets (category_id, month, amount) VALUES (?, ?, ?)
       ON CONFLICT (category_id, month) DO UPDATE SET amount = excluded.amount`,
      id, month, budget,
    );
  });
}

// Budgets cascade; the transactions foreign key makes SQLite reject this if the category is in use.
export async function deleteCategory(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM categories WHERE id = ?", id);
}

export async function saveTransaction(db: SQLiteDatabase, t: NewTransaction) {
  const values = [t.type, t.amount, t.date, t.note.trim(), t.account_id, t.to_account_id, t.category_id] as const;
  if (t.id === undefined) {
    await db.runAsync(
      `INSERT INTO transactions (type, amount, date, note, account_id, to_account_id, category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ...values,
    );
  } else {
    await db.runAsync(
      `UPDATE transactions SET type = ?, amount = ?, date = ?, note = ?, account_id = ?, to_account_id = ?,
       category_id = ? WHERE id = ?`,
      ...values, t.id,
    );
  }
}

export async function deleteTransaction(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM transactions WHERE id = ?", id);
}

// Replaces everything in one transaction, so a failed import leaves the old data untouched.
export async function replaceAllData(db: SQLiteDatabase, data: Omit<Data, "currency"> & { currency: string }) {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM category_budgets;
      DELETE FROM categories;
      DELETE FROM accounts;
      DELETE FROM settings;
    `);
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('currency', ?)", data.currency);
    for (const a of data.accounts) {
      await db.runAsync(
        "INSERT INTO accounts (id, name, type, starting_amount, credit_limit) VALUES (?, ?, ?, ?, ?)",
        a.id, a.name, a.type, a.starting_amount, a.credit_limit,
      );
    }
    for (const c of data.categories) {
      await db.runAsync("INSERT INTO categories (id, name) VALUES (?, ?)", c.id, c.name);
    }
    for (const b of data.budgets) {
      await db.runAsync(
        "INSERT INTO category_budgets (category_id, month, amount) VALUES (?, ?, ?)",
        b.category_id, b.month, b.amount,
      );
    }
    for (const t of data.transactions) {
      await db.runAsync(
        `INSERT INTO transactions (id, type, amount, date, note, account_id, to_account_id, category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id, t.type, t.amount, t.date, t.note, t.account_id, t.to_account_id, t.category_id,
      );
    }
  });
}

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
