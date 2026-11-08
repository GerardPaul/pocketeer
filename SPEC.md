# Pocketeer — Spec

Living document. Update it whenever a decision changes.

Last updated: 2026-11-06

## 1. Overview

| Item | Decision |
|---|---|
| App name | Pocketeer (verify availability in App Store Connect / Google Play and trademark search before publishing) |
| Bundle ID | Not set yet; add to `app.json` before the first EAS store build |
| Purpose | Personal budget and expense tracker |
| Users | Single user, no login, no accounts/auth |
| Goals | Learn React Native; portfolio project; publish to App Store / Play Store eventually |
| Differentiators | Simplicity and portability |
| Primary use | On the phone; simple but robust enough for daily use |
| Platform | Expo (React Native) — iOS and Android |
| Storage | Local on device only |
| Portability | Export / import data as a file to move to another device |
| Currency | One currency for the whole app, chosen by the user |
| Version control | Git repo (set up in the project setup step) |

## 2. Core concepts

### Account
Where money lives or is owed. Every account has a name and a **type**:

| Type | Examples | Tracks | Rule |
|---|---|---|---|
| Regular | Cash, Bank, E-wallet | Balance (money you have) | Balance can never go below 0 |
| Credit card | Visa, Mastercard | Amount owed, against a credit limit | Amount owed can never exceed the credit limit |

- Regular: has a starting balance.
  Balance = starting balance + income + transfers in − expenses − transfers out.
- Credit card: has a credit limit and a starting amount owed, plus an optional cutoff day and due day (day of the month, 1–31), shown on the card.
  Owed = starting owed + expenses + transfers out − payments (transfers in) − refunds (income).
  Available credit = limit − owed.
- Any transaction that would break the rule above is rejected with a clear message.
- An account with transactions cannot be deleted.

### Category
What money is spent on (e.g. Food, Transport).
- Has a name and a fixed **monthly budget**.
- Budget **resets every month**. Unspent budget does not carry over.
- Unspent money is never lost: it simply stays in whichever account it was in.
- Every expense must have a category.
- A category with transactions cannot be deleted.

### Transaction
Every money movement is one of three types:

| Type | Regular account | Credit card | Category budget |
|---|---|---|---|
| Expense | Balance decreases | Owed increases | Counts against one category for that month |
| Income | Balance increases | Owed decreases (refund) | No |
| Transfer | From: decreases / To: increases | From: owed increases (cash advance) / To: owed decreases (payment) | No |

Each transaction has: type, amount, date, optional note, and the account(s) / category it applies to.

Examples:
- "300 lunch from Cash, category Food" → Cash −300, Food spent this month +300.
- "2,000 groceries on Visa, category Food" → Visa owed +2,000, Food spent this month +2,000.
- "Pay 2,000 from Bank to Visa" (transfer) → Bank −2,000, Visa owed −2,000. Not an expense, so Food is not counted twice.

## 3. MVP features

0. **Welcome** — first screen on a fresh install (and after clearing data): app logo and name, "Let’s get started" button, then the currency picker. The picker is a searchable grid: each tile shows the currency symbol with its name below. It has no on-screen Back; the system back gesture or button returns to the welcome screen.
   After the currency is picked, a five-step tutorial (accounts, budgets, logging, history, backups) runs once, with Skip and Next. Swiping left goes to the next step, swiping right to the previous one.
1. **Accounts** — create, edit, delete (only if no transactions); regular (starting balance) or credit card (credit limit, starting owed, optional cutoff and due days). In the Accounts tab, tapping an account offers "View transactions" or "Edit account". An account's transactions screen lists everything it was used for, newest first, ten at a time with a "Load more" button, and can be limited to a date range. A credit card with a cutoff day shows "This cycle": what was charged to it (expenses and transfers paid from it) since the day after its last cutoff; with a due day it shows the next due date and how many days away it is. Days past a short month's end move to its last day (31 → Feb 28).
2. **Categories** — create, edit, delete (only if no transactions); set monthly budget; pick an icon (shown in the Categories tab, budget rows, expense rows in history and the category picker). The icon comes first in the form; picking one on a new category fills in a suggested name (e.g. coffee cup → "Coffee") unless the user has typed their own. Editing never renames.
3. **Log expense** — amount, account, category, date, note.
4. **Log income** — amount, account, date, note (e.g. salary).
5. **Transfer** — move money between two accounts.
6. **Dashboard** — total money held ("In your pocket"); each regular account's balance; each credit card's owed and available credit; each category's spent vs. remaining for the current month. With no categories yet, a "+" tile like the one for accounts adds the first one; after that, an "Add category" tile ends the budgets grid.
7. **Transaction list** — view, edit, delete past entries. Expense, income and transfer rows have red, green and white icon circles. In the form, accounts and categories are picked from a searchable dropdown, and a transfer's "to" list leaves out the "from" account. A saved transaction has "Log again", which opens a new one filled in the same way (type, amount, accounts, category, note) and dated today.
8. **History** — browse previous months (category spent vs. budget per month). Stops at the current month; no future months. Filters (type, account, category) narrow the month's transactions and can be combined; the category filter only applies to all types or expenses, and income or transfer filters hide the budgets. A summary at the top shows the month's income, spending and net (income minus spending) for the transactions listed, so it follows the filters; transfers don't count. Months with no budget to show skip the Budgets heading. A search box looks through every month (note, category or account name, or amount, with every word having to match); while it's on, the month switcher and budgets step aside and the summary and list cover the matches. Charts: "Spending by category" bars (share of spending, following filters and search) and "Last 6 months" income-vs-spending bars ending at the month shown (following filters; tapping a month opens it).
9. **Settings** — show currency (chosen at first launch, locked); light/dark theme toggle; app lock (Face ID, fingerprint or the phone's passcode; phones only); export data to a file; import data from a file; clear all data. Backup shows the date of the last export from this phone.
   - Clear all data deletes everything (currency included, so the welcome screen and setup run again) after an explicit warning and confirmation.
   - Import **replaces all existing data**. Show an explicit warning and require confirmation before importing.
   - App lock: off by default. Turning it on or off asks for Face ID, fingerprint or passcode first, and needs a screen lock set on the phone. When on, the app locks when opened and when brought back after more than 30 seconds away; the lock screen covers everything, pop-up forms included, and what was on screen stays as it was.
   - Backup reminder: everything lives only on the phone, so Home shows a "Back up your data" card (opens Settings) once the data is 30 days past its last backup. Without a backup, the 30 days start at the oldest transaction, so a new user isn't reminded right away. Exporting or importing resets it.

## 4. Data model

Storage: `expo-sqlite` (local database on the device).

### Rules
- **Money** is stored as integers in the currency's smallest unit, following that currency's decimal places (PHP/USD: 2 → ₱12.50 = `1250`; JPY: 0 → ¥1250 = `1250`).
- **Balances are never stored.** They are calculated from transactions so they can't drift.
- **Dates** are date only, no time (`YYYY-MM-DD`).
- **Currency** is chosen once at first launch and cannot be changed afterward. Import replaces it along with the rest of the data.

### Tables

| Table | Fields |
|---|---|
| `accounts` | id, name, type (`regular` / `credit_card`), starting_amount, credit_limit (cards only), cutoff_day and due_day (cards only, optional, 1–31; added in database version 3) |
| `categories` | id, name, icon (added in database version 2; defaults to `tag`) |
| `category_budgets` | category_id, month (`YYYY-MM`), amount — the budget in effect from that month on; latest row at or before a month wins |
| `transactions` | id, type (`expense` / `income` / `transfer`), amount, date, note, account_id, to_account_id (transfers only), category_id (expenses only) |
| `settings` | currency; theme, app lock (`app_lock`) and last backup date (`last_backup`, YYYY-MM-DD) are phone settings, not part of the backup file |

## 5. Tech stack

| Need | Choice |
|---|---|
| Framework | Expo SDK 57 (React Native 0.86) — App Store Expo Go only supports SDK 57 as of 2026-10-31; upgrade to 58 once it does |
| Language | TypeScript |
| Navigation | Expo Router |
| Database | `expo-sqlite` |
| Styling | NativeWind 4.2.7 + Tailwind CSS 3 on plain React Native components; no UI kit |
| Theme | Light by default; Settings has a light/dark toggle, saved on the device (`settings` table, key `theme`). Palette in `src/lib/palette.js`: deep teal `#117F8E` (palette `#128494`, darkened for white-text contrast) and cyan `#00B7C2` main, green `#4EF037` accent, `#ECFEFF` background. Cyan and green always take dark ink text, never white |
| Font | Poppins via `@expo-google-fonts/poppins`, loaded at runtime with `useFonts` (works in Expo Go) |
| Icons | Material Symbols outlines drawn with `react-native-svg`, identical on iOS and Android. `scripts/icons.mjs` extracts the paths from the font that ships with `expo-symbols` into `src/components/icon-paths.ts`; rerun it after adding an icon |
| App lock | `expo-local-authentication` (in Expo Go; on iPhone, Expo Go can't use Face ID and asks for the passcode instead, a real build uses Face ID) |
| Charts | Plain Views sized by percentage; no chart library |
| App icon | Lime coin dropping into a stitched white pocket on teal (`assets/logo/pocketeer.svg`). `scripts/logo.mjs` holds the artwork and writes every version: the iOS 1024 icon without transparency, the iOS 26 Liquid Glass layers (`assets/expo.icon`, teal background, ink in dark mode), the Android adaptive foreground, background and monochrome images, the splash icon (teal splash background) and the favicon. Run `node scripts/logo.mjs` (or the `logo` preview config) and open http://localhost:8090 to render them. The artwork lives in `src/components/logo-art.ts`, which the in-app `Logo` also draws: welcome screen, Home header next to the name, and the Settings footer with the app version |
| Currency formatting | `Intl.NumberFormat` (built in) |
| Date picker | `@react-native-community/datetimepicker` |
| Export | `expo-file-system` + `expo-sharing` |
| Import | `expo-document-picker` |
| App state | React state, reading from SQLite; no state library |
| Testing | `jest-expo`, focused on money logic (balances, credit limits, monthly budgets) |
| Dev testing | Expo Go on iPhone and Android (Android: install the SDK 57 Expo Go from expo.dev/go) |
| Store builds | EAS Build (later) |

## 6. Out of scope (for now)

Add later only if needed:
- Recurring transactions
- Reminders / notifications
- Cloud sync / backup
- Bank account linking
- Multiple currencies
- Multiple users / login
- Credit card due date reminders, statement balances, interest and minimum payments (the card shows this cycle's charges and the next due date only)

## 7. Open questions

None right now.

## 8. Decision log

- Deleting an account or category with transactions is blocked.
- Regular account balances can never go negative.
- Every expense requires a category.
- Import replaces all data, with an explicit warning first.
- Credit cards are a separate account type with a credit limit; card payments are transfers, not expenses.
- Editing a category's budget applies to the current month and onward; past months keep the budget they had.
- Credit card overpayment is blocked; amount owed never goes below 0.
- Export format is JSON.
- Currency is set once at first launch and locked afterward (avoids amounts being misread across currencies with different decimal places).
- Amounts follow the currency's own decimal places.
- Transactions store a date only, no time.
- App name is Pocketeer.
- Downgraded from Expo SDK 58 to 57 so the App Store Expo Go can run it.
- Web build is for local testing only (single-page output, text date field, download instead of share sheet).
- Import validates the whole file (fields, references, balance rules) before replacing anything, and replaces in one database transaction.
- Visual design: rounded cards, colored hero and account cards, inspired by a finance app mockup. Restyle only, no charts.
- Clear all data also resets the currency, so the user can start over with a different one. The theme is kept.
- Theme defaults to light instead of following the phone (`userInterfaceStyle: "light"` in app.json, so the splash and native views start light too); the choice is a device preference, so it isn't exported and survives an import.
- Icons are SVG paths taken from the Material Symbols font rather than the font itself or platform symbols: SF Symbols differ from Android's, and font glyphs sat off-center and clipped on iOS. `@expo/vector-icons` skipped (deprecated by Expo).
- Forms: amount fields start empty with a "0" placeholder; Save stays disabled until required fields are valid (a blank starting balance counts as 0). Balance rules are still checked on save so the error can name the account.
- Input filtering: amount fields accept digits and one decimal separator only; text fields drop control characters and are length-capped; all database queries use bound parameters.
- Transaction dates can't be in the future (date picker capped at today; the form blocks later dates). Import doesn't apply this rule, so an older backup with future dates still loads.
- Category icons come from a fixed list (`src/lib/category-icons.ts`). Backups without an icon, or with an unknown one, import with the default tag icon, so the backup format stays version 1.
- Account and category pickers always use a dropdown with search instead of pills, so the form stays the same length however many there are. Built on React Native's `Modal`, so it runs in Expo Go.
- Budgets on Home and History are a two-column grid of tiles with a circular meter showing what's left: it empties as the budget is used, and its track turns red when over budget. The ring is two rotating half-rings in plain Views, so no SVG library is needed.
- Successful saves, deletes, backups, imports and clearing data show a short toast at the top. Errors stay inline next to the form. The toast is a small provider built on React Native's `Animated`, so it needs no library and runs in Expo Go.
- Each Poppins weight is its own font family, so `font-medium`/`font-semibold`/`font-bold` pick the family; Tailwind's fontWeight utilities are disabled.
- Welcome screen shows only until a currency is picked, not on every launch.
- Currency symbols are stored in the currency list instead of read from `Intl`, because narrow symbols differ between Hermes and browsers.
- Amount fields group digits as they're typed ("1,234.50"), using the phone's locale marks and grouping, the same ones `formatMoney` shows; decimals are capped at the currency's places (none for JPY). Since "," is the grouping mark in most English locales, it's no longer accepted as a decimal point there.
- Cutoff and due days are optional, so cards added before database version 3 keep working. Backups without them import with none; the backup format stays version 1.
- Naming: "category" is the thing you create, pick and filter by; "budget" is only its monthly amount (the "Budgets" heading, "Monthly budget" field, money left). A category can exist without a budget, and its budget changes by month, so they aren't the same word.
- The tutorial shows once, right after the currency is picked; it isn't stored, so closing the app mid-tutorial skips the rest.
- Export counts as a backup once the share sheet closes without an error; the sheet can't tell whether the file was actually saved.
- "Log again" covers repeated entries (coffee, fares, bills) without recurring transactions, which stay out of scope.
- App lock waits 30 seconds before locking again, so sharing a backup or picking a file to import doesn't lock the user out mid-task. An unreadable lock setting leaves the app unlocked rather than locking the user out of their own data.
- History search covers every month, because finding an old entry is the reason to search; the existing filters still apply on top.

## 9. Next steps

1. ~~Purpose and users~~
2. ~~Core features (MVP)~~
3. ~~Platform~~ — Expo
4. ~~Data model and storage~~ — expo-sqlite
5. ~~Tech stack~~ — see section 5
   - Environment checked: Node 22.23.3, npm 10.9.9, git 2.46
6. ~~Project setup~~ — git repo (remote: github.com/GerardPaul/pocketeer), Expo app, libraries, NativeWind + dark mode
7. ~~MVP build~~ — on branch `feature/mvp`, one commit per step: database + money logic, currency setup, accounts, categories, transactions, dashboard, history, export/import
8. Test on both phones in Expo Go
