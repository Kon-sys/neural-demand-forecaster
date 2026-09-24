# Demand Forecast Backend

Spring Boot Backend программного средства прогнозирования
потребительского спроса.

## Technology Stack

- Java 21
- Spring Boot 4.1.1
- Spring Web
- Spring Data JPA
- Spring Security
- JWT
- PostgreSQL
- Flyway
- Maven
- Spring RestClient

## Основные модули

```text
com.demandforecast
├── auth
├── common
├── config
├── forecast
├── health
├── organization
├── product
├── sales
├── storage
└── user
```

## Database

Используется PostgreSQL.

Миграции находятся в:

```text
database/migrations
```

Во время Maven build они копируются в:

```text
classpath:db/migration
```

Flyway выполняет миграции автоматически.

## Environment Variables

### PostgreSQL

```text
POSTGRES_HOST
POSTGRES_PORT
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
```

Значения по умолчанию:

```text
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=demand_forecast
POSTGRES_USER=forecast_app
```

Пароль должен быть передан через:

```text
POSTGRES_PASSWORD
```

### JWT

```text
JWT_SECRET_BASE64
JWT_EXPIRATION_MINUTES
```

### Bootstrap Admin

```text
BOOTSTRAP_ADMIN_ENABLED
BOOTSTRAP_ADMIN_NAME
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_PASSWORD
```

### Cloudinary

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

### ML Service

```text
ML_SERVICE_URL
ML_SERVICE_CONNECT_TIMEOUT
ML_SERVICE_READ_TIMEOUT
```

Значения по умолчанию:

```text
ML_SERVICE_URL=http://localhost:8001
ML_SERVICE_CONNECT_TIMEOUT=2s
ML_SERVICE_READ_TIMEOUT=10s
```

## Запуск ML Service

Из корня repository:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\ml-service\src").Path

& ".\ml-service\.venv\Scripts\python.exe" -m uvicorn `
    demand_forecast_ml.api.app:app `
    --app-dir ".\ml-service\src" `
    --host 127.0.0.1 `
    --port 8001
```

## Запуск Backend

Перейти в:

```powershell
cd ".\backend"
```

Запустить:

```powershell
.\mvnw.cmd spring-boot:run
```

Backend по умолчанию доступен:

```text
http://localhost:8080
```

ML-service:

```text
http://localhost:8001
```

## Sales API

Основной endpoint просмотра продаж:

```text
GET /api/v1/sales
```

Импорт CSV:

```text
POST /api/v1/sales/import
```

CSV format:

```csv
product_sku,date,quantity
SKU-A,2026-01-01,10
SKU-A,2026-01-02,12
```

Импорт доступен администратору.

## Forecast API

Создание прогноза:

```text
POST /api/v1/forecasts
```

Request:

```json
{
  "productId": 1,
  "forecastHorizon": 7
}
```

Получение сохранённого прогноза:

```text
GET /api/v1/forecasts/{forecastId}
```

## Forecast Flow

```text
Client
  |
  v
Spring Backend
  |
  +----> PostgreSQL sales history
  |
  +----> GET ML /health
  |
  +----> POST ML /predict
  |
  v
Recursive multi-step forecasting
  |
  v
PostgreSQL
  |
  +---- forecasts
  +---- forecast_values
```

## Multi-step Forecast

LSTM выполняет one-step prediction.

Backend строит прогноз на несколько дней рекурсивно:

```text
history
  |
  v
prediction t+1
  |
  v
updated history
  |
  v
prediction t+2
  |
  v
...
```

Предсказанное значение становится частью следующего входного окна.

## Forecast Statuses

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

## Forecast Metrics

Поля:

```text
mae
rmse
mape
```

не заполняются сразу после создания будущего прогноза.

Фактические значения будущего периода в этот момент ещё неизвестны,
поэтому ошибка конкретного прогноза не может быть рассчитана корректно.

## ML Service Errors

Backend обрабатывает:

```text
ML_SERVICE_UNAVAILABLE
ML_SERVICE_NOT_READY
ML_FORECAST_REJECTED
ML_INVALID_RESPONSE
ML_SERVICE_ERROR
ML_MODEL_CHANGED_DURING_FORECAST
```

## Tests

Запуск всех Backend tests:

```powershell
.\mvnw.cmd test
```

Текущий результат:

```text
Tests run: 6
Failures: 0
Errors: 0
Skipped: 0

BUILD SUCCESS
```