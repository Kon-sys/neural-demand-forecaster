# Спецификация REST API

## 1. Назначение документа

Документ определяет REST API программного средства прогнозирования потребительского спроса.

Спецификация охватывает взаимодействие:

- Frontend → Backend;
- Backend → ML-сервис.

Документ фиксирует основные endpoint, структуры запросов и ответов, правила авторизации, HTTP-коды и единый формат ошибок.

## 2. Общие правила Backend API

Базовый путь:

    /api/v1

Основным форматом структурированных данных является:

    application/json

Для импорта CSV используется:

    multipart/form-data

Даты должны передаваться в формате ISO 8601.

Пример даты:

    2026-09-18

Пример даты и времени:

    2026-09-18T14:30:00Z

## 3. Авторизация запросов

Защищённые endpoint используют:

    Authorization: Bearer <JWT>

Backend должен самостоятельно проверять:

- наличие JWT;
- корректность JWT;
- срок действия;
- роль пользователя.

Отсутствие или некорректность токена приводит к:

    401 Unauthorized

Недостаточные права:

    403 Forbidden

## 4. API регистрации

### POST /api/v1/auth/register

Создаёт пользователя с ролью `USER`.

Запрос:

    {
      "name": "Ivan Ivanov",
      "email": "ivan@example.com",
      "password": "StrongPassword123"
    }

Успешный ответ:

    201 Created

    {
      "id": 15,
      "name": "Ivan Ivanov",
      "email": "ivan@example.com",
      "role": "USER"
    }

Возможные ошибки:

- `400 Bad Request` — некорректные данные;
- `409 Conflict` — пользователь уже существует.

## 5. API авторизации

### POST /api/v1/auth/login

Запрос:

    {
      "email": "ivan@example.com",
      "password": "StrongPassword123"
    }

Ответ:

    200 OK

    {
      "accessToken": "<jwt>",
      "tokenType": "Bearer",
      "user": {
        "id": 15,
        "name": "Ivan Ivanov",
        "email": "ivan@example.com",
        "role": "USER"
      }
    }

Неверные данные:

    401 Unauthorized

Для MVP отдельный Backend endpoint `logout` не требуется, поскольку JWT используется без серверной HTTP-сессии.

Выход выполняется удалением клиентом локальных данных авторизации.

## 6. Получение текущего пользователя

### GET /api/v1/auth/me

Назначение:

- восстановление пользовательской сессии после загрузки Frontend;
- получение актуальной роли и данных пользователя.

Требуется JWT.

Ответ:

    200 OK

    {
      "id": 15,
      "name": "Ivan Ivanov",
      "email": "ivan@example.com",
      "role": "USER"
    }

## 7. Products API

### GET /api/v1/products

Доступ:

    USER
    ADMIN

Назначение:

получение списка товаров.

Параметры:

    search
    page
    size

Пример ответа:

    {
      "items": [
        {
          "id": 42,
          "sku": "SKU-00042",
          "name": "Товар 42",
          "category": "Категория A"
        }
      ],
      "page": 0,
      "size": 20,
      "totalElements": 1,
      "totalPages": 1
    }

### GET /api/v1/products/{id}

Доступ:

    USER
    ADMIN

Возвращает отдельный товар.

### POST /api/v1/products

Доступ:

    ADMIN

Запрос:

    {
      "sku": "SKU-00042",
      "name": "Товар 42",
      "category": "Категория A"
    }

Ответ:

    201 Created

### PUT /api/v1/products/{id}

Доступ:

    ADMIN

Изменяет существующий товар.

### DELETE /api/v1/products/{id}

Доступ:

    ADMIN

Удаляет товар при отсутствии ограничений целостности.

Возможные ответы:

- `204 No Content`;
- `404 Not Found`;
- `409 Conflict`.

## 8. Sales API

### GET /api/v1/sales

Доступ:

    USER
    ADMIN

Параметры:

    productId
    dateFrom
    dateTo
    page
    size

Пример:

    GET /api/v1/sales?productId=42&dateFrom=2026-01-01&dateTo=2026-06-30&page=0&size=50

Ответ:

    {
      "items": [
        {
          "id": 1001,
          "productId": 42,
          "date": "2026-01-01",
          "quantity": 125
        }
      ],
      "page": 0,
      "size": 50,
      "totalElements": 180,
      "totalPages": 4
    }

## 9. CSV Import API

### POST /api/v1/sales/import

Доступ:

    ADMIN

Content-Type:

    multipart/form-data

Поле:

    file

Пример результата:

    {
      "totalRows": 1000,
      "importedRows": 970,
      "skippedRows": 30,
      "errors": [
        {
          "row": 15,
          "code": "UNKNOWN_PRODUCT",
          "message": "Товар с SKU SKU-999 не найден"
        }
      ]
    }

Возможные ответы:

- `200 OK`;
- `400 Bad Request`;
- `413 Payload Too Large`;
- `422 Unprocessable Entity`.

## 10. Формат CSV

Окончательный формат должен быть зафиксирован перед реализацией импорта.

Минимально необходимы:

    product_sku
    date
    quantity

Пример:

    product_sku,date,quantity
    SKU-00042,2026-01-01,125
    SKU-00042,2026-01-02,130

Если структура файла не соответствует контракту, импорт должен завершаться контролируемой ошибкой.

## 11. Forecast API

### POST /api/v1/forecasts

Доступ:

    USER
    ADMIN

Назначение:

построение нового прогноза.

Запрос:

    {
      "productId": 42,
      "forecastHorizon": 14
    }

Backend:

1. проверяет товар;
2. получает продажи;
3. проверяет достаточность данных;
4. вызывает ML `/predict`;
5. сохраняет Forecast;
6. сохраняет ForecastValue;
7. возвращает результат.

Для MVP используется синхронный сценарий REST-вызова.

Frontend отображает состояние загрузки во время выполнения запроса.

Ответ:

    201 Created

    {
      "id": 501,
      "product": {
        "id": 42,
        "sku": "SKU-00042",
        "name": "Товар 42"
      },
      "forecastHorizon": 14,
      "createdAt": "2026-09-18T14:30:00Z",
      "modelVersion": "lstm-1.0.0",
      "values": [
        {
          "date": "2026-09-19",
          "value": 126.4
        },
        {
          "date": "2026-09-20",
          "value": 130.1
        }
      ],
      "metrics": {
        "mae": 8.2,
        "rmse": 10.4,
        "mape": 6.8
      }
    }

Возможные ошибки:

- `400` — некорректный горизонт;
- `404` — товар не найден;
- `422` — недостаточно истории;
- `502` — ошибка ML-сервиса;
- `503` — ML-сервис недоступен.

## 12. Получение отдельного прогноза

### GET /api/v1/forecasts/{id}

Доступ:

    USER
    ADMIN

Возвращает:

- товар;
- пользователя;
- дату запуска;
- горизонт;
- версию модели;
- ForecastValue;
- метрики;
- данные, необходимые для визуализации.

Ответ:

    200 OK

## 13. История прогнозов

### GET /api/v1/forecasts

Доступ:

    USER
    ADMIN

Параметры:

    productId
    dateFrom
    dateTo
    page
    size

Пример:

    GET /api/v1/forecasts?productId=42&page=0&size=20

Ответ:

    {
      "items": [
        {
          "id": 501,
          "productId": 42,
          "productName": "Товар 42",
          "forecastHorizon": 14,
          "createdAt": "2026-09-18T14:30:00Z",
          "modelVersion": "lstm-1.0.0"
        }
      ],
      "page": 0,
      "size": 20,
      "totalElements": 1,
      "totalPages": 1
    }

## 14. Backend Health Check

### GET /api/v1/health

Назначение:

техническая проверка Backend.

Endpoint не должен раскрывать секретную конфигурацию.

Пример:

    {
      "status": "UP"
    }

## 15. ML API

ML-сервис имеет отдельный внутренний API.

Frontend не обращается к нему напрямую.

### GET /health

Проверяет состояние ML-сервиса.

Пример:

    {
      "status": "UP",
      "modelLoaded": true,
      "modelVersion": "lstm-1.0.0"
    }

### POST /predict

Вызывается Backend.

Логический запрос:

    {
      "requestId": "6a26df31-9e62-4c27-82d1-82a9c4f8a530",
      "forecastHorizon": 14,
      "series": [
        {
          "date": "2026-08-01",
          "value": 120
        },
        {
          "date": "2026-08-02",
          "value": 125
        }
      ]
    }

Если модели необходимы дополнительные признаки, контракт может быть расширен после экспериментального этапа.

Успешный ответ:

    {
      "requestId": "6a26df31-9e62-4c27-82d1-82a9c4f8a530",
      "modelVersion": "lstm-1.0.0",
      "predictions": [
        {
          "date": "2026-09-19",
          "value": 126.4
        },
        {
          "date": "2026-09-20",
          "value": 130.1
        }
      ]
    }

## 16. Ошибки ML API

Основные коды:

    INVALID_INPUT
    INSUFFICIENT_HISTORY
    MODEL_NOT_LOADED
    PREPROCESSING_ERROR
    INFERENCE_ERROR
    INTERNAL_ERROR

Пример:

    {
      "code": "INSUFFICIENT_HISTORY",
      "message": "Недостаточно исторических данных"
    }

Backend должен преобразовывать ML-ошибку в соответствующую прикладную API-ошибку.

## 17. Единый формат ошибок Backend

Все Backend endpoint должны использовать единый формат.

Пример:

    {
      "code": "VALIDATION_ERROR",
      "message": "Переданные данные содержат ошибки",
      "details": [
        {
          "field": "forecastHorizon",
          "message": "Значение должно быть больше нуля"
        }
      ],
      "timestamp": "2026-09-18T14:30:00Z",
      "path": "/api/v1/forecasts"
    }

Поля:

| Поле | Назначение |
| --- | --- |
| code | Стабильный программный код ошибки |
| message | Понятное описание |
| details | Дополнительные сведения |
| timestamp | Время |
| path | Endpoint |

`details` может отсутствовать, если дополнительная информация не требуется.

## 18. Основные коды ошибок

Рекомендуемые программные коды:

    VALIDATION_ERROR
    INVALID_CREDENTIALS
    UNAUTHORIZED
    ACCESS_DENIED
    RESOURCE_NOT_FOUND
    USER_ALREADY_EXISTS
    SKU_ALREADY_EXISTS
    PRODUCT_IN_USE
    CSV_INVALID_FORMAT
    CSV_VALIDATION_ERROR
    FILE_TOO_LARGE
    INSUFFICIENT_HISTORY
    ML_SERVICE_UNAVAILABLE
    ML_PREDICTION_ERROR
    INTERNAL_ERROR

## 19. HTTP-коды

| HTTP | Назначение |
| --- | --- |
| 200 | Успешное получение или операция |
| 201 | Ресурс создан |
| 204 | Успешная операция без тела ответа |
| 400 | Ошибка структуры или параметров запроса |
| 401 | Пользователь не авторизован |
| 403 | Недостаточно прав |
| 404 | Ресурс не найден |
| 409 | Конфликт данных |
| 413 | Превышен размер файла |
| 422 | Данные синтаксически допустимы, но непригодны для операции |
| 500 | Внутренняя ошибка Backend |
| 502 | Ошибка ответа зависимого компонента |
| 503 | Зависимый компонент недоступен |

## 20. Пагинация

Списковые endpoint должны использовать единообразные параметры:

    page
    size

Нумерация страниц начинается с:

    0

Формат:

    {
      "items": [],
      "page": 0,
      "size": 20,
      "totalElements": 0,
      "totalPages": 0
    }

## 21. Валидация

Frontend-валидация используется только для удобства.

Backend является окончательной точкой проверки данных.

Backend должен проверять:

- обязательные поля;
- типы;
- диапазоны значений;
- существование ресурсов;
- права доступа;
- бизнес-ограничения.

## 22. Timeout взаимодействия с ML

Backend должен использовать timeout при вызове `/predict`.

Точное значение определяется после измерения реального inference.

Timeout должен задаваться через конфигурацию, а не жёстко фиксироваться в бизнес-коде.

## 23. Retry

Автоматический retry не должен применяться к ошибкам данных.

Ограниченный повтор может использоваться только для явно временных сетевых ошибок, если это будет обосновано на этапе реализации.

Для MVP обязательным требованием retry не является.

## 24. Версионирование API

Backend API использует:

    /api/v1

Несовместимое изменение публичного контракта должно приводить к созданию новой версии API.

## 25. Swagger / OpenAPI

После реализации Backend REST API должен быть доступен через Swagger/OpenAPI.

Документация должна отражать фактически реализованные endpoint и DTO.

FastAPI автоматически формирует OpenAPI-документацию ML-сервиса.

## 26. Результат

Спецификация определяет контракт между Frontend, Backend и ML-сервисом.

На её основе возможно независимо реализовывать компоненты системы при сохранении согласованных:

- endpoint;
- DTO;
- HTTP-кодов;
- правил авторизации;
- структуры ошибок.