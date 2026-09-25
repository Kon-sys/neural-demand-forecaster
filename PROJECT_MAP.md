# PROJECT MAP — Demand Forecast

> Актуальная карта репозитория для Codex/AI-агента.  
> Сформирована по фактическому Git-архиву проекта, а не по памяти или старому README.

## 0. Snapshot

В проанализированном архиве: **362 tracked files**.

| Область | Файлов | Назначение |
|---|---:|---|
| `backend/` | 104 | Java/Spring REST API, auth, persistence, интеграция с ML |
| `database/` | 16 | PostgreSQL compose, Flyway migrations, seeds, verification |
| `docs/` | 32 | requirements, architecture, design, ML, analysis, diagrams |
| `frontend/` | 88 | текущий рабочий React frontend с реальными API |
| `ml-service/` | 65 | ML pipeline, LSTM, evaluation, FastAPI, retraining/registry |
| `ui-prototype/` | 53 | исходный визуальный прототип; данные и логика там mock |

Ключевой принцип проекта:

```text
Browser
  -> frontend
  -> backend
      -> PostgreSQL
      -> ml-service
```

**Frontend никогда не должен обращаться к ML-service напрямую.**

---

# 1. Source of truth — приоритет источников

При конфликте сведений использовать такой приоритет:

1. **Фактический код и конфигурация текущего модуля**.
2. `database/migrations/` для реальной схемы PostgreSQL.
3. `docs/architecture/`, `docs/requirements/`, `docs/ml/` как проектная документация.
4. README конкретного модуля.
5. Корневой `README.md`.
6. `ui-prototype/` — только для визуального слоя.

Особые правила:

```text
FUNCTIONALITY / API / STATE / ROUTING -> frontend/
VISUAL DESIGN / COMPOSITION           -> ui-prototype/
DATABASE SCHEMA                       -> database/migrations/
BACKEND BEHAVIOR                      -> backend/src/main/java/
ML INFERENCE                          -> ml-service/src/.../runtime/
MODEL EVALUATION                      -> ml-service/src/.../evaluation/
```

`ui-prototype` **не является источником бизнес-логики**.

---

# 2. Репозиторий верхнего уровня

```text
.
├── backend/
├── database/
├── datasets/
├── docs/
├── frontend/
├── ml-service/
├── ui-prototype/
├── .gitignore
└── README.md
```

Не тратить контекст на рекурсивное чтение:

```text
node_modules/
.venv/
target/
dist/
.git/
ml-service/artifacts/
ml-service/models/
datasets/raw/
datasets/processed/
```

Они либо generated, либо ignored, либо не нужны для понимания архитектуры.

---

# 3. Runtime topology и реальные default ports

## PostgreSQL

`database/docker-compose.yml`:

```text
PostgreSQL 16 Alpine
container: demand-forecast-postgres
default host port: 5432
```

## Backend

`backend/src/main/resources/application.yml`:

```text
default port: 8080
```

## ML-service

Backend ожидает:

```text
ML_SERVICE_URL=http://localhost:8001
```

`backend/README.md` и `ml-service/README.md` также запускают FastAPI на **8001**.

## Frontend

`frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Vite dev server обычно работает на `5173`; Backend CORS default:

```text
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Важное несоответствие документации

Текущий корневой `README.md` содержит локальные примеры `Backend 8081` и `ML 8000`, тогда как tracked config/module README задают canonical defaults `Backend 8080` и `ML 8001`.

Для кода доверять `application.yml`, `.env.example` и module README. При завершении изменений документацию желательно синхронизировать.

---

# 4. Environment variables

## Backend / database

Основные:

```text
POSTGRES_HOST
POSTGRES_PORT
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
SERVER_PORT

JWT_SECRET_BASE64
JWT_EXPIRATION_MINUTES

BOOTSTRAP_ADMIN_ENABLED
BOOTSTRAP_ADMIN_NAME
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_PASSWORD

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

ML_SERVICE_URL
ML_SERVICE_CONNECT_TIMEOUT
ML_SERVICE_READ_TIMEOUT

APP_CORS_ALLOWED_ORIGINS
```

`backend/.env.example` содержит JWT/bootstrap/Cloudinary; PostgreSQL vars обычно приходят из `database/.env` при запуске `backend/run-local.ps1`.

## ML-service

`ml-service/.env.example`:

```text
ML_DEVICE=auto
ML_CHECKPOINT_PATH=./ml-service/artifacts/lstm/freshretail/best_model.pt
ML_SCALERS_PATH=./ml-service/artifacts/lstm/freshretail/scalers.json
```

## Frontend

```text
VITE_API_BASE_URL
```

Никогда не коммитить реальные `.env`, secrets, tokens, DB passwords.

---

# 5. Backend stack

`backend/pom.xml`:

```text
Java 21
Spring Boot 4.1.1
Spring Web
Spring Validation
Spring Data JPA
PostgreSQL JDBC
Flyway
Spring Actuator
Spring Security
JJWT 0.13.0
Cloudinary HTTP5 2.4.0
```

Canonical SQL migrations находятся **не внутри backend**, а в:

```text
database/migrations/
```

Maven копирует их при build в:

```text
classpath:db/migration
```

через `<resources>` в `backend/pom.xml`.

---

# 6. Backend package map

Root:

```text
backend/src/main/java/com/demandforecast/
```

```text
auth/          registration, login, JWT, bootstrap admin
common/error/  unified API exceptions / handlers
config/        Security, CORS, Cloudinary, ML RestClient
forecast/      forecast orchestration, persistence, ML client
health/        backend health endpoint
organization/  departments / positions
product/       product CRUD
sales/         sales read API + CSV import
storage/       Cloudinary adapter
user/          profile, avatar, admin user management
```

---

# 7. Backend REST API — фактические endpoints

## Public

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/health
GET  /actuator/health
```

## Authenticated

```text
GET   /api/v1/auth/me
PATCH /api/v1/users/me
POST  /api/v1/users/me/avatar
DELETE /api/v1/users/me/avatar

GET /api/v1/products
GET /api/v1/products/{id}

GET /api/v1/sales

POST /api/v1/forecasts
GET  /api/v1/forecasts
GET  /api/v1/forecasts/{forecastId}
```

## ADMIN only

```text
POST   /api/v1/products
PUT    /api/v1/products/{id}
DELETE /api/v1/products/{id}

POST /api/v1/sales/import

GET   /api/v1/users
GET   /api/v1/users/{id}
PATCH /api/v1/users/{id}

GET   /api/v1/departments
POST  /api/v1/departments
PATCH /api/v1/departments/{id}

GET   /api/v1/positions
POST  /api/v1/positions
PATCH /api/v1/positions/{id}
```

Security source:

```text
backend/src/main/java/com/demandforecast/config/SecurityConfig.java
```

---

# 8. Backend query contracts

## Sales

```text
GET /api/v1/sales
```

Optional:

```text
productId
dateFrom
dateTo
page    default 0
size    default 50
```

Response is paginated and sorted by `saleDate DESC`, then `id DESC`.

## Forecast history

```text
GET /api/v1/forecasts
```

Optional:

```text
productId
dateFrom
dateTo
page    default 0
size    default 20
```

History is scoped to the authenticated user.

## Users

```text
GET /api/v1/users
```

Optional:

```text
search
role
status
departmentId
positionId
page
size
```

## Departments

```text
active
search
```

## Positions

```text
departmentId
active
search
```

---

# 9. Authentication / session invariants

Backend:

```text
JWT stateless auth
BCrypt password hashing
USER / ADMIN roles
ACTIVE / BLOCKED status
```

Relevant files:

```text
backend/src/main/java/com/demandforecast/auth/security/JwtAuthenticationFilter.java
backend/src/main/java/com/demandforecast/auth/security/JwtService.java
backend/src/main/java/com/demandforecast/auth/service/AuthService.java
backend/src/main/java/com/demandforecast/config/SecurityConfig.java
```

Frontend session:

```text
frontend/src/entities/session/model/SessionProvider.tsx
frontend/src/entities/session/model/session-context.ts
frontend/src/entities/session/model/useSession.ts
frontend/src/features/auth/model/AuthBootstrap.tsx
frontend/src/features/auth/model/useAuth.ts
frontend/src/shared/api/token-storage.ts
```

Token local-storage logic is centralized in `token-storage.ts`; 401 handling is centralized in the HTTP client/session event flow.

---

# 10. Forecast flow — фактическая реализация

Entry:

```text
POST /api/v1/forecasts
```

Core:

```text
backend/.../forecast/service/ForecastService.java
```

Flow:

```text
JWT user
  -> load user
  -> load product
  -> GET ML /health
  -> obtain windowSize + active model version
  -> load last windowSize CALENDAR days of product sales
     missing calendar dates are filled with 0.0
  -> persist Forecast as PENDING
  -> mark PROCESSING
  -> loop forecastHorizon times:
       POST ML /predict
       validate SKU
       validate finite non-negative prediction
       validate window size
       validate expected next date
       validate model version did not change
       append prediction into recursive history window
       create ForecastValue
  -> persist values
  -> mark COMPLETED
```

Failures mark forecast `FAILED` and expose controlled API errors.

Important error codes include:

```text
INSUFFICIENT_SALES_HISTORY
ML_SERVICE_UNAVAILABLE
ML_SERVICE_NOT_READY
ML_FORECAST_REJECTED
ML_INVALID_RESPONSE
ML_MODEL_CHANGED_DURING_FORECAST
ML_SERVICE_ERROR
FORECAST_GENERATION_FAILED
```

## Forecast metrics

`forecasts` table has:

```text
mae
rmse
mape
```

but real future forecasts normally return them as `null`, because actual future demand does not yet exist.

**Do not use `forecast.mae/rmse/mape` as the source for global model-quality analytics.**

The demo seed contains a forecast with demo metrics; that seed is not the scientific model-evaluation source.

---

# 11. Backend forecast DTO note

`ForecastHistoryItemResponse` contains:

```text
productSku
productName
```

but `ForecastResponse` contains only:

```text
productId
productSku
```

and currently does **not** contain `productName`.

Because of this, current frontend `mapForecastDto()` sets:

```text
product.name = dto.productSku
```

This is a real current limitation/shortcut. If forecast result UI needs the actual product name, fix the contract coherently (preferred) or fetch product data explicitly; do not invent the name.

---

# 12. PostgreSQL schema — canonical migrations

Canonical migrations:

```text
V001__create_departments.sql
V002__create_positions.sql
V003__create_users.sql
V004__create_products.sql
V005__create_sales.sql
V006__create_forecasts.sql
V007__create_forecast_values.sql
V008__add_updated_at_triggers.sql
V009__add_updated_at_triggers.sql
```

Do not rewrite already-applied migrations for a new feature. Add `V010__...` or later.

## Tables / relations

```text
departments
  id
  name UNIQUE case-insensitive
  is_active
  created_at
  updated_at

positions
  id
  department_id -> departments.id RESTRICT
  name
  is_active
  created_at
  updated_at
  UNIQUE(department_id, normalized name)

users
  id
  name
  email UNIQUE case-insensitive
  password_hash
  avatar_url
  role USER|ADMIN
  status ACTIVE|BLOCKED
  position_id -> positions.id RESTRICT nullable
  blocked_at
  created_at
  updated_at

products
  id
  sku UNIQUE
  name
  category nullable
  created_at
  updated_at

sales
  id
  product_id -> products.id RESTRICT
  sale_date
  quantity >= 0
  created_at
  UNIQUE(product_id, sale_date)

forecasts
  id
  user_id -> users.id RESTRICT
  product_id -> products.id RESTRICT
  forecast_horizon > 0
  model_version
  status PENDING|PROCESSING|COMPLETED|FAILED
  mae/rmse/mape nullable
  created_at
  started_at
  completed_at
  error_message

forecast_values
  id
  forecast_id -> forecasts.id CASCADE
  forecast_date
  predicted_quantity >= 0
  UNIQUE(forecast_id, forecast_date)
```

No analytics tables exist in the current schema.

---

# 13. Backend domain guards

Do not remove existing protections.

## Users

Current `AdminUserService` includes:

```text
SELF_ADMIN_RESTRICTION
LAST_ACTIVE_ADMIN
POSITION_INACTIVE
DEPARTMENT_INACTIVE
```

Important behavior:

- admin cannot block own account;
- admin cannot remove own ADMIN role through admin management;
- system protects the last active admin;
- assigned position must exist and be active;
- its department must be active.

## Positions

Current `PositionService` includes:

```text
POSITION_IN_USE
DEPARTMENT_INACTIVE
POSITION_ALREADY_EXISTS
```

Moving an in-use position between departments is protected.

## Products

Current `ProductService` protects duplicate SKU and deletion of an in-use product.

## CSV

Current CSV format:

```csv
product_sku,date,quantity
```

Duplicate sale key is effectively `(product, date)`.

---

# 14. Frontend stack

`frontend/package.json`:

```text
React 19.2.8
TypeScript ~6.0.2
Vite 8.3.0
React Router 7.18.4
Recharts 3.10.1
Lucide React
Motion
Tailwind 4 plugin
Three / react-three-fiber / drei
IBM Plex Sans / Mono
```

Package name is still `ui-prototype`; this name is misleading but does not mean `frontend/` is the prototype.

---

# 15. Frontend architecture

Current structure:

```text
frontend/src/
├── app/
│   ├── providers/
│   ├── router/
│   ├── store-context.ts
│   └── store.tsx
├── components/
│   ├── feedback/
│   ├── layout/
│   ├── signal/
│   └── ui/
├── entities/
│   ├── admin-user/
│   ├── forecast/
│   ├── organization/
│   ├── product/
│   ├── sale/
│   ├── session/
│   └── user/
├── features/
│   ├── admin/
│   ├── auth/
│   ├── forecasts/
│   ├── products/
│   ├── profile/
│   ├── sales/
│   └── sales-import/
├── pages/
│   ├── auth/
│   ├── errors/
│   ├── forecasts/
│   ├── products/
│   ├── profile/
│   ├── sales/
│   └── sales-import/
└── shared/
    ├── api/
    ├── config/
    ├── hooks/
    └── lib/
```

This is a lightweight feature/FSD-like organization, not strict FSD.

Do not restructure unrelated code merely to make it “more FSD”.

---

# 16. Frontend router

Source:

```text
frontend/src/app/router/AppRouter.tsx
```

Routes:

```text
/login
/register

/dashboard
/profile
/products
/sales
/forecasts/new
/forecasts
/forecasts/:id

ADMIN:
/products/new
/products/:id/edit
/sales/import
/admin/users
/admin/organization

/403
*
```

Guards:

```text
RequireSession
RequireAdmin
```

All protected pages render inside `AppLayout`.

---

# 17. Frontend functional modules — read map

## Auth

```text
entities/session/model/*
entities/user/model/types.ts
entities/user/lib/map-user.ts
features/auth/api/auth.api.ts
features/auth/model/AuthBootstrap.tsx
features/auth/model/useAuth.ts
pages/auth/ui/AuthPage.tsx
```

## Profile

```text
features/profile/api/profile.api.ts
features/profile/model/useProfile.ts
pages/profile/ui/ProfilePage.tsx
```

## Products

```text
entities/product/model/types.ts
features/products/api/products.api.ts
features/products/model/useProducts.ts
pages/products/ui/ProductsPage.tsx
pages/products/ui/ProductForm.tsx
```

## Sales

```text
entities/sale/model/types.ts
features/sales/api/sales.api.ts
features/sales/model/useSales.ts
pages/sales/ui/SalesPage.tsx
features/sales-import/model/useSalesImport.ts
pages/sales-import/ui/ImportPage.tsx
```

## Forecasts

```text
entities/forecast/model/types.ts
features/forecasts/api/forecasts.api.ts
features/forecasts/model/useCreateForecast.ts
features/forecasts/model/useForecast.ts
features/forecasts/model/useForecastHistory.ts
features/forecasts/Dashboard.tsx
features/forecasts/ForecastList.tsx
pages/forecasts/ui/ForecastCreatePage.tsx
pages/forecasts/ui/ForecastHistoryPage.tsx
pages/forecasts/ui/ForecastResultPage.tsx
```

## Admin users

```text
entities/admin-user/model/types.ts
features/admin/api/admin-users.api.ts
features/admin/model/useAdminUsers.ts
features/admin/UsersPage.tsx
```

## Organization

```text
entities/organization/model/types.ts
features/admin/api/organization.api.ts
features/admin/model/useOrganization.ts
features/admin/OrganizationPage.tsx
```

---

# 18. Frontend shared infrastructure

## HTTP

```text
frontend/src/shared/api/http-client.ts
frontend/src/shared/api/client.ts
frontend/src/shared/api/api-error.ts
frontend/src/shared/api/token-storage.ts
```

Use these; do not create a second fetch/axios client.

## Store

```text
frontend/src/app/store-context.ts
frontend/src/app/store.tsx
```

The store is intentionally small and currently contains only:

```text
user/logout bridge
general UI state
toast notification
```

It is **not** a business-data store.

Do not restore prototype business state/localStorage into it.

## Current dead legacy files

Tracked but currently unreferenced:

```text
frontend/src/mocks/products.ts
frontend/src/mocks/sales.ts
```

Do not use them as data sources. They may be removed if cleanup is safe.

---

# 19. ui-prototype — exact role

`ui-prototype/` is a visual reference captured before real API integration.

Allowed to copy/adapt from it:

```text
JSX composition
className structure
layout
spacing
typography
visual hierarchy
empty/loading/error presentation
chart styling
responsive composition
motion patterns
```

Forbidden as runtime source:

```text
ui-prototype/src/app/store.tsx
ui-prototype/src/app/store-context.ts
ui-prototype/src/mocks/*
ui-prototype/src/components/feedback/DemoControls.tsx
mock forecast generation
localStorage business persistence
fake users/products/sales/forecasts/organization
```

---

# 20. Prototype -> current frontend mapping

```text
ui-prototype/src/components/layout/AppLayout.tsx
  -> frontend/src/components/layout/AppLayout.tsx

ui-prototype/src/features/auth/AuthPage.tsx
  -> frontend/src/pages/auth/ui/AuthPage.tsx

ui-prototype/src/features/profile/ProfilePage.tsx
  -> frontend/src/pages/profile/ui/ProfilePage.tsx

ui-prototype/src/features/products/ProductsPage.tsx
  -> frontend/src/pages/products/ui/ProductsPage.tsx

ui-prototype/src/features/products/ProductForm.tsx
  -> frontend/src/pages/products/ui/ProductForm.tsx

ui-prototype/src/features/sales/SalesPage.tsx
  -> frontend/src/pages/sales/ui/SalesPage.tsx

ui-prototype/src/features/import/ImportPage.tsx
  -> frontend/src/pages/sales-import/ui/ImportPage.tsx

ui-prototype/src/features/forecasts/Dashboard.tsx
  -> frontend/src/features/forecasts/Dashboard.tsx

ui-prototype/src/features/forecasts/ForecastList.tsx
  -> frontend/src/features/forecasts/ForecastList.tsx

ui-prototype/src/features/forecasts/ForecastPages.tsx
  -> frontend/src/pages/forecasts/ui/ForecastCreatePage.tsx
  -> frontend/src/pages/forecasts/ui/ForecastResultPage.tsx
  -> frontend/src/pages/forecasts/ui/ForecastHistoryPage.tsx

ui-prototype/src/features/admin/UsersPage.tsx
  -> frontend/src/features/admin/UsersPage.tsx

ui-prototype/src/features/admin/OrganizationPage.tsx
  -> frontend/src/features/admin/OrganizationPage.tsx
```

Prototype shared chart:

```text
ui-prototype/src/components/charts/ForecastChart.tsx
```

Current frontend no longer has this component; `ForecastResultPage.tsx` contains its own simplified SVG chart showing forecast values only.

This is one of the main restoration targets.

---

# 21. Visual design system — condensed

The tracked prototype and current frontend already share almost identical global CSS/tokens. Therefore UI restoration should focus first on page **markup/composition**, not wholesale stylesheet replacement.

Core visual concept from `docs/design/02-ui-design-system.md`:

```text
compact dark shell
+
bright analytical workspace
```

Fonts:

```text
IBM Plex Sans
IBM Plex Mono for SKU/model/technical values
```

Important tokens from `ui-prototype/src/styles/tokens.css`:

```text
canvas          #F5F7FA
surface         #FFFFFF
text-primary    #182230
action/cobalt   #2457D6
shell           #141C26
signal/cyan     #007F96
success         #176B46
warning         #865500
danger          #B42318

sidebar-width   216px
header-height   64px
content-width   1440px
control-height  40px
chart-height    390px
chart-compact   240px
```

Grid principle: 8px.

Do not invent a new design language.

---

# 22. Current UI notes relevant to restore

1. `AppLayout` is still structurally close to prototype and keeps the same visual shell; prototype-only demo controls were correctly removed.
2. Current pages became much larger because mock state was replaced by real API/hooks.
3. Global style files are already nearly identical to prototype:
   - `App.css` effectively same;
   - `index.css` same;
   - `tokens.css` same;
   - `polish.css` same;
   - `styles/app.css` only has small current additions.
4. Therefore **do not replace the entire frontend or CSS tree**. Restore JSX/class composition around current data/actions.
5. Dashboard lost the prototype forecast chart because history list DTO contains summary only. If restoring the latest chart, fetch the latest forecast detail (`GET /forecasts/{id}`) rather than using fake values.

---

# 23. ML-service stack

`ml-service/requirements.txt`:

```text
pandas 3.0.6
pyarrow 25.0.1
matplotlib 3.11.2
pytest 9.1.1
torch 2.14.0
fastapi 0.141.1
uvicorn 0.53.0
httpx 0.28.1
httpx2 2.13.1
python-multipart 0.0.20
```

No scikit-learn dependency is present.

---

# 24. ML-service package map

Root:

```text
ml-service/src/demand_forecast_ml/
```

```text
analysis/     EDA utilities
api/          FastAPI app, schemas, DI, config, errors
baseline/     naive / moving average experiments
data/         contracts, adapters, validation, preprocessing, split
evaluation/   frozen model comparison and metrics
lstm/         model, config, dataset, scaling, training, inference/checkpoint
runtime/      loaded prediction runtime + active runtime manager
training/     production retraining, jobs, file-system model registry
```

---

# 25. ML FastAPI — current endpoints

```text
GET  /health
POST /predict
POST /training/start
GET  /training/{job_id}
GET  /model
POST /models/{version_id}/activate
```

Source:

```text
ml-service/src/demand_forecast_ml/api/app.py
```

`/predict` is one-step inference. Backend performs multi-step recursive forecasting.

---

# 26. ML runtime — critical invariant

Source:

```text
ml-service/src/demand_forecast_ml/runtime/predictor.py
```

Window size for frozen LSTM: **14**.

Known training SKU:

```text
use saved TRAIN-fitted scaler from SeriesScalerRegistry
```

Unknown/new application SKU:

```text
fit an inference-only MinMax scaler from supplied observed history
use latest 14 points
inverse-transform with the same temporary scaler
DO NOT retrain the LSTM
```

`UnknownSeriesError` remains only for compatibility; unknown SKU is no longer automatically rejected.

Do not break this behavior.

---

# 27. Experimental dataset / frozen evaluation

Final FreshRetail experimental subset documented in `docs/ml/01-dataset.md`:

```text
300 time series
97 daily observations per series
29,100 rows
32 first-level categories
range: 2024-03-28 .. 2024-07-02
```

Split:

```text
TRAIN      2024-03-28 .. 2024-06-11  (76 days)
VALIDATION 2024-06-12 .. 2024-06-25  (14 days)
TEST       2024-06-26 .. 2024-07-02  (7 days)
```

Frozen comparison:

```text
Moving Average window = 7
LSTM window           = 14
TEST observations     = 2100
MAPE observations     = 2038
```

Metrics:

```text
Moving Average:
MAE  0.7158
RMSE 1.3500
MAPE 48.6489%

LSTM:
MAE  0.6907
RMSE 1.3071
MAPE 48.1644%
```

Do not retune models after TEST merely to improve visuals.

---

# 28. Model-comparison artifacts already exist conceptually

Important: KP-24 code already writes **machine-readable analytics artifacts**.

Source:

```text
ml-service/src/demand_forecast_ml/evaluation/comparison.py
```

Generated outputs:

```text
test_predictions.csv
comparison_metrics.csv
per_series_metrics.csv
daily_metrics.csv
plots/test_mean_forecast.png
plots/test_daily_mae.png
summary.txt
```

`test_predictions.csv` already contains:

```text
actual
moving_average_prediction
lstm_prediction
moving_average_absolute_error
lstm_absolute_error
product_sku
date
```

`comparison_metrics.csv` contains aggregate MAE/RMSE/MAPE for both models.

`daily_metrics.csv` contains daily MAE/RMSE for both models.

These generated artifacts are intentionally **not committed to Git**.

For new product analytics, expose or package this data in a deployment-safe way; do not hardcode the values in React.

---

# 29. Production model registry

Source:

```text
ml-service/src/demand_forecast_ml/training/registry.py
ml-service/src/demand_forecast_ml/training/pipeline.py
```

Each production version contains at least:

```text
best_model.pt
scalers.json
metadata.json
metrics.json
training_history.csv
validation_predictions.csv
```

Registry root is resolved under ML service root as:

```text
ml-service/models/
```

Activation is via `active.json`.

Production training metrics are **validation metrics for uploaded application data**, not the frozen KP-24 TEST comparison. Do not conflate the two concepts in UI labels.

---

# 30. Analytics expansion — required data ownership

Target product analytics:

```text
OVERVIEW
  History + Forecast
  KPI cards
  Key Insights

SEASONALITY
  real application sales analysis

MODEL QUALITY
  Actual vs Predicted on frozen TEST
  Moving Average vs LSTM
  Forecast Error on frozen TEST
```

## Data sources

| UI block | Correct source |
|---|---|
| History + Forecast | PostgreSQL sales + persisted forecast values |
| Forecast total/avg/peak | persisted forecast values |
| Change vs previous period | PostgreSQL sales for comparable prior period |
| Key Insights | deterministic calculation from real sales/forecast |
| Seasonality | PostgreSQL application sales |
| Actual vs Predicted | KP-24 TEST evaluation artifacts |
| MA vs LSTM | KP-24 `comparison_metrics.csv` |
| Forecast Error | KP-24 test predictions/daily metrics |

Never use prototype mocks or random data.

---

# 31. Important semantic separation for analytics

## Product Forecast analytics

Answers:

```text
“What is expected for THIS application product?”
```

Uses current DB product/sales/forecast.

## Model Quality analytics

Answers:

```text
“How did the frozen models perform on the held-out experimental TEST set?”
```

Uses KP-24 evaluation data.

Do **not** imply that a current application SKU corresponds to a FreshRetail experimental SKU unless it actually does.

For `Actual vs Predicted`, a safe default is an aggregate TEST view by date across all 300 evaluated series, or an explicit evaluation-series selector. Do not silently map application products to experimental SKUs.

---

# 32. Seasonality honesty rules

Application seed data contains only 7 days per demo product, so it is insufficient for meaningful monthly/annual seasonality.

Runtime imported sales may contain more history.

Therefore the API/UI should expose coverage and choose honestly:

```text
short history -> weekday / simple pattern or “insufficient data”
enough months  -> monthly bars
enough month+weekday coverage -> heatmap
```

Do not generate a heatmap solely because the design asks for one.

The old EDA document also discusses synthetic long-term seasonality; this must not be presented as evidence for a current application product.

---

# 33. KPI / insight calculation rules

Recommended deterministic metrics:

```text
forecastTotal   = sum(predicted values)
forecastAverage = mean(predicted values)
peak            = max(predicted value) + date
minimum         = min(predicted value) + date
```

Change vs previous comparable period:

```text
compare N forecast calendar days with previous N actual calendar days
```

Be consistent with current forecast history semantics: missing calendar days in inference history are treated as zero.

If a prior period is incomplete/ambiguous, return `unavailable` rather than a fake percentage.

No LLM is required for Key Insights.

---

# 34. Recommended analytics architecture

Keep architecture:

```text
Frontend
  -> Backend analytics API
      -> PostgreSQL aggregation for product analytics
      -> ML-service read-only evaluation API for model quality
```

Do not let frontend read:

```text
CSV files from repo
ML artifacts directly
filesystem paths
```

A coherent implementation may add:

```text
backend/.../analytics/
frontend/src/entities/analytics/
frontend/src/features/analytics/
```

and read-only ML analytics schemas/endpoints.

Exact endpoint names are implementation choices; keep them cohesive and documented.

---

# 35. Deployment-safe model-quality data

Because KP-24 generated artifacts are ignored by Git, the final model-quality feature must not work only on one developer machine.

Acceptable strategies include:

1. generate/copy a compact immutable machine-readable evaluation snapshot during an explicit build/preparation step and document it;
2. store evaluation data with a versioned model/evaluation artifact bundle available to ML-service;
3. extend an existing model/evaluation registry cleanly.

Requirements:

```text
values must be derived from real KP-24 output
no manual hardcoded React constants
missing artifact -> controlled unavailable state
path/config must be deployment documented
```

Do not introduce a database table merely because one can; choose the smallest coherent persistence strategy.

---

# 36. Documentation map

## Analysis

```text
docs/analysis/01-domain-and-buisness-context.md
docs/analysis/02-project-goal-and-objectives.md
docs/analysis/03-existing-solutions-analysis.md
docs/analysis/04-scientific-and-technical-approaches.md
docs/analysis/05-system-boundaries.md
docs/analysis/06-business-processes.md
```

## Requirements

```text
docs/requirements/01-functional-requirements.md
docs/requirements/02-non-functional-requirements.md
docs/requirements/03-use-cases.md
```

## Architecture

```text
docs/architecture/01-system-context.md
docs/architecture/02-system-architecture.md
docs/architecture/03-rest-api.md
docs/architecture/04-data-model.md
docs/architecture/05-backend-ml-integration.md
```

## UI

```text
docs/design/01-ui-structure.md
docs/design/02-ui-design-system.md
```

## ML

```text
docs/ml/01-dataset.md
docs/ml/02-eda.md
docs/ml/03-preprocessing.md
docs/ml/04-baseline.md
docs/ml/05-lstm.md
docs/ml/06-model-comparison.md
docs/ml/07-fastapi-ml-service.md
```

## Diagrams

```text
docs/diagrams/architecture/*.puml
docs/diagrams/bpmn/*.bpmn
docs/diagrams/database/*.puml
docs/diagrams/requirements/*.puml
docs/diagrams/ui/*.puml
```

Docs are useful context, but if docs contradict current code, inspect code before editing.

---

# 37. High-value read sets for Codex

Use these instead of scanning the entire repo.

## Task: restore a specific UI page

Read only:

```text
PROJECT_MAP.md
prototype counterpart
current counterpart
current hook/API/types used by that page
shared primitives used by page
styles/tokens.css
App.css / styles/app.css only when needed
```

## Task: History + Forecast

```text
frontend/src/pages/forecasts/ui/ForecastResultPage.tsx
frontend/src/entities/forecast/model/types.ts
frontend/src/features/forecasts/api/forecasts.api.ts
frontend/src/features/forecasts/model/useForecast.ts
frontend/src/features/sales/api/sales.api.ts
frontend/src/entities/sale/model/types.ts
ui-prototype/src/components/charts/ForecastChart.tsx
ui-prototype/src/features/forecasts/ForecastPages.tsx
backend/.../forecast/*
backend/.../sales/*
```

## Task: Seasonality

```text
backend/.../sales/model/SalesEntity.java
backend/.../sales/repository/SalesRepository.java
backend/.../sales/service/SalesService.java
database/migrations/V005__create_sales.sql
frontend sales/product types
```

## Task: Model Quality

```text
ml-service/src/demand_forecast_ml/evaluation/comparison.py
ml-service/src/demand_forecast_ml/evaluation/metrics.py
ml-service/src/demand_forecast_ml/evaluation/config.py
docs/ml/06-model-comparison.md
ml-service/src/demand_forecast_ml/api/app.py
ml-service/src/demand_forecast_ml/api/schemas.py
backend/src/main/java/com/demandforecast/config/MlServiceConfig.java
backend/src/main/java/com/demandforecast/forecast/client/MlForecastClient.java
```

## Task: permissions/auth regression

```text
backend/.../config/SecurityConfig.java
backend/.../auth/security/*
frontend/src/app/router/AppRouter.tsx
frontend/src/features/auth/*
```

---

# 38. Known current technical notes

These are observations, not blanket instructions to refactor everything:

1. Root README ports are not fully synchronized with tracked config.
2. `frontend/package.json` still says package name `ui-prototype`.
3. `frontend/src/mocks/products.ts` and `mocks/sales.ts` are tracked but currently unreferenced.
4. `ForecastResponse` lacks `productName`; current frontend detail maps name to SKU.
5. Current forecast-result chart is a local simplified SVG and does not include historical sales.
6. Current Dashboard no longer has prototype forecast chart because history endpoint returns summaries, not forecast values.
7. Future forecast `mae/rmse/mape` are normally null; scientific model-quality metrics belong to KP-24 evaluation.
8. Module READMEs may contain stale test-count text. Always run tests; do not trust old counts.
9. `V008` and `V009` both concern updated-at triggers. They are already-applied migrations; do not rewrite them as part of unrelated analytics work.

---

# 39. Tests and validation

## Backend

From repository root:

```powershell
cd .\backend
.\mvnw.cmd test
cd ..
```

## ML

```powershell
$env:PYTHONPATH = (Resolve-Path ".\ml-service\src").Path
.\ml-service\.venv\Scripts\python.exe -m pytest ".\ml-service\tests"
```

## Frontend

```powershell
npm --prefix ".\frontend" run build
npm --prefix ".\frontend" run lint
```

## Git whitespace

```powershell
git diff --check
```

Last known external verification before this change set was green; do not rely on the old number of tests after adding analytics. Report fresh counts.

---

# 40. Git workflow for the next task

Stable branches:

```text
main
develop
```

For the UI + analytics correction create **one descriptive branch**:

```text
fix/<descriptive-name>
```

Branch from latest `develop` unless repository state explicitly proves a different base is required.

Do not merge automatically.

Use logical commits, not one commit per file.

At completion provide:

```text
branch name
PR title
PR description
implementation summary
fresh validation results
deployment impact
```

---

# 41. Non-negotiable invariants

1. No loss of current functionality.
2. No fake runtime business data.
3. No frontend -> ML direct calls.
4. No duplicate HTTP client.
5. No return of prototype business store/localStorage.
6. No hardcoded model-quality numbers in React.
7. No pretending future-forecast metrics are TEST metrics.
8. No silent mapping of app SKU to experimental SKU.
9. No mutation of old DB migrations for a new feature.
10. No model tuning on TEST.
11. No redesign “on taste”; visual target is the prototype/design docs.
12. Analytics must degrade honestly when data coverage is insufficient.

---

# 42. Definition of Done for UI + analytics change

The task is complete only when:

```text
UI visual language restored from ui-prototype
all current API-driven functionality preserved
all current routes preserved
USER/ADMIN permissions preserved
profile/avatar preserved
products CRUD preserved
sales/filter/pagination preserved
CSV import preserved
forecast create/history/detail preserved
F5 persistence preserved
users admin preserved
organization admin preserved

Overview analytics uses real data
History + Forecast shows actual + future series
KPI cards are deterministic
Key Insights are deterministic
Seasonality uses application sales and coverage rules
Actual vs Predicted uses frozen TEST data
MA vs LSTM uses frozen evaluation metrics
Forecast Error uses real TEST errors

Backend tests pass
ML tests pass
Frontend build passes
Frontend lint passes
git diff --check passes

PROJECT_MAP.md updated to final architecture
docs updated where public contracts changed
final deployment notes supplied
PR title and description supplied
```
