# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

**ICM Notes** — a point-of-sale / cash-register app for a multi-branch retail business (tires & construction material). Laravel 11 backend, Inertia 2 + React 18 + TypeScript frontend, single monolith. The domain language is Spanish; the four core objects are:

- **Nota** (`Note` + `NoteProduct` + `NotePayment`) — a sales note/ticket. Has both a `purchase_total` (what the business paid) and `sale_total` (what the customer pays), a `status` and `purchase_status` (`pending|paid|canceled`), and a free-form `delivery_status` string (see `resources/js/const.ts` for the canonical values).
- **Pagos** (`note_payments`) — **N payments per note**, one row per payment event, each with its own `date` and a split across `cash`/`card`/`transfer`. See "Payments" below; this replaced the old two-fixed-payments design.
- **Corte** — the daily cash cut for one branch. Not a live aggregate: the frontend computes all the sums and POSTs a **snapshot**; `notes`, `previous_notes`, `expenses`, `returns` are JSON-cast columns holding the note/expense rows as they were that day. Editing a note later does not change a saved corte.
- **Corte Semanal** (`cortes_semanales`) — weekly roll-up of daily cortes; same snapshot pattern, but **Spanish column names** (`fecha_inicio`, `venta_total`, `gastos_extra`, …), unlike every other table.
- **Producto / Stock** — a shared product catalog (`products`) with **per-branch** quantities in `stocks` and an append-only `stock_movements` audit trail.

## Commands

```bash
composer dev            # everything at once: artisan serve + queue:listen + pail (logs) + vite
npm run dev             # vite only (binds 0.0.0.0:5173 for Docker)
npm run build           # tsc --noEmit + vite build — this is the only typecheck in the project
php artisan test        # PHPUnit (via Laravel); or vendor/bin/phpunit
php artisan test --filter=AuthenticationTest      # single test class
php artisan test tests/Feature/ProfileTest.php    # single file
vendor/bin/pint         # PHP formatter (Laravel Pint); no JS linter configured
```

E2E (Playwright, `tests/e2e/`) runs against a **separate sqlite environment** so it never touches the dev database:

```bash
APP_ENV=e2e php artisan serve --host=127.0.0.1 --port=8001   # terminal 1 (uses .env.e2e)
npm run build && npm run test:e2e                             # terminal 2
npx playwright test --grep "abono tardío"                      # one test
```

`tests/e2e/global-setup.ts` resets that database with `E2eSeeder` (known user `e2e@icm.test` / `password`, two branches, three products) before every run. Notes created by different specs land in the same day, so a spec asserting on a **corte total** must pin its own note date.

To run the suite against another engine, point both the server and the setup at the same env file — `APP_ENV` is the only handle you get:

```bash
APP_ENV=pgsql php artisan serve --port=8002                              # loads .env.pgsql
E2E_APP_ENV=pgsql E2E_BASE_URL=http://127.0.0.1:8002 npm run test:e2e
```

**`php artisan serve` forwards only an allowlist of env vars to its subprocess** (`ServeCommand::$passthroughVariables` — `APP_ENV`, `PATH`, …). `DB_CONNECTION`/`DB_HOST`/etc. are stripped, so prefixing the serve command with `DB_*` silently leaves the server on whatever the `.env` file says. Put the connection in an env file instead. (Artisan commands other than `serve` do honour `DB_*` from the shell, and PHPUnit's `<env>` entries yield to real env vars — but don't override `APP_ENV` for `php artisan test`, or `runningUnitTests()` turns false and CSRF starts rejecting posts with 419.)

Docker is the normal dev environment (`.env` ships `DB_HOST=db`, MySQL 8) — see `DOCKER.md`:

```bash
./docker-start.sh                                  # build, up, key:generate, migrate, seed, storage:link
docker compose up vite                             # hot reload (separate terminal)
docker compose exec app php artisan <cmd>          # artisan inside the container
```

App on `http://localhost:8000`, MySQL exposed on host port **33060**. `docker-start.sh` and `DOCKER.md` still reference a `redis` service that no longer exists in `docker-compose.yml` — harmless, but don't trust it.

`phpunit.xml` runs on sqlite in-memory. Domain coverage lives in `tests/Feature/NotePaymentsTest.php` and `CorteAttributionTest.php`. **16 of the stock Breeze auth/profile tests fail on `main`** and did so before any of this work: they reference routes this app removed (`route('dashboard')`, the register screen) and expect `/` to return 200 where it redirects. Don't read those as regressions.

## Three database engines — be careful with raw SQL

**Production runs PostgreSQL, local dev runs MySQL, and the test suites run SQLite.** Any raw SQL has to work on all three, and the dialects disagree in ways that fail silently on one engine and throw on another:

- **Prefer the query builder over raw SQL.** It quotes identifiers per engine, which matters because `position` (a `note_payments` column) is a keyword in both MySQL and PostgreSQL. The backfill migration deliberately uses `selectRaw` + `groupBy` + per-row updates instead of a correlated `UPDATE … SET x = (SELECT …)`.
- **Casting text to a number**: MySQL's `CAST(folio AS UNSIGNED)` and SQLite's `CAST(folio AS INTEGER)` return 0 for non-numeric input; PostgreSQL's `folio::integer` **throws**. `folio` is a `string` column and real folios are not always numeric, so `NoteController::applyFilters` guards the Postgres branch with `CASE WHEN folio ~ '^[0-9]+$'` and adds `orderBy('folio')` as a cross-engine tiebreaker. MySQL only accepts `UNSIGNED`/`SIGNED`, never `INTEGER`.
- **`whereDate()` on a `date` column is a trap in Postgres**: it compiles to `"date"::date = ?`, which cannot use a plain index. Compare directly (`where('date', $date)`) — both `notes.date` and `note_payments.date` are `date` columns.
- **`ILIKE` is Postgres-only**; `ProductController::getSearchQuery()` already branches on `getDriverName() === 'pgsql'` for it.
- To check generated SQL without a live server, register throwaway `pgsql`/`mysql` connections in `config()` and call `->toSql()`, or `Blueprint::toSql($connection, $connection->useDefaultSchemaGrammar() ?? $connection->getSchemaGrammar())` for DDL.

## Branch scoping — the single most important pattern

There is no per-user branch column. The active branch lives in the **session** and is read through the global helper `currentBranchId()` (`app/Helpers/helpers.php`, autoloaded via composer `files`):

- Frontend switches branch by POSTing `route("set-branch")` then doing a full `window.location.reload()` (`Components/BranchSelector.tsx`).
- `HandleInertiaRequests::share()` pushes `currentBranch` + `branches` into every Inertia response; `app.tsx` lifts them out of `initialPage.props` into `BranchContext` *once* at boot — which is why the branch switch needs a hard reload rather than an Inertia visit.
- React code reads it via `useBranch()` (`hooks/useBranch.ts`), not from page props.
- Controllers call `currentBranchId()` and filter queries by it manually. **Every new query over notes/cortes/stock must do this** — nothing is scoped automatically.
- `Product::stock()` and `Product::stockMovements()` bake `currentBranchId()` into the relation definition. Those relations are therefore **session-dependent** and will silently return the wrong branch (or nothing) from a queue job, console command, or test with no session.

## Request/response conventions

- Routes: URIs and flash messages are Spanish (`/notas`, `/productos`, `/cortes`), route *names* and PHP/TS identifiers are English. Frontend never hardcodes paths — it uses Ziggy's global `route()` (`@routes` in `app.blade.php`, `ziggy-js` aliased in `tsconfig.json`).
- Inertia pages resolve from `resources/js/Pages/**/*.tsx`; `app.blade.php` `@vite`s the page component directly alongside `app.tsx`.
- Controllers return `Inertia::render(...)` for pages and `redirect()->...->with('success'|'error', ...)`; the frontend surfaces those through `useAlerts()` → react-toastify. Paginated lists are passed as a prop named `pagination`.
- Mutating a note replaces all its items: `NoteController::update` deletes every `NoteProduct` for the note and recreates them from the request (`createItems`), re-issuing stock movements each time.
- `routes/api.php` endpoints (product search, pending notes, notes-by-date, weekly export) are consumed with plain `axios` + `@tanstack/react-query`. Note they carry **no auth middleware** — a session-authenticated app with unauthenticated JSON read endpoints.
- Money is formatted in two places that must stay consistent: `format_currency()` (PHP, for PDFs/Excel) and `formatCurrency()` (TS, `Intl` `es-MX`/`MXN`).

## Payments (N per note)

One row per payment event in `note_payments` (`note_id`, `branch_id`, `date`, `cash`, `card`, `transfer`, `position`). Rules that the whole feature rests on:

- **A corte's money is the payments made that day**, not the payments of the notes issued that day. `CortePaymentsService::forBranchAndDate()` returns `notes` (issued that day, each with its `payments`) plus `previous_payments` (payments made that day on older notes) — the latter auto-fills the "ENTRADAS ANTERIORES" table that used to be typed by hand. `Cortes/Form.tsx`'s `paymentsOnDate()` is what filters a note's payments down to the corte's date.
- **`notes.cash/card/transfer/advance/balance` are derived aggregates over all payments**, recomputed server-side by `Note::recalculateTotalsFromPayments()` on every store/update. The browser's numbers are never trusted. Downstream code (corte snapshots, PDF, Excel, weekly corte) reads these, which is why the corte snapshot keeps its historic shape — one `cash`/`card`/`transfer` per note — and the reports needed no changes.
- Payment row 0 always carries the note's own date (forced in the form's `transform()`); rows 1..N have their own date pickers. Rows with a zero total are dropped, and a cancelled note keeps no payments at all.
- `notes.cash2/card2/transfer2/second_payment_date` are **legacy columns**, no longer fillable or written. They still exist for one release as a rollback path — the backfill migration derives `note_payments` from them, and its `down()` restores the old meaning from `position = 0`.
- Saved corte snapshots have no `payments` key; `paymentsOnDate()` falls back to the snapshot's own `cash/card/transfer` for them. Don't remove that fallback or every historical corte re-renders as zero.

## Business math lives in the frontend

`resources/js/Pages/Cortes/Form.tsx` is the heart of the app: `calculateSums()` derives every corte total, and `cleanNotes()` filters out `delivery_status === "cancelado"` / `status === "canceled"` before summing. Per-item subtotals come from `helpers/utils.ts` — `calculatePurchaseSubtotal` applies `iva` and `extra` as compounding percentages on `cost × quantity`, while `calculateSaleSubtotal` is a flat `price × quantity`. The backend stores what it is given (`CorteController::store` only validates types and `json_decode`s the arrays), so **a change to these functions changes the books** and won't be caught by any test.

## Reports

- PDF: `PdfController::exportCorte` → dompdf over the Blade view `resources/views/pdf/corte.blade.php`.
- Excel: maatwebsite/excel classes in `app/Exports` (`CorteExport`, `CortesExport`, `ProductsExport`, `ReporteSemanalExport` — the last builds a hand-positioned styled grid). Import side is `app/Imports/ProductsImport.php`, which maps **Spanish spreadsheet headers** (`marca`, `modelo`, `medida`, `costo`, `precio_venta`/`precio_publico`/…) onto English model attributes and defaults `iva` to 16.
- `php artisan clean:old-reports` deletes temp Excel files in the `public` disk older than 15 minutes. It is not registered on a schedule.

## Known broken / dead spots — don't mistake these for working code

- `app/Observers/NoteObserver.php` is **never registered** (no `#[ObservedBy]`, empty `EventServiceProvider`, `bootstrap/providers.php` lists only `AppServiceProvider`) and iterates a `$note->items` relation that `Note` doesn't define. Stock is actually decremented in `NoteController::createItems`.
- `StockController::store` calls `StockService::adjustStock()` with the branch-id argument missing (5 args for a `branchId, productId, quantity, type, noteId, description` signature) — that endpoint throws. `StockMovementController::store` is the correct call site to copy.
- `CorteSemanalController::index` orders by a `date` column that `cortes_semanales` doesn't have (`fecha_inicio`/`fecha_fin`), and `show` reads `$corte->date`.
- `products` has a `deleted_at` column but `Product` does **not** use `SoftDeletes`, so `->withTrashed()` in the `Stock::product()` / `StockMovement::product()` relations will error, and product deletes are hard deletes. `products.stock` (the legacy per-product integer) is superseded by the `stocks` table but is still fillable and still written by imports.
- `DatabaseSeeder` creates a hardcoded admin user and the two branches, and deletes previous admin accounts by email each run — it is not idempotent for branches (re-seeding duplicates them).
