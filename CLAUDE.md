# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

**ICM Notes** — a point-of-sale / cash-register app for a multi-branch business of **flooring stores** (tiles, floors; some tires/construction products in the demo data). **`mc` on products and note lines is the m² per box**: the register and the ticket show it as "m²/caja" and sum the m² (boxes × mc). Laravel 11 backend, Inertia 2 + React 18 + TypeScript frontend, single monolith. The domain language is Spanish; the four core objects are:

- **Nota** (`Note` + `NoteProduct` + `NotePayment`) — a sales note/ticket. Has both a `purchase_total` (what the business paid) and `sale_total` (what the customer pays), a `status` and `purchase_status` (`pending|paid|canceled`), and a free-form `delivery_status` string (see `resources/js/const.ts` for the canonical values).
- **Pagos** (`note_payments`) — **N payments per note**, one row per payment event, each with its own `date` and a split across `cash`/`card`/`transfer`. See "Payments" below; this replaced the old two-fixed-payments design.
- **Corte** — the daily cash cut for one branch. Not a live aggregate: the frontend computes all the sums and POSTs a **snapshot**; `notes`, `previous_notes`, `expenses`, `returns` are JSON-cast columns holding the note/expense rows as they were that day. Editing a note later does not change a saved corte.
- **Corte Semanal** (`cortes_semanales`) — weekly roll-up of daily cortes; same snapshot pattern, but **Spanish column names** (`fecha_inicio`, `venta_total`, `gastos_extra`, …), unlike every other table.
- **Producto / Stock** — a shared product catalog (`products`) with **per-branch** quantities in `stocks` and an append-only `stock_movements` audit trail.

## Versions and commits

The app version is `"version"` in `package.json` (`config('app.version')` reads it; shown in the user menu, the login footer and `php artisan about`). **Don't bump it by hand:** `.github/workflows/release-please.yml` runs release-please on every push to `main`, computes the next version from the commit prefixes and opens a release PR that updates `package.json` and `CHANGELOG.md`; merging it creates the `vX.Y.Z` tag. So every commit message must use Conventional Commits:

- `fix: …` → patch (2.0.1) · `feat: …` → minor (2.1.0) · `feat!: …` or a `BREAKING CHANGE:` footer → major.
- `refactor:`, `test:`, `docs:`, `chore:` don't release. Write the description in Spanish (it becomes the changelog line), e.g. `fix: el corte toma la fecha de México`.

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

## Roles, permissions and branch access

Three roles in `users.role`: `super_admin` (the developer), `owner` (the business, all current functionality) and `cashier` (register only). The single source of truth is `config/permissions.php`: an abilities catalog, which ones are configurable per cashier (`users.permissions` JSON overrides the role template) and which are `super_admin_only`. `User::hasPermission()` applies it; `AppServiceProvider` registers one Gate per ability.

- **Every route sits in a `can:<ability>` block in `routes/web.php`** (or `hidden:<ability>`, which answers 404 instead of 403 for system screens). `tests/Feature/RouteAuthorizationTest.php` fails if a route has no `auth` or no permission — add new routes to their block. The `/api/...` endpoints live in `web.php` too (session + permission); `routes/api.php` is intentionally empty.
- The frontend gets `permissions` (granted abilities) as a shared prop; `useCan()` hides nav/buttons. That is presentation only — the server checks every route.
- Cashiers never receive costs: `ProductController@search` hides `cost/extra/iva` without `costs.view`. Apply the same rule to any new endpoint that returns products or notes.
- `role`, `active`, `permissions` and `max_discount_percent` are **not** mass-assignable; set them with `forceFill()`.
- Inactive users can't log in (`LoginRequest`) and open sessions are closed (`EnsureUserIsActive`).
- Users are managed by the super admin at `/admin/usuarios` (`UserController`, `hidden:users.manage`). Users are never deleted, only deactivated; nobody can change their own role or deactivate themselves. Admin-created users get `email_verified_at` (every route needs `verified`). A cashier's permissions are stored **explicitly for every configurable ability**, so later changes to a template default don't change existing cashiers.
- "Entrar como" (`ImpersonationController`) logs in as another (non super admin, active) user and keeps `impersonator_id` in the session; `impersonation.stop` is auth-only and checks that key. The `impersonator` shared prop drives `ImpersonationBanner`. Two concurrent requests around that login race the session id (the second one logs out), so be careful with row `onClick`s: React portal clicks (dropdown menus) bubble to the row — check `e.currentTarget.contains(e.target)`.

## Branch scoping — the single most important pattern

The active branch lives in the **session** and is read through the global helper `currentBranchId()` (`app/Helpers/helpers.php`, autoloaded via composer `files`). With a logged-in user it is constrained to `User::accessibleBranchIds()`: owners/super admins see every branch, cashiers only the ones in `branch_user`.

- Frontend switches branch by POSTing `route("set-branch")` (which rejects branches the user can't access) then doing a full `window.location.reload()` (`Components/BranchSelector.tsx`).
- `HandleInertiaRequests::share()` pushes `currentBranch` + `branches` (only the user's) into every Inertia response; React reads them via `useBranch()` (`hooks/useBranch.ts`), which reads the current page props.
- Controllers call `currentBranchId()` and filter queries by it manually. **Every new query over notes/cortes/stock must do this** — nothing is scoped automatically. Endpoints that receive a branch id (e.g. `NoteController@store`) must also check `canAccessBranch()`.
- `Product::stock()` and `Product::stockMovements()` bake `currentBranchId()` into the relation definition. Those relations are therefore **session-dependent** and will silently return the wrong branch (or nothing) from a queue job, console command, or test with no session.

## Request/response conventions

- Routes: URIs and flash messages are Spanish (`/notas`, `/productos`, `/cortes`), route *names* and PHP/TS identifiers are English. Frontend never hardcodes paths — it uses Ziggy's global `route()` (`@routes` in `app.blade.php`, `ziggy-js` aliased in `tsconfig.json`).
- Inertia pages resolve from `resources/js/Pages/**/*.tsx`; `app.blade.php` `@vite`s the page component directly alongside `app.tsx`.
- Controllers return `Inertia::render(...)` for pages and `redirect()->...->with('success'|'error', ...)`; the frontend surfaces those through `useAlerts()` → react-toastify. Paginated lists are passed as a prop named `pagination`.
- Mutating a note replaces all its items: `NoteController::update` deletes every `NoteProduct` for the note and recreates them from the request (`createItems`). Stock only moves by the **difference** (`NoteStockService::sync`); cancelling returns the pieces, reactivating discounts them again, deleting returns them. A product counts as "with inventory" in a branch only after it was counted there (`stocks.counted_at`, set by `StockService` on adjustments/entries).
- The `/api/...` JSON endpoints (product search, stock by ids, pending notes, notes-by-date, weekly export) live in `routes/web.php` with session + permission and are consumed with plain `axios` + `@tanstack/react-query`. The weekly export uses `fetch` and must send the `X-XSRF-TOKEN` header.
- The products list edits price, cost, IVA, extra and branch stock in place (`Products/components/QuickEditCell.tsx` → `PATCH /productos/{product}/rapido`, JSON, one field per request; stock is an `ADJUSTMENT` in the session branch and needs `stock.manage`). Product list queries must keep `orderBy('id')`: Postgres reorders rows after an UPDATE and edited rows would jump pages.
- Money is formatted in two places that must stay consistent: `format_currency()` (PHP, for PDFs/Excel) and `formatCurrency()` (TS, `Intl` `es-MX`/`MXN`).

## Payments (N per note)

One row per payment event in `note_payments` (`note_id`, `branch_id`, `date`, `cash`, `card`, `transfer`, `position`). Rules that the whole feature rests on:

- **A corte's money is the payments made that day**, not the payments of the notes issued that day. `CortePaymentsService::forBranchAndDate()` returns `notes` (issued that day, each with its `payments`) plus `previous_payments` (payments made that day on older notes) — the latter auto-fills the "ENTRADAS ANTERIORES" table that used to be typed by hand. `Cortes/Form.tsx`'s `paymentsOnDate()` is what filters a note's payments down to the corte's date.
- **`notes.cash/card/transfer/advance/balance` are derived aggregates over all payments**, recomputed server-side by `Note::recalculateTotalsFromPayments()` on every store/update. The browser's numbers are never trusted. Downstream code (corte snapshots, PDF, Excel, weekly corte) reads these, which is why the corte snapshot keeps its historic shape — one `cash`/`card`/`transfer` per note — and the reports needed no changes.
- Payment row 0 always carries the note's own date (forced in the form's `transform()`); rows 1..N have their own date pickers. Rows with a zero total are dropped, and a cancelled note keeps no payments at all.
- `notes.cash2/card2/transfer2/second_payment_date` are **legacy columns**, no longer fillable or written. They still exist for one release as a rollback path — the backfill migration derives `note_payments` from them, and its `down()` restores the old meaning from `position = 0`.
- Saved corte snapshots have no `payments` key; `paymentsOnDate()` falls back to the snapshot's own `cash/card/transfer` for them. Don't remove that fallback or every historical corte re-renders as zero.

## Discounts, folio, seller and document code

- **Discounts are stored as amounts and totals stay net.** `note_product.discount` is the line discount and `sale_subtotal = price × quantity − discount` (`calculateSaleSubtotal`). `notes.discount` is the discount on the whole note and `sale_total = Σ sale_subtotal + flete − discount`. Every downstream consumer (cortes, PDF, Excel, dashboard) reads the net `sale_total`/`sale_subtotal`, so none of them needed changes; notes with discount 0 total exactly as before. `note_product.list_price` keeps the catalog price at the moment of sale.
- `notes.cash_received` is the cash the customer handed over (change is derived, not stored).
- **Folio:** `Note::nextFolio($branchId)` = highest *numeric* folio of the branch + 1 (computed in PHP, see the cast caveats above). The create form is prefilled with it and stays editable; a blank folio on store is assigned server-side under a branch row lock; a blank folio on update keeps the current one. Folios are **not** unique-enforced (existing data and tests repeat them).
- `notes.user_id` (seller, `Note::seller()`) and `notes.code` (unique 10-char code for the ticket QR, generated in `Note::booted`) are set by the server and are not mass-assignable.

## Caja (register)

- `/caja` (`CajaController`, `Pages/Caja/Index.tsx`) is the counter POS for cashiers and owners. **Unlike the owner's note form, the server computes everything** in `App\Services\SaleService::calculate()`: price and cost come from the catalog, `purchase_subtotal` uses the same formula as `calculatePurchaseSubtotal()` (branch global extra wins), discounts and price changes are checked against `sales.discount` / `sales.change_price`, and the cashier's `max_discount_percent` caps **line + total discounts together** as a % of the pre-discount amount. A price lowered with `sales.change_price` is not counted against the cap.
- A register sale is paid in full (card + transfer as given, cash covers the rest, `cash_received` must cover it, `status=paid`) **or on credit** (`credit: true`, permission `sales.credit`, default on): the customer pays any down payment (`cash`/`card`/`transfer`, or nothing) and the note stays `status=pending` with its balance; customer name, phone and address are optional, as in the note form. No `note_payments` row is created for a zero payment. Either way `delivery_status=entregado_a_cliente`, stock goes out per line and the date is `businessToday()`. **The app runs in UTC** (`APP_TIMEZONE`); `config('app.business_timezone')` (default America/Mexico_City) defines the business day.
- `/caja/ventas` ("Mis ventas", gate `sales.history` = view_own or view_branch) lists the day's sales without costs; cancelling (`sales.cancel_own`, own sale, same day, not already cancelled) removes the payment and returns stock through `NoteStockService::sync`.
- Product search never matches by `cost` and never returns `branch_stock` for users without `costs.view` / `stock.view`, or for a branch they can't access.

## Feature switches, contact data and collections

- `config/features.php`: `discounts` (`FEATURE_DISCOUNTS`, **off** by default at the client's request). Off means: no discount inputs in the register or the note form (a note that already has a discount still shows it), `SaleService` rejects discounts even with `sales.discount`, and the user form doesn't offer that permission. Shared to the frontend as `features`.
- The register shows each product's `mc` as "m²/caja" (tiles: same model name, different m² per box) in search results and cart lines. Lines with a numeric `mc` also get an "o m²" input: the m² the customer needs become boxes with `boxesFor()` (always rounded **up**), and editing the quantity by hand clears it. Only the box quantity is sent to the server.
- `notes.customer_phone` / `customer_address`: captured in the register and the note form, printed on the ticket, shown in Mis ventas and the dashboard.
- Dashboard "Notas por cobrar" lists notes with a balance **or** still marked `pending` (`AnalyticsService::receivables`). `POST /nota/{note}/cobrar` (`NoteController@collect`, `notes.manage`) adds a payment dated **today** (so it lands in today's corte as an earlier note's payment), and marks the note `paid` when nothing is owed; with a zero balance it only flips the status.

## Ticket printing (Epson TM-T20IV, 80 mm, USB)

- The ticket is a standalone Blade page, `resources/views/tickets/ticket.blade.php`, served by `TicketController@show` at `/nota/{note}/ticket` (gate `tickets.view`, plus a per-note check: owners any note of their branches; cashiers their own, or the branch's with `sales.view_branch`). It never shows costs. `TicketController::payload()` computes everything; the view only formats.
- `?print=1` makes the page call `print()` on load and logs a `ticket_prints` row; from the second print on it says REIMPRESIÓN. The frontend prints through `helpers/printTicket.ts` (hidden iframe). Silent printing relies on **Chrome launched with `--kiosk-printing`** and the Epson as the default printer; the setup steps are on `/sucursales`.
- `/nota/{note}/ticket/pdf` (`TicketController@pdf`) renders the same view with `pdf=true` through dompdf: 80 mm wide and cut to the ticket's length (first pass on a 5000 pt page, an `end_frame` callback reads the y of `#ticket-end`, second pass at that height). **dompdf has no flexbox**, so the ticket's rows use `display: table`; logo and QR are data URIs. Downloading the PDF is not logged as a print.
- Per-branch ticket data lives in `branches.ticket` (JSON) and is edited at `/sucursales` (`branches.manage`); `Branch::ticketSettings()` fills blanks with defaults. The register line reads "CAJA <BRANCH>" (one register per branch). The QR (bacon/bacon-qr-code, SVG) encodes the link `route('notes.verify', code)` → `/v/{code}` (`TicketController@verify`, auth-only): owners land on the note, cashiers on the ticket if they may see it, anyone else is sent back with a flash error; there is no public page. The printed URL comes from the request host (or `APP_URL` outside a request), so production must serve the real domain. `Note::extractCode()` (and `extractNoteCode()` in TS) recognises a scanned link or a bare code; the Notas search opens the note directly and the caja search offers to open the sale in a new tab. `App\Support\AmountInWords` writes the "SON: … PESOS 00/100 M.N." line.

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
