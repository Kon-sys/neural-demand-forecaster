# Demand Forecast ML Service

FastAPI-сервис прогнозирования потребительского спроса.

Сервис предоставляет:

- inference LSTM-модели;
- health check;
- загрузку данных для переобучения;
- асинхронное обучение новой версии модели;
- versioning моделей;
- ручную активацию модели;
- hot reload без перезапуска приложения.

## Требования

- Python 3.14
- PyTorch
- FastAPI
- Uvicorn

## Установка

Из корня проекта:

```powershell
& ".\ml-service\.venv\Scripts\python.exe" -m pip install `
    -r ".\ml-service\requirements.txt"
```

## Запуск

```powershell
$env:PYTHONPATH = (Resolve-Path ".\ml-service\src").Path

& ".\ml-service\.venv\Scripts\python.exe" -m uvicorn `
    demand_forecast_ml.api.app:app `
    --app-dir ".\ml-service\src" `
    --host 127.0.0.1 `
    --port 8001
```

После запуска:

- Swagger UI: `http://127.0.0.1:8001/docs`
- OpenAPI: `http://127.0.0.1:8001/openapi.json`

## Environment variables

Поддерживаются:

`ML_DEVICE`

Допустимые значения:

- `auto`
- `cpu`
- `cuda`

`ML_CHECKPOINT_PATH`

Путь к bootstrap LSTM checkpoint.

`ML_SCALERS_PATH`

Путь к bootstrap scaler registry.

## Health

### GET /health

Проверяет доступность inference runtime.

Пример ответа:

```json
{
  "status": "ok",
  "model_loaded": true,
  "scalers_loaded": true,
  "device": "cpu",
  "window_size": 14,
  "series_count": 300,
  "active_model_version": null
}
```

Если runtime недоступен:

`HTTP 503`

## Prediction

### POST /predict

Пример запроса:

```json
{
  "product_sku": "SKU-A",
  "history": [
    7,
    8,
    9,
    10,
    11,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    5,
    6
  ],
  "last_observation_date": "2026-09-30"
}
```

Модель использует последние `window_size` наблюдений.

Пример ответа:

```json
{
  "product_sku": "SKU-A",
  "prediction": 7.42,
  "model": "lstm",
  "model_version": "20260924T120000Z-a1b2c3d4",
  "window_size": 14,
  "history_points_used": 14,
  "forecast_date": "2026-10-01"
}
```

Прогноз ограничивается снизу нулём.

## Training dataset

Training endpoint ожидает CSV:

```csv
product_sku,date,quantity
SKU-A,2026-01-01,10
SKU-A,2026-01-02,12
SKU-B,2026-01-01,4
SKU-B,2026-01-02,6
```

Файл должен представлять накопленную историю продаж, используемую для
переобучения модели.

Backend приложения должен формировать этот dataset после импорта
пользовательских данных в основное хранилище.

Последний загруженный администратором файл не должен автоматически
рассматриваться как полная обучающая выборка.

## Start training

### POST /training/start

Content-Type:

`multipart/form-data`

Поле:

`file`

Формат:

`.csv`

Сервис:

1. сохраняет отдельную копию dataset для training job;
2. ставит job в очередь;
3. запускает preprocessing;
4. формирует TRAIN и VALIDATION;
5. обучает LSTM;
6. сохраняет лучший checkpoint;
7. рассчитывает validation metrics;
8. создаёт новую model version.

Endpoint возвращает:

`HTTP 202`

Пример:

```json
{
  "job_id": "4ad14af26dc84ed89e8210e41fd8c011",
  "status": "queued",
  "created_at": "2026-09-24T12:00:00+00:00"
}
```

## Training status

### GET /training/{job_id}

Возможные состояния:

- `queued`
- `training`
- `ready`
- `failed`

Пример завершённого обучения:

```json
{
  "job_id": "4ad14af26dc84ed89e8210e41fd8c011",
  "status": "ready",
  "created_at": "2026-09-24T12:00:00+00:00",
  "started_at": "2026-09-24T12:00:01+00:00",
  "finished_at": "2026-09-24T12:01:30+00:00",
  "version": "20260924T120001Z-a1b2c3d4",
  "error": null,
  "result": {
    "series_count": 125,
    "mae": 0.75,
    "rmse": 1.21
  }
}
```

## Model lifecycle

Успешное обучение создаёт модель:

`READY`

но не активирует её автоматически.

Это предотвращает замену рабочей модели новой версией без явного
решения администратора.

## Activate model

### POST /models/{version}/activate

При активации:

1. проверяется наличие всех model artifacts;
2. checkpoint загружается в новый runtime;
3. scaler registry загружается в новый runtime;
4. только после успешной загрузки версия становится ACTIVE;
5. runtime заменяется без перезапуска FastAPI.

Пример ответа:

```json
{
  "version": "20260924T120001Z-a1b2c3d4",
  "status": "active"
}
```

Если checkpoint повреждён, текущая модель продолжает работать.

## Active model

### GET /model

Возвращает:

- active model version;
- metadata;
- validation metrics;
- источник runtime.

## Model registry

Production-модели хранятся локально:

```text
ml-service/models/
├── active.json
└── <version>/
    ├── best_model.pt
    ├── scalers.json
    ├── metadata.json
    ├── metrics.json
    ├── training_history.csv
    └── validation_predictions.csv
```

Model artifacts исключены из Git.

## Training strategy

Для production retraining используется та же LSTM-архитектура, которая
была исследована на FreshRetailNet.

При переобучении:

- каждый временной ряд имеет собственный TRAIN-only scaler;
- последние 14 дней используются как VALIDATION;
- более ранние данные используются как TRAIN;
- series без достаточной истории исключаются;
- validation не участвует в scaler fitting;
- используется early stopping;
- сохраняется лучший validation checkpoint.

FreshRetailNet используется как экспериментальный dataset проекта.

Production-модели обучаются уже на данных информационной системы.

## Tests

Полный набор тестов:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\ml-service\src").Path

& ".\ml-service\.venv\Scripts\python.exe" -m pytest `
    ".\ml-service\tests" `
    -q
```

Интеграционные тесты проверяют реальные сценарии:

```text
CSV
→ preprocessing
→ LSTM training
→ checkpoint
→ READY
→ activation
→ hot reload
→ prediction
```