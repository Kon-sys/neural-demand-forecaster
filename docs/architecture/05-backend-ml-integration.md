# Интеграция Spring Backend и FastAPI ML Service

## 1. Назначение

В рамках KP-26 реализована интеграция основного Spring Backend с
FastAPI ML-service.

Основной Backend отвечает за:

- аутентификацию пользователя;
- работу с товарами;
- хранение истории продаж;
- создание прогнозов;
- хранение результатов прогнозирования;
- обращение к ML-service;
- обработку ошибок ML-service.

FastAPI ML-service отвечает за непосредственный LSTM inference.


## 2. Общая архитектура

Интеграция имеет следующий вид:

```text
Frontend
   |
   v
Spring Backend :8080
   |
   +----------------------+
   |                      |
   v                      v
PostgreSQL          FastAPI ML Service :8001
   |                      |
   |                      v
   |                PredictionRuntime
   |                      |
   |                      v
   |                     LSTM
   |
   v
forecasts
forecast_values
```

Frontend не обращается к ML-service напрямую.

Все пользовательские операции выполняются через Spring Backend.


## 3. Ответственность Spring Backend

Spring Backend выполняет следующие действия:

1. получает запрос авторизованного пользователя;
2. определяет пользователя из JWT;
3. проверяет существование товара;
4. проверяет состояние ML-service;
5. получает размер входного окна модели;
6. формирует историю продаж товара;
7. восстанавливает отсутствующие календарные дни значением `0`;
8. отправляет историю в ML-service;
9. получает прогноз;
10. сохраняет результат в PostgreSQL.


## 4. Forecast API

Добавлен REST API:

```text
POST /api/v1/forecasts
GET  /api/v1/forecasts/{forecastId}
```

Для обоих endpoint требуется авторизация.


## 5. Создание прогноза

Для создания прогноза используется:

```http
POST /api/v1/forecasts
```

Пример тела запроса:

```json
{
  "productId": 20,
  "forecastHorizon": 7
}
```

Поля:

- `productId` — идентификатор товара;
- `forecastHorizon` — число будущих календарных дней.

Допустимый горизонт:

```text
1..365 дней
```


## 6. Пользователь прогноза

Идентификатор пользователя не передаётся клиентом в JSON.

Он определяется из JWT-аутентификации.

Security layer создаёт `AuthenticatedUser`, содержащий:

- `id`;
- `email`;
- `role`.

При создании прогноза используется идентификатор текущего
авторизованного пользователя.

Это исключает возможность создать прогноз от имени другого пользователя
путём изменения request body.


## 7. Использование истории продаж

LSTM использует фиксированное временное окно.

Размер окна Spring Backend получает из:

```http
GET /health
```

ML-service.

Для текущей модели:

```text
window_size = 14
```

Backend определяет дату последней продажи товара и формирует последние
14 календарных дней.


## 8. Отсутствующие даты

В базе данных запись продажи может отсутствовать для календарного дня.

В прогнозировании такой день интерпретируется как:

```text
quantity = 0
```

Например, если в базе:

```text
2026-01-01 -> 10
2026-01-02 -> запись отсутствует
2026-01-03 -> 8
```

то вход для модели содержит:

```text
10, 0, 8
```

Такое поведение соответствует preprocessing pipeline ML-service.


## 9. Проверка достаточности истории

Для прогнозирования требуется не менее одного полного LSTM window
календарной истории.

Для текущей модели:

```text
14 календарных дней
```

Если история товара короче требуемого интервала, Backend возвращает:

```text
HTTP 422
INSUFFICIENT_SALES_HISTORY
```

Это предотвращает отправку некорректного входа в ML-service.


## 10. ML Health Check

Перед началом прогнозирования Backend вызывает:

```http
GET /health
```

Проверяются:

- `model_loaded`;
- `scalers_loaded`;
- `window_size`;
- `active_model_version`.

Если модель или scaler registry не готовы, прогноз не запускается.


## 11. ML Prediction Contract

Backend вызывает:

```http
POST /predict
```

Пример запроса:

```json
{
  "product_sku": "SKU-A",
  "history": [
    10,
    12,
    8,
    0,
    9,
    11,
    13,
    8,
    7,
    10,
    12,
    11,
    9,
    8
  ],
  "last_observation_date": "2026-09-24"
}
```

Пример ответа:

```json
{
  "product_sku": "SKU-A",
  "prediction": 9.42,
  "model": "lstm",
  "model_version": "20260924T120001Z-a1b2c3d4",
  "window_size": 14,
  "history_points_used": 14,
  "forecast_date": "2026-09-25"
}
```


## 12. Валидация ответа ML-service

Spring Backend не доверяет ответу ML-service без проверки.

Проверяются:

- SKU;
- конечность значения прогноза;
- отсутствие отрицательного значения;
- размер LSTM window;
- дата следующего прогноза;
- model version.

Некорректный ответ приводит к ошибке:

```text
ML_INVALID_RESPONSE
```


## 13. Фиксация версии модели

В момент начала прогнозирования Backend фиксирует:

```text
model_version
```

активной модели.

Все точки одного прогноза должны быть рассчитаны одной и той же
версией модели.

Если во время многошагового прогнозирования ML-service переключился на
другую модель, Backend обнаруживает изменение версии и прекращает
операцию.

Возвращается:

```text
ML_MODEL_CHANGED_DURING_FORECAST
```

Это предотвращает ситуацию, когда один прогноз частично рассчитан
разными версиями LSTM.


## 14. Многошаговый прогноз

ML-service выполняет one-step inference.

Для получения прогноза на несколько дней Spring Backend использует
рекурсивную стратегию.

Для горизонта `H`:

```text
История(t-13 ... t)
        |
        v
      LSTM
        |
        v
 prediction(t+1)
        |
        v
История(t-12 ... t, prediction(t+1))
        |
        v
      LSTM
        |
        v
 prediction(t+2)
```

Процесс продолжается до достижения заданного
`forecastHorizon`.


## 15. Recursive Forecast

После каждого прогноза:

1. самое старое значение удаляется из history;
2. новый predicted quantity добавляется в конец;
3. обновляется `last_observation_date`;
4. выполняется следующий вызов `/predict`.

Например:

```text
Исходное окно:

1 2 3 ... 13 14

Прогноз:

15.5

Следующее окно:

2 3 4 ... 14 15.5
```

Таким образом можно получить прогноз произвольного горизонта при
one-step LSTM.


## 16. Ограничение recursive forecasting

При увеличении горизонта часть входной последовательности постепенно
начинает состоять из предыдущих прогнозов модели.

Поэтому ошибка может накапливаться.

Это является известной особенностью recursive multi-step forecasting,
а не ошибкой реализации.

В текущем проекте данный подход выбран потому, что исследованная LSTM
была зафиксирована как one-step модель.


## 17. Хранение прогноза

Для хранения используется существующая таблица:

```text
forecasts
```

В ней сохраняются:

- пользователь;
- товар;
- горизонт;
- версия модели;
- статус;
- timestamps;
- ошибка выполнения при наличии.


## 18. Значения прогноза

Каждая точка хранится в:

```text
forecast_values
```

Поля:

- `forecast_id`;
- `forecast_date`;
- `predicted_quantity`.

Для одной даты внутри одного прогноза допускается только одно значение.


## 19. Статусы прогноза

Используются существующие состояния:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

Жизненный цикл:

```text
PENDING
   |
   v
PROCESSING
   |
   +------> COMPLETED
   |
   +------> FAILED
```


## 20. PENDING

Состояние устанавливается при создании записи прогноза.

На этом этапе прогноз зарегистрирован в базе данных, но вычисление ещё
не завершено.


## 21. PROCESSING

После начала обращения к ML-service прогноз переводится в:

```text
PROCESSING
```

Также фиксируется:

```text
started_at
```


## 22. COMPLETED

После успешного получения всех прогнозных точек:

- значения сохраняются в `forecast_values`;
- прогноз переводится в `COMPLETED`;
- сохраняется `completed_at`.


## 23. FAILED

Если в процессе прогнозирования возникает ошибка:

- прогноз получает статус `FAILED`;
- сохраняется `completed_at`;
- причина записывается в `error_message`.

Длина сообщения ограничивается длиной поля базы данных.


## 24. Метрики MAE, RMSE и MAPE

В таблице `forecasts` предусмотрены:

```text
mae
rmse
mape
```

При создании прогноза будущего они остаются:

```text
NULL
```

Это корректно, поскольку в момент прогнозирования фактические значения
будущего спроса ещё неизвестны.

MAE, RMSE и MAPE могут быть рассчитаны только после появления реальных
продаж за прогнозный период.

Validation-метрики ML-модели не записываются в эти поля как ошибка
конкретного будущего прогноза.


## 25. Обработка ошибок ML-service

Spring Backend преобразует ошибки ML-service в контролируемые API
ошибки.

Основные случаи:

```text
ML_SERVICE_UNAVAILABLE
ML_SERVICE_NOT_READY
ML_FORECAST_REJECTED
ML_INVALID_RESPONSE
ML_SERVICE_ERROR
ML_MODEL_CHANGED_DURING_FORECAST
```


## 26. ML_SERVICE_UNAVAILABLE

Возвращается, когда:

- FastAPI не запущен;
- соединение невозможно установить;
- ML-service возвращает `503`.


## 27. ML_FORECAST_REJECTED

Используется, если ML-service отклоняет входные данные через:

```text
400
422
```

Backend преобразует такой ответ в контролируемую ошибку своей REST API.


## 28. Конфигурация подключения

В `application.yml` добавлена секция:

```yaml
app:
  ml:
    base-url: ${ML_SERVICE_URL:http://localhost:8001}
    connect-timeout: ${ML_SERVICE_CONNECT_TIMEOUT:2s}
    read-timeout: ${ML_SERVICE_READ_TIMEOUT:10s}
```

Таким образом адрес ML-service и timeout не зашиты в Java-код.


## 29. RestClient

Для HTTP-интеграции используется Spring:

```text
RestClient
```

Создан отдельный bean:

```text
mlRestClient
```

Он имеет:

- отдельный `baseUrl`;
- connection timeout;
- read timeout.


## 30. Разделение ответственности

Интеграция не переносит ML-логику в Java Backend.

Spring Backend не:

- загружает PyTorch checkpoint;
- выполняет scaling;
- запускает LSTM;
- выполняет inverse scaling.

Эти операции остаются внутри Python ML-service.

Spring Backend занимается orchestration и бизнес-логикой.


## 31. Безопасность API

Forecast API не открыт анонимным пользователям.

Глобальная SecurityConfig требует аутентификацию для всех endpoint,
которые явно не объявлены как публичные.

Следовательно:

```text
/api/v1/forecasts/**
```

доступен только аутентифицированному пользователю.


## 32. Доступ к сохранённым прогнозам

Получение прогноза выполняется через:

```http
GET /api/v1/forecasts/{forecastId}
```

Repository ищет прогноз одновременно по:

```text
forecast_id
user_id
```

Поэтому обычный пользователь не может получить сохранённый прогноз
другого пользователя только путём изменения ID в URL.


## 33. Тестирование ForecastService

Unit test проверяет реальный orchestration flow сервиса.

Проверяется:

- загрузка 14 исторических значений;
- вызов ML-service;
- recursive forecasting;
- сдвиг временного окна;
- использование предыдущего прогноза как следующего input;
- формирование трёх прогнозных точек;
- переход в `COMPLETED`.


## 34. Тестирование ML Client

HTTP integration test использует локальный тестовый HTTP server.

Проверяется реальный JSON HTTP contract:

```text
Spring MlForecastClient
        |
        v
GET /health

Spring MlForecastClient
        |
        v
POST /predict
```

Также проверено преобразование `503` от ML-service в:

```text
ML_SERVICE_UNAVAILABLE
```


## 35. Тестирование ForecastController

Controller test проверяет:

- получение `userId` из authenticated principal;
- десериализацию request body;
- HTTP 201;
- структуру JSON response;
- передачу запроса в ForecastService.


## 36. Результаты тестирования

После реализации KP-26 backend test suite содержит:

```text
6 tests
```

Результат:

```text
Tests run: 6
Failures: 0
Errors: 0
Skipped: 0

BUILD SUCCESS
```

Предупреждение Mockito о dynamic Java agent не является ошибкой тестов
и не влияет на текущий результат выполнения.


## 37. Итог

В рамках KP-26 реализована полноценная интеграция Spring Backend с
FastAPI ML-service.

Реализованы:

- Forecast domain;
- JPA mapping существующих таблиц;
- ForecastRepository;
- ForecastValueRepository;
- Forecast DTO;
- ML HTTP client;
- конфигурация RestClient;
- получение model health;
- one-step ML inference;
- recursive multi-step forecast;
- восстановление пропущенных календарных дат;
- контроль model version;
- хранение forecast lifecycle;
- сохранение прогнозных значений;
- обработка ошибок ML-service;
- REST Forecast API;
- unit tests;
- HTTP integration tests;
- controller tests.

Spring Backend и FastAPI ML-service теперь образуют единый рабочий
контур прогнозирования потребительского спроса.