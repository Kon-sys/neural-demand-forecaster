# FastAPI ML Service

## 1. Назначение

В рамках KP-25 разработан самостоятельный ML-service для прогнозированияпотребительского спроса и управления жизненным циклом LSTM-моделей.

Сервис реализован на FastAPI и отделяет ML-функциональность от основногоSpring Backend.

ML-service поддерживает:

- загрузку LSTM-модели;
- прогнозирование спроса;
- health check;
- переобучение модели на новых данных;
- асинхронные training jobs;
- версионирование моделей;
- ручную активацию новой версии;
- hot reload модели без перезапуска сервиса.

## 2. Архитектура

Общая схема взаимодействия:

```text
Frontend  
   |  
   v  
Spring Backend  
   |  
   +------ PostgreSQL  
   |  
   v  
FastAPI ML Service  
   |  
   +------ Prediction Runtime  
   |  
   +------ Training Service  
   |  
   +------ Model Registry
```

Spring Backend является владельцем бизнес-данных.

ML-service отвечает за:

- подготовку ML dataset;
- обучение;
- validation;
- хранение версий моделей;
- inference.

## 3. Использование загружаемых данных

Администратор информационной системы может загружать новые данные продаж.

Загруженный файл сначала обрабатывается основной системой и сохраняетсяв базе данных.

После этого новые данные могут влиять на ML двумя способами.

Первый способ — новые продажи входят в актуальную историю, используемуюпри последующем прогнозировании.

Второй способ — накопленная история используется для переобучениямодели.

Схема:

```text
Admin  
|  
v  
CSV / XLSX  
|  
v  
Spring Backend  
|  
v  
PostgreSQL  
|  
+------> актуальная история ------> /predict  
|  
+------> накопленный ML dataset --> /training/start  
|  
v  
new model
```

ML-service не должен обучаться только на последнем загруженном файле,если этот файл содержит лишь часть истории.

Для production retraining используется накопленная история продаж.

## 4. Исследовательская и production-модель

На предыдущих этапах проекта модель была разработана и оценена наFreshRetailNet-50K.

FreshRetailNet использовался для:

- разработки preprocessing pipeline;
- разработки baseline;
- разработки LSTM;
- настройки модели;
- validation;
- независимого TEST-сравнения.

Production pipeline использует ту же зафиксированную архитектуру LSTM,но выполняет обучение новых весов уже на данных информационной системы.

Таким образом модель, обученная на FreshRetailNet, не рассматриваетсякак универсальная модель для произвольных SKU предприятия.

## 5. API

Реализованы следующие endpoint:

```text
GET  /health  
POST /predict  
  
POST /training/start  
GET  /training/{job_id}  
  
GET  /model  
POST /models/{version_id}/activate
```

## 6. Health Check

Endpoint:

`GET /health`

возвращает состояние inference runtime.

Проверяются:

- наличие загруженной модели;
- наличие scaler registry;
- вычислительное устройство;
- размер временного окна;
- количество поддерживаемых series;
- идентификатор активной production-модели.

Если inference runtime недоступен, возвращается:

`HTTP 503`

## 7. Prediction

Endpoint:

`POST /predict`

получает:

- `product_sku`;
- историю спроса;
- опциональную дату последнего наблюдения.

Модель использует последние:

`14`

значений временного ряда.

Если клиент передаёт больше значений, используются последние 14.

Если передано недостаточно данных, запрос отклоняется.

## 8. Неизвестные временные ряды

Для каждого временного ряда используется собственный TRAIN-onlyMin-Max scaler.

Поэтому прогноз возможен только для series, участвовавших в обученииактивной модели.

Если scaler для переданного `product_sku` отсутствует, сервис возвращает:

`unknown_series`

Это предотвращает использование параметров нормализации другого товара.

## 9. Production retraining

Training pipeline ожидает dataset следующего формата:

```csv
product_sku,date,quantity  
SKU-A,2026-01-01,10  
SKU-A,2026-01-02,12  
SKU-B,2026-01-01,4  
SKU-B,2026-01-02,6
```

Pipeline выполняет:

1. чтение CSV;
2. валидацию;
3. нормализацию типов;
4. построение ежедневных временных рядов;
5. восстановление пропущенных дат;
6. отбор временных рядов с достаточной историей;
7. формирование TRAIN;
8. формирование VALIDATION;
9. TRAIN-only scaling;
10. построение временных окон;
11. обучение LSTM;
12. validation после каждой эпохи;
13. early stopping;
14. сохранение лучшего checkpoint;
15. inference на VALIDATION;
16. расчёт MAE, RMSE и MAPE;
17. создание новой model version.


## 10. Разделение production dataset

При production retraining последние:

`14 дней`

используются как VALIDATION.

Более ранние наблюдения используются как TRAIN.

VALIDATION не участвует в определении параметров scaling.

Scaler каждого временного ряда обучается исключительно по TRAIN.

## 11. Требования к временным рядам

В обучение включаются только временные ряды, для которых доступнодостаточно исторических данных.

Series должен:

- содержать достаточное количество TRAIN observations;
- позволять построить входное окно LSTM;
- содержать полный validation interval;
- доходить до актуальной конечной даты обучающего dataset.

Series с недостаточной историей исключается из текущего retraining.

После накопления дополнительных наблюдений он может быть включён вследующую версию модели.

## 12. Training jobs

Обучение выполняется асинхронно.

Используются состояния:

```text
QUEUED  
   |  
   v  
TRAINING  
   |  
   +------> READY  
   |  
   +------> FAILED
```

Для training используется single-worker очередь.

Это предотвращает одновременный запуск нескольких ресурсоёмкихLSTM-обучений на одном ML-service instance.

## 13. Model Registry

Каждое успешное обучение создаёт отдельную версию модели.

Структура:

```text
ml-service/models/  
├── active.json  
├── <version-1>/  
│   ├── best_model.pt  
│   ├── scalers.json  
│   ├── metadata.json  
│   ├── metrics.json  
│   ├── training_history.csv  
│   └── validation_predictions.csv  
└── <version-2>/  
├── best_model.pt  
├── scalers.json  
├── metadata.json  
├── metrics.json  
├── training_history.csv  
└── validation_predictions.csv
```

Generated model artifacts не сохраняются в Git.

## 14. Metadata

Для каждой версии сохраняется metadata, содержащая:

- version;
- дату создания;
- источник данных;
- количество строк;
- количество временных рядов;
- диапазон дат;
- границу TRAIN;
- validation interval;
- LSTM configuration;
- количество TRAIN samples;
- количество VALIDATION samples;
- best epoch;
- количество выполненных эпох;
- validation metrics.

## 15. READY и ACTIVE

Успешное обучение не приводит к автоматической замене рабочей модели.

Используются два различных состояния:

```text
READY != ACTIVE
```

После обучения новая версия становится READY.

Администратор должен отдельно активировать её.

## 16. Активация модели

Endpoint:

`POST /models/{version_id}/activate`

Перед заменой текущей модели выполняются:

- проверка model version;
- загрузка checkpoint;
- восстановление конфигурации LSTM;
- загрузка state dict;
- загрузка scaler registry;
- создание нового PredictionRuntime.

Только после успешного выполнения этих операций версия становитсяACTIVE.

Если checkpoint или scaler artifact повреждён, текущая рабочая модельне заменяется.

## 17. Hot Reload

После активации новой версии ML-service не требуется перезапускать.

RuntimeManager заменяет активный PredictionRuntime.

Следующие запросы:

`POST /predict`

используют уже новую model version.

## 18. Bootstrap Model

При первоначальном запуске ML-service может использоватьэкспериментальные FreshRetail artifacts:

```text
ml-service/artifacts/lstm/freshretail/best_model.pt  
ml-service/artifacts/lstm/freshretail/scalers.json
```

После появления активной production model она получает приоритет.

При последующем запуске сервис может восстановить активную версию изModel Registry.

## 19. Prediction Runtime

PredictionRuntime отвечает только за inference.

Он:

- не обучает модель;
- переводит модель в `eval()` mode;
- использует `torch.no_grad()`;
- выбирает scaler конкретного series;
- нормализует входную историю;
- выполняет LSTM inference;
- выполняет inverse transformation;
- ограничивает отрицательный прогноз значением `0.0`.

## 20. Environment Configuration

Поддерживаются переменные:

```text
ML_DEVICE  
ML_CHECKPOINT_PATH  
ML_SCALERS_PATH
```

`ML_DEVICE` поддерживает:

```text
auto  
cpu  
cuda
```

Пути bootstrap checkpoint и scaler registry могут быть переопределенычерез environment variables.

## 21. Обработка ошибок

API обрабатывает следующие ситуации:

- неизвестный product SKU;
- недостаточная история;
- отрицательные значения спроса;
- NaN и Infinity;
- отсутствие inference runtime;
- отсутствие training service;
- неподдерживаемый формат файла;
- пустой CSV;
- неизвестный training job;
- неизвестная model version;
- ошибка загрузки checkpoint;
- ошибка обучения.

## 22. Отказоустойчивость retraining

Запуск нового обучения не останавливает текущий inference.

Если training завершается ошибкой:

```text
TRAINING  
   |  
   v  
FAILED
```

незавершённая model version удаляется.

Активная модель продолжает обслуживать `/predict`.

Если обучение завершено успешно:

```text
TRAINING  
|  
v  
READY
```

модель также не заменяет ACTIVE автоматически.

## 23. Проверка production training

Реализован интеграционный тест полного ML pipeline:

```text
CSV  
 |  
 v  
preprocessing  
 |  
 v  
per-series scaling  
 |  
 v  
LSTM training  
 |  
 v  
best checkpoint  
 |  
 v  
validation  
 |  
 v  
model version  
 |  
 v  
activation  
 |  
 v  
PredictionRuntime  
 |  
 v  
prediction
```

Тест выполняет настоящее обучение небольшой LSTM на CPU и проверяетсоздание всех необходимых model artifacts.

## 24. Проверка полного HTTP lifecycle

Отдельный интеграционный тест проверяет:

```text
POST /training/start  
|  
v  
TRAINING  
|  
v  
READY  
|  
v  
POST /models/{version}/activate  
|  
v  
ACTIVE  
|  
v  
GET /health  
|  
v  
GET /model  
|  
v  
POST /predict
```

Для проверки используется настоящее PyTorch обучение и настоящийcheckpoint.

## 25. Результаты тестирования

После реализации KP-25 полный набор автоматических тестов ML-serviceсодержит:

`61 тест`

Результат:

```text
61 passed
```

Ошибок и предупреждений при итоговом запуске нет.

## 26. Ограничения

Текущая версия имеет следующие ограничения:

- LSTM является univariate;
- модель использует только историю `quantity`;
- training выполняется на одном ML-service instance;
- training jobs хранятся в оперативной памяти процесса;
- Model Registry использует локальную файловую систему;
- distributed training не реализован;
- автоматическая activation новой модели отсутствует;
- автоматическое сравнение READY-модели с текущей ACTIVE-моделью передactivation пока не выполняется.

Для текущего учебного программного средства данная архитектураобеспечивает полный и контролируемый жизненный цикл ML-модели безизбыточной инфраструктуры.

## 27. Итог

В рамках KP-25 реализован самостоятельный FastAPI ML-service.

Реализованы:

- inference API;
- health check;
- validation входных данных;
- PredictionRuntime;
- production retraining;
- асинхронные training jobs;
- Model Registry;
- model versioning;
- validation новых моделей;
- READY/ACTIVE lifecycle;
- ручная activation;
- hot reload;
- безопасное сохранение текущей модели при ошибке retraining;
- интеграционные тесты реального ML pipeline;
- интеграционные тесты полного HTTP lifecycle.

Таким образом данные, загружаемые администратором в основное приложение,могут использоваться как для формирования актуального прогноза, так идля последующего переобучения production LSTM.