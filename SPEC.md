# Pocketeer — Spec

Living document. Update it whenever a decision changes.

Last updated: 2026-10-31

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
- Credit card: has a credit limit and a starting amount owed.
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

1. **Accounts** — create, edit, delete (only if no transactions); regular (starting balance) or credit card (credit limit, starting owed).
2. **Categories** — create, edit, delete (only if no transactions); set monthly budget.
3. **Log expense** — amount, account, category, date, note.
4. **Log income** — amount, account, date, note (e.g. salary).
5. **Transfer** — move money between two accounts.
6. **Dashboard** — each regular account's balance; each credit card's owed and available credit; each category's spent vs. remaining for the current month.
7. **Transaction list** — view, edit, delete past entries.
8. **History** — browse previous months (category spent vs. budget per month).
9. **Settings** — show currency (chosen at first launch, locked); export data to a file; import data from a file.
   - Import **replaces all existing data**. Show an explicit warning and require confirmation before importing.

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
| `accounts` | id, name, type (`regular` / `credit_card`), starting_amount, credit_limit (cards only) |
| `categories` | id, name |
| `category_budgets` | category_id, month (`YYYY-MM`), amount — the budget in effect from that month on; latest row at or before a month wins |
| `transactions` | id, type (`expense` / `income` / `transfer`), amount, date, note, account_id, to_account_id (transfers only), category_id (expenses only) |
| `settings` | currency |

## 5. Tech stack

| Need | Choice |
|---|---|
| Framework | Expo SDK 57 (React Native 0.86) — App Store Expo Go only supports SDK 57 as of 2026-10-31; upgrade to 58 once it does |
| Language | TypeScript |
| Navigation | Expo Router |
| Database | `expo-sqlite` |
| Styling | NativeWind 4.2.7 + Tailwind CSS 3 on plain React Native components; no UI kit |
| Theme | Light and dark mode from day one, following the phone's setting |
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
- Charts / graphs
- Recurring transactions
- Reminders / notifications
- Cloud sync / backup
- Bank account linking
- Multiple currencies
- Multiple users / login
- Credit card statement cycles, due dates, interest and minimum payments

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

## 9. Next steps

1. ~~Purpose and users~~
2. ~~Core features (MVP)~~
3. ~~Platform~~ — Expo
4. ~~Data model and storage~~ — expo-sqlite
5. ~~Tech stack~~ — see section 5
   - Environment checked: Node 22.23.3, npm 10.9.9, git 2.46
6. ~~Project setup~~ — git repo (remote: github.com/GerardPaul/pocketeer), Expo app, libraries, NativeWind + dark mode
7. First feature
