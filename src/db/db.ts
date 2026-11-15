import type { SQLiteDatabase } from "expo-sqlite";

import { type CategoryIcon, toCategoryIcon } from "@/lib/category-icons";
import type { Account, Category, CategoryBudget, Goal, NewTransaction, Recurring, Transaction } from "@/lib/ledger";

const DATABASE_VERSION = 5;

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
  if (version < 2) {
    await db.execAsync("ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'tag';");
  }
  if (version < 3) {
    await db.execAsync(`
      ALTER TABLE accounts ADD COLUMN cutoff_day INTEGER CHECK (cutoff_day BETWEEN 1 AND 31);
      ALTER TABLE accounts ADD COLUMN due_day INTEGER CHECK (due_day BETWEEN 1 AND 31);
    `);
  }
  if (version < 4) {
    // Same rules as transactions. A recurring item is only a template, so deleting its account or category
    // takes it along instead of blocking the delete.
    await db.execAsync(`
      CREATE TABLE recurring (
        id INTEGER PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        amount INTEGER NOT NULL CHECK (amount > 0),
        note TEXT NOT NULL DEFAULT '',
        account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
        to_account_id INTEGER REFERENCES accounts (id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories (id) ON DELETE CASCADE,
        day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
        second_day INTEGER CHECK (second_day BETWEEN 1 AND 31),
        handled_through TEXT NOT NULL,
        CHECK ((type = 'expense') = (category_id IS NOT NULL)),
        CHECK ((type = 'transfer') = (to_account_id IS NOT NULL)),
        CHECK (to_account_id IS NULL OR to_account_id <> account_id)
      );
    `);
  }
  if (version < 5) {
    // A goal's progress is its account's balance, so the goal goes along when the account is deleted.
    await db.execAsync(`
      CREATE TABLE goals (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        target INTEGER NOT NULL CHECK (target > 0),
        account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
        target_date TEXT
      );
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// Card due-date reminders on or off, and the daily nudge's time ("HH:MM") or null when it's off.
export type Reminders = { due: boolean; daily: string | null };

export type Data = {
  currency: string | null;
  // Date of the last export from this phone (YYYY-MM-DD); a phone setting, so it isn't part of the backup file.
  lastBackup: string | null;
  // Phone settings too, like the theme: they survive clearing and importing and aren't in the backup file.
  reminders: Reminders;
  accounts: Account[];
  categories: Category[];
  budgets: CategoryBudget[];
  transactions: Transaction[];
  recurring: Recurring[];
  goals: Goal[];
};

// DO NOTHING keeps the first choice: currency is locked once set.
export async function setCurrency(db: SQLiteDatabase, code: string) {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES ('currency', ?) ON CONFLICT (key) DO NOTHING",
    code,
  );
}

export async function saveAccount(db: SQLiteDatabase, a: Omit<Account, "id"> & { id?: number }) {
  const card = a.type === "credit_card";
  const values = [
    a.name.trim(), a.type, a.starting_amount,
    card ? a.credit_limit : null, card ? a.cutoff_day : null, card ? a.due_day : null,
  ] as const;
  if (a.id === undefined) {
    await db.runAsync(
      `INSERT INTO accounts (name, type, starting_amount, credit_limit, cutoff_day, due_day)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ...values,
    );
  } else {
    await db.runAsync(
      `UPDATE accounts SET name = ?, type = ?, starting_amount = ?, credit_limit = ?, cutoff_day = ?, due_day = ?
       WHERE id = ?`,
      ...values, a.id,
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
  c: { id?: number; name: string; icon: CategoryIcon },
  budget: number,
  month: string,
) {
  await db.withTransactionAsync(async () => {
    let id = c.id;
    if (id === undefined) {
      id = (await db.runAsync("INSERT INTO categories (name, icon) VALUES (?, ?)", c.name.trim(), c.icon))
        .lastInsertRowId;
    } else {
      await db.runAsync("UPDATE categories SET name = ?, icon = ? WHERE id = ?", c.name.trim(), c.icon, id);
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

// `repeat` also sets it up to recur from this date on; `handles` marks a due recurring date as done. Either way it's
// one database transaction, so a transaction is never logged without its recurring bookkeeping or the other way round.
export async function saveTransaction(
  db: SQLiteDatabase,
  t: NewTransaction,
  extra: { repeat?: { day: number; second_day: number | null }; handles?: { id: number; date: string } } = {},
) {
  const values = [t.type, t.amount, t.date, t.note.trim(), t.account_id, t.to_account_id, t.category_id] as const;
  await db.withTransactionAsync(async () => {
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
    if (extra.repeat) {
      // This date is already logged, so the first due date is the one after it.
      await db.runAsync(
        `INSERT INTO recurring (type, amount, note, account_id, to_account_id, category_id, day, second_day,
         handled_through) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t.type, t.amount, t.note.trim(), t.account_id, t.to_account_id, t.category_id,
        extra.repeat.day, extra.repeat.second_day, t.date,
      );
    }
    if (extra.handles) await markRecurringHandled(db, extra.handles.id, extra.handles.date);
  });
}

// Logged or skipped: the item moves on to its next date.
export async function markRecurringHandled(db: SQLiteDatabase, id: number, date: string) {
  await db.runAsync("UPDATE recurring SET handled_through = ? WHERE id = ?", date, id);
}

// Leaves handled_through alone, so the next date comes after the last one logged or skipped, on the new days.
export async function updateRecurring(db: SQLiteDatabase, r: Omit<Recurring, "handled_through">) {
  await db.runAsync(
    `UPDATE recurring SET type = ?, amount = ?, note = ?, account_id = ?, to_account_id = ?, category_id = ?, day = ?,
     second_day = ? WHERE id = ?`,
    r.type, r.amount, r.note.trim(), r.account_id, r.to_account_id, r.category_id, r.day, r.second_day, r.id,
  );
}

export async function deleteRecurring(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM recurring WHERE id = ?", id);
}

export async function saveGoal(db: SQLiteDatabase, g: Omit<Goal, "id"> & { id?: number }) {
  const values = [g.name.trim(), g.target, g.account_id, g.target_date] as const;
  if (g.id === undefined) {
    await db.runAsync("INSERT INTO goals (name, target, account_id, target_date) VALUES (?, ?, ?, ?)", ...values);
  } else {
    await db.runAsync("UPDATE goals SET name = ?, target = ?, account_id = ?, target_date = ? WHERE id = ?", ...values, g.id);
  }
}

export async function deleteGoal(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM goals WHERE id = ?", id);
}

export async function deleteTransaction(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM transactions WHERE id = ?", id);
}

export type Theme = "light" | "dark";

// Light unless the user picked dark in Settings.
export async function loadTheme(db: SQLiteDatabase): Promise<Theme> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'theme'");
  return row?.value === "dark" ? "dark" : "light";
}

export async function saveTheme(db: SQLiteDatabase, theme: Theme) {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES ('theme', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    theme,
  );
}

export async function loadAppLock(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'app_lock'");
  return row?.value === "on";
}

export async function saveAppLock(db: SQLiteDatabase, on: boolean) {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES ('app_lock', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    on ? "on" : "off",
  );
}

export async function saveReminders(db: SQLiteDatabase, r: Reminders) {
  await db.withTransactionAsync(async () => {
    const upsert = "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value";
    await db.runAsync(upsert, "reminder_due", r.due ? "on" : "off");
    await db.runAsync(upsert, "reminder_daily", r.daily ?? "off");
  });
}

export async function saveLastBackup(db: SQLiteDatabase, date: string) {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES ('last_backup', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    date,
  );
}

// The theme, app lock and reminders are phone preferences, not data, so they survive clearing and importing.
const DELETE_ALL = `
  DELETE FROM goals;
  DELETE FROM recurring;
  DELETE FROM transactions;
  DELETE FROM category_budgets;
  DELETE FROM categories;
  DELETE FROM accounts;
  DELETE FROM settings WHERE key NOT IN ('theme', 'app_lock', 'reminder_due', 'reminder_daily');
`;

// Removes everything, currency included, so the app starts over at the welcome screen.
export async function clearAllData(db: SQLiteDatabase) {
  await db.withTransactionAsync(() => db.execAsync(DELETE_ALL));
}

// Replaces everything in one transaction, so a failed import leaves the old data untouched.
export async function replaceAllData(
  db: SQLiteDatabase,
  data: Omit<Data, "currency" | "lastBackup" | "reminders"> & { currency: string },
) {
  await db.withTransactionAsync(async () => {
    await db.execAsync(DELETE_ALL);
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('currency', ?)", data.currency);
    for (const a of data.accounts) {
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, starting_amount, credit_limit, cutoff_day, due_day)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        a.id, a.name, a.type, a.starting_amount, a.credit_limit, a.cutoff_day, a.due_day,
      );
    }
    for (const c of data.categories) {
      await db.runAsync("INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)", c.id, c.name, c.icon);
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
    for (const r of data.recurring) {
      await db.runAsync(
        `INSERT INTO recurring (id, type, amount, note, account_id, to_account_id, category_id, day, second_day,
         handled_through) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id, r.type, r.amount, r.note, r.account_id, r.to_account_id, r.category_id, r.day, r.second_day,
        r.handled_through,
      );
    }
    for (const g of data.goals) {
      await db.runAsync(
        "INSERT INTO goals (id, name, target, account_id, target_date) VALUES (?, ?, ?, ?, ?)",
        g.id, g.name, g.target, g.account_id, g.target_date,
      );
    }
  });
}

// ponytail: loads everything and computes in JS; fine for one person's data, switch to SQL aggregates if it gets slow.
export async function loadData(db: SQLiteDatabase): Promise<Data> {
  const [setting, backup, due, daily, accounts, categories, budgets, transactions, recurring, goals] =
    await Promise.all([
    db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'currency'"),
    db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'last_backup'"),
    db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'reminder_due'"),
    db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'reminder_daily'"),
    db.getAllAsync<Account>("SELECT * FROM accounts ORDER BY name COLLATE NOCASE"),
    db.getAllAsync<Category>("SELECT * FROM categories ORDER BY name COLLATE NOCASE"),
    db.getAllAsync<CategoryBudget>("SELECT * FROM category_budgets"),
    db.getAllAsync<Transaction>("SELECT * FROM transactions ORDER BY date DESC, id DESC"),
    db.getAllAsync<Recurring>("SELECT * FROM recurring ORDER BY id"),
    db.getAllAsync<Goal>("SELECT * FROM goals ORDER BY name COLLATE NOCASE"),
  ]);
  return {
    currency: setting?.value ?? null,
    lastBackup: backup?.value ?? null,
    // Both start off; a stored time that isn't HH:MM counts as off.
    reminders: {
      due: due?.value === "on",
      daily: daily && /^\d{2}:\d{2}$/.test(daily.value) ? daily.value : null,
    },
    accounts,
    // The column is plain text, so an unknown name falls back instead of breaking the icon lookup.
    categories: categories.map((c) => ({ ...c, icon: toCategoryIcon(c.icon) })),
    budgets,
    transactions,
    recurring,
    goals,
  };
}
