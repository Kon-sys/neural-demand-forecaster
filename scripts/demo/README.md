# Demo data preparation

Этот набор скриптов создаёт воспроизводимую демонстрационную среду для приложения Demand Forecast.

## Что создаётся

По умолчанию:

- 8 подразделений;
- 24 должности;
- 52 демонстрационных сотрудника;
- существующие реальные ADMIN-аккаунты сохраняются;
- 48 товаров;
- 8 товарных категорий;
- 730 календарных дней продаж для каждого товара;
- 35 040 строк `sales`;
- полный ежедневный ряд без пропущенных дат;
- `sales.csv`, который одновременно подходит для production training ML-service.

Продажи не являются случайным белым шумом. Генератор моделирует:

- базовый спрос товара;
- недельный профиль;
- плавный долгосрочный тренд;
- категорийную сезонность;
- промо-периоды;
- редкие дефициты/аномальные всплески;
- небольшой шум;
- более чистый последний месяц для репрезентативного forecast window.

Генератор использует фиксированный seed, поэтому при одинаковых параметрах данные воспроизводимы.

## Безопасность reset

`reset-and-seed.ps1` удаляет application data:

- forecast_values;
- forecasts;
- sales;
- products;
- обычных пользователей;
- старые demo users;
- positions;
- departments.

При этом:

- schema не удаляется;
- Flyway history не удаляется;
- реальные ADMIN-пользователи сохраняются;
- сохранённые ADMIN временно отвязываются от старой должности и затем привязываются к новой должности `Системный администратор`, если это возможно.

Все автоматически созданные demo users имеют `DEMO_HASH_NOT_FOR_AUTH` и **не предназначены для входа**. Авторизация выполняется существующим реальным ADMIN или bootstrap-admin.

## 1. Подготовка PostgreSQL

Должен существовать:

```text
database/.env
```

на основе `database/.env.example`.

Docker Desktop должен быть запущен.

## 2. Reset + заполнение базы

Из корня проекта:

```powershell
.\scripts\demo\reset-and-seed.ps1
```

Скрипт попросит ввести:

```text
RESET
```

Для автоматического запуска:

```powershell
.\scripts\demo\reset-and-seed.ps1 -Force
```

Можно задать последний день истории и длину ряда:

```powershell
.\scripts\demo\reset-and-seed.ps1 `
    -EndDate "2026-09-26" `
    -Days 730 `
    -Seed 20260927
```

Generated files создаются в:

```text
scripts/demo/generated/
```

и игнорируются локальным `.gitignore` этого каталога.

## 3. Что проверить после seed

Скрипт автоматически выводит:

- количество сущностей;
- пользователей по ролям/статусам;
- диапазон дат продаж;
- покрытие категорий;
- continuity series.

Ожидаемо:

```text
products            48
sales               35040
series_with_gaps    0
min_days             730
max_days             730
```

Количество users может быть больше 52, потому что реальные ADMIN-аккаунты сохраняются.

## 4. Production training

После seed файл:

```text
scripts/demo/generated/sales.csv
```

соответствует ML contract:

```csv
product_sku,date,quantity
```

Запусти ML-service на canonical локальном порту `8001`, затем:

```powershell
.\scripts\demo\train-and-activate.ps1
```

Скрипт:

1. проверит `/health`;
2. отправит `sales.csv` в `POST /training/start`;
3. дождётся завершения job;
4. покажет реальные validation metrics;
5. активирует новую model version;
6. проверит `/model`.

Обученная production model не заменяет научный frozen KP-24 TEST experiment. Это отдельная runtime model для application data.

## 5. Почему прогноз должен стать стабильнее

Backend использует последние 14 календарных дней продаж как input window. Новый dataset содержит непрерывную ежедневную историю, а production LSTM обучается на тех же товарных рядах и диапазонах значений.

Это устраняет ситуацию, когда новая SKU прогнозируется bootstrap FreshRetail-моделью, которая никогда не обучалась на текущем диапазоне application sales.

## 6. Следующий этап

После активации production model необходимо создать настоящую историю Forecast через Backend API, а не вставлять fake forecast rows SQL-скриптом.

Следующий скрипт должен:

- авторизоваться реальным ADMIN/USER;
- выбрать несколько товаров;
- создать 7/14/30-day forecasts через `POST /api/v1/forecasts`;
- оставить результаты в PostgreSQL;
- проверить history/dashboard.

## 7. Optional cleanup of old local datasets

The application demo dataset is generated under `scripts/demo/generated/` and is intentionally separated from the frozen academic FreshRetail experiment.

After verifying that the FreshRetail files are present, old M5/test/synthetic local artifacts can be removed with:

```powershell
.\scripts\demo\cleanup-local-datasets.ps1
```

The cleanup script does **not** touch:

- `datasets/raw/freshretail/`;
- `datasets/processed/freshretail_sales_daily.csv`;
- `datasets/processed/freshretail_selected_series.csv`;
- `datasets/examples/`.

It removes only old local M5, tiny backend test data, the previous synthetic dataset, and empty `downloads/private` folders.
