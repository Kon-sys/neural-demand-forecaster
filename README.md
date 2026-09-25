# Программное средство прогнозирования потребительского спроса

Курсовой проект по теме:

**«Проектирование и разработка программного средства прогнозирования потребительского спроса на основе нейросетевых моделей»**

Система предназначена для хранения и анализа данных о продажах товаров, формирования прогнозов потребительского спроса с использованием нейросетевой модели LSTM и управления связанными бизнес-данными через веб-интерфейс.

---

## 1. Возможности системы

Приложение поддерживает:

- регистрацию и авторизацию пользователей;
- аутентификацию по JWT;
- роли `USER` и `ADMIN`;
- блокировку и разблокировку пользователей;
- редактирование профиля;
- загрузку и удаление аватара;
- управление подразделениями;
- управление должностями;
- назначение должности пользователю;
- управление товарами;
- просмотр истории продаж;
- импорт продаж из CSV;
- валидацию импортируемых данных;
- формирование прогноза спроса;
- прогнозирование на несколько дней вперёд;
- сохранение результатов прогнозирования;
- просмотр истории прогнозов;
- Dashboard с данными приложения;
- разграничение доступа между пользователем и администратором;
- управление версиями ML-модели на уровне ML-service.

---

## 2. Архитектура системы

Система состоит из четырёх основных компонентов:

- Frontend;
- Backend;
- PostgreSQL;
- ML-service.

Схема взаимодействия:

```text
Frontend
React + TypeScript + Vite
        |
        | REST / JSON
        v
Backend
Java 21 + Spring Boot
        |
        |--------------------------|
        |                          |
        v                          v
PostgreSQL                    ML-service
Flyway                        Python + FastAPI
                              PyTorch + LSTM
```

Frontend не взаимодействует с ML-service напрямую.

Все пользовательские запросы проходят через Backend.

При формировании прогноза Backend:

1. проверяет пользователя;
2. проверяет товар;
3. получает историю продаж из PostgreSQL;
4. проверяет достаточность истории;
5. обращается к ML-service;
6. получает прогноз;
7. сохраняет прогноз и прогнозные значения в PostgreSQL;
8. возвращает результат Frontend.

Повторный просмотр уже сформированного прогноза выполняется из базы данных без повторного запуска модели.

---

## 3. Технологический стек

### Frontend

- React;
- TypeScript;
- Vite;
- React Router;
- Recharts;
- Lucide React;
- Motion;
- CSS;
- REST API.

### Backend

- Java 21;
- Spring Boot 4.1.1;
- Spring Web;
- Spring Security;
- Spring Data JPA;
- Bean Validation;
- PostgreSQL;
- Flyway;
- JWT;
- Spring Boot Actuator;
- Cloudinary;
- Maven.

### ML-service

- Python;
- FastAPI;
- Uvicorn;
- PyTorch;
- pandas;
- NumPy;
- scikit-learn;
- pytest.

### База данных

- PostgreSQL;
- Flyway migrations.

---

## 4. Структура репозитория

```text
.
├── backend/
│   ├── src/main/java/
│   │   └── com/demandforecast/
│   │       ├── auth/
│   │       ├── common/
│   │       ├── config/
│   │       ├── forecast/
│   │       ├── health/
│   │       ├── organization/
│   │       ├── product/
│   │       ├── sales/
│   │       ├── storage/
│   │       └── user/
│   └── pom.xml
│
├── database/
│   └── migrations/
│
├── datasets/
│   ├── raw/
│   └── processed/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── entities/
│   │   ├── features/
│   │   ├── pages/
│   │   └── shared/
│   └── package.json
│
├── ml-service/
│   ├── src/
│   │   └── demand_forecast_ml/
│   ├── tests/
│   └── .venv/
│
└── README.md
```

---

## 5. Модель данных

Основные сущности системы:

```text
User
 └── Position
      └── Department

Product
 └── Sales

User
 └── Forecast
      └── ForecastValue

Product
 └── Forecast
```

Основные таблицы PostgreSQL:

```text
departments
positions
users
products
sales
forecasts
forecast_values
```

Структура базы данных создаётся и обновляется автоматически при запуске Backend с помощью Flyway.

SQL-миграции находятся в:

```text
database/migrations
```

---

## 6. Требования для запуска

На компьютере должны быть установлены:

```text
Java 21
PostgreSQL
Node.js
npm
Python
Git
```

Для ML-service используется виртуальное окружение:

```text
ml-service/.venv
```

---

## 7. Настройка PostgreSQL

Для локальной разработки используется база:

```text
demand_forecast
```

Рекомендуемый пользователь:

```text
forecast_app
```

Пример создания:

```sql
CREATE USER forecast_app
WITH PASSWORD 'replace-with-local-password';

CREATE DATABASE demand_forecast
OWNER forecast_app;
```

После первого запуска Backend Flyway самостоятельно создаст необходимые таблицы.

---

## 8. Переменные окружения Backend

Шаблон располагается в:

```text
backend/.env.example
```

Файл `.env.example` является документацией и не содержит реальные секреты.

Spring Boot не загружает `.env.example` автоматически.

Переменные необходимо задавать через:

- конфигурацию запуска IDE;
- PowerShell;
- системные переменные окружения;
- конфигурацию среды развёртывания.

Основные переменные:

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
```

Для локальной конфигурации проекта Backend рекомендуется запускать на порту:

```text
8081
```

---

## 9. Настройка Frontend

Создать файл:

```text
frontend/.env.local
```

На основе:

```text
frontend/.env.example
```

Содержимое:

```env
VITE_API_BASE_URL=http://localhost:8081
```

---

## 10. Создание первого администратора

Backend поддерживает автоматическое создание bootstrap-администратора.

Перед первым запуском можно задать:

```text
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_NAME=System Administrator
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=<password>
```

После создания администратора рекомендуется установить:

```text
BOOTSTRAP_ADMIN_ENABLED=false
```

Пароль администратора нельзя хранить в Git.

---

## 11. Запуск ML-service

Из корневого каталога репозитория:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\ml-service\src").Path

.\ml-service\.venv\Scripts\python.exe -m uvicorn `
    demand_forecast_ml.api.app:app `
    --host 127.0.0.1 `
    --port 8000
```

После запуска проверить:

```text
GET http://localhost:8000/health
```

ML-service предоставляет следующие основные endpoints:

```text
GET  /health
POST /predict

POST /training/start
GET  /training/{job_id}

GET  /model
POST /models/{version_id}/activate
```

Для прогнозирования должны быть доступны артефакты обученной модели и scaler registry.

---

## 12. Запуск Backend

Перед запуском должны работать:

```text
PostgreSQL
ML-service
```

Пример локальной настройки переменных PowerShell:

```powershell
$env:POSTGRES_HOST="localhost"
$env:POSTGRES_PORT="5432"
$env:POSTGRES_DB="demand_forecast"
$env:POSTGRES_USER="forecast_app"
$env:POSTGRES_PASSWORD="<database-password>"

$env:SERVER_PORT="8081"

$env:JWT_SECRET_BASE64="<base64-secret>"
$env:JWT_EXPIRATION_MINUTES="60"

$env:BOOTSTRAP_ADMIN_ENABLED="false"

$env:CLOUDINARY_CLOUD_NAME="<cloud-name>"
$env:CLOUDINARY_API_KEY="<api-key>"
$env:CLOUDINARY_API_SECRET="<api-secret>"
```

Запуск:

```powershell
cd ".\backend"

.\mvnw.cmd spring-boot:run
```

Backend будет доступен по адресу:

```text
http://localhost:8081
```

---

## 13. Генерация JWT secret

Для локальной среды можно сгенерировать случайный секрет PowerShell:

```powershell
$bytes = New-Object byte[] 64
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Полученное значение передаётся в:

```text
JWT_SECRET_BASE64
```

Секрет нельзя добавлять в Git.

---

## 14. Запуск Frontend

Установка зависимостей:

```powershell
npm --prefix ".\frontend" install
```

Запуск development-сервера:

```powershell
npm --prefix ".\frontend" run dev
```

После запуска открыть адрес, выведенный Vite в терминале.

---

## 15. Порядок запуска приложения

Рекомендуемый порядок:

```text
1. PostgreSQL
2. ML-service
3. Backend
4. Frontend
```

Общая схема:

```text
Browser
   |
   v
Frontend
   |
   v
Backend
   |------------------|
   v                  v
PostgreSQL         ML-service
```

---

## 16. CSV-импорт продаж

Импорт выполняется пользователем с ролью:

```text
ADMIN
```

CSV должен содержать заголовок:

```csv
product_sku,date,quantity
```

Пример:

```csv
product_sku,date,quantity
TEST-001,2026-09-01,15
TEST-001,2026-09-02,18
TEST-001,2026-09-03,21
```

Backend проверяет:

- существование товара;
- корректность SKU;
- корректность даты;
- корректность количества;
- повторные продажи;
- структуру CSV.

Ошибочные строки возвращаются пользователю в результате импорта и не должны приводить к повреждению корректных данных.

---

## 17. Прогнозирование спроса

Пользователь выбирает:

```text
товар
горизонт прогнозирования
```

Backend получает исторические продажи выбранного товара и передаёт необходимые данные ML-service.

ML-service выполняет inference нейросетевой модели LSTM.

Прогнозные значения сохраняются в:

```text
forecasts
forecast_values
```

Сохранённый прогноз можно повторно открыть без нового запуска модели.

---

## 18. ML-модель

Для прогнозирования используется нейросетевая модель LSTM.

В процессе разработки выполнялось сравнение модели с базовым методом скользящего среднего.

Полученные значения на TEST:

```text
Baseline MA(7)

MAE  = 0.7158199
RMSE = 1.3500138
MAPE = 48.6489
```

```text
LSTM

MAE  = 0.6906854
RMSE = 1.3071027
MAPE = 48.1644
```

Для итогового программного средства используется LSTM.

---

## 19. История прогнозов

Система хранит историю сформированных прогнозов.

Для каждого прогноза сохраняются:

```text
пользователь
товар
SKU
горизонт прогнозирования
версия модели
статус
дата создания
дата завершения
прогнозные значения
```

История пользователя отображается в веб-интерфейсе.

Повторный просмотр сохранённого прогноза выполняется из PostgreSQL.

---

## 20. Пользователи и права

Доступны две роли:

```text
USER
ADMIN
```

### USER

Может:

```text
работать со своим профилем
просматривать товары
просматривать продажи
создавать прогнозы
просматривать свои прогнозы
```

### ADMIN

Дополнительно может:

```text
управлять пользователями
изменять роли
блокировать пользователей
управлять подразделениями
управлять должностями
управлять товарами
импортировать продажи из CSV
```

Система запрещает:

```text
блокировать собственную административную учётную запись
снимать собственную роль ADMIN через управление пользователями
оставлять систему без активного администратора
назначать несуществующую должность
назначать неактивную должность
```

---

## 21. Организационная структура

Администратор может управлять:

```text
подразделениями
должностями
```

Каждая должность относится к определённому подразделению.

Для подразделений и должностей поддерживаются:

```text
создание
редактирование
активация
деактивация
```

Организационная структура используется при назначении пользователей.

---

## 22. Аватары

Изображения профиля сохраняются через Cloudinary.

Поддерживаются:

```text
JPEG
PNG
WebP
```

Максимальный размер загружаемого файла задаётся конфигурацией Backend.

---

## 23. Тестирование Backend

Из корня проекта:

```powershell
cd ".\backend"

.\mvnw.cmd test

cd ..
```

На момент финальной проверки:

```text
Tests run: 10
Failures: 0
Errors: 0
Skipped: 0
```

---

## 24. Тестирование ML-service

Из корня проекта:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\ml-service\src").Path

.\ml-service\.venv\Scripts\python.exe -m pytest ".\ml-service\tests"
```

На момент финальной проверки:

```text
61 passed
```

---

## 25. Проверка Frontend

Production build:

```powershell
npm --prefix ".\frontend" run build
```

Lint:

```powershell
npm --prefix ".\frontend" run lint
```

---

## 26. Полная техническая проверка

```powershell
cd ".\backend"
.\mvnw.cmd test
cd ..

$env:PYTHONPATH = (Resolve-Path ".\ml-service\src").Path
.\ml-service\.venv\Scripts\python.exe -m pytest ".\ml-service\tests"

npm --prefix ".\frontend" run build
npm --prefix ".\frontend" run lint

git diff --check
```

Ожидаемый результат:

```text
Backend tests       PASS
ML tests            PASS
Frontend build      PASS
Frontend lint       PASS
git diff --check    PASS
```

---

## 27. Демонстрационный сценарий

Для демонстрации приложения рекомендуется выполнить следующие действия:

1. запустить PostgreSQL;
2. запустить ML-service;
3. запустить Backend;
4. запустить Frontend;
5. выполнить вход под пользователем с ролью ADMIN;
6. открыть управление пользователями;
7. показать управление ролями и блокировкой;
8. открыть организационную структуру;
9. показать подразделения и должности;
10. открыть список товаров;
11. создать или выбрать товар;
12. импортировать историю продаж из CSV;
13. открыть историю продаж;
14. сформировать прогноз;
15. показать график прогнозных значений;
16. открыть историю прогнозов;
17. повторно открыть сохранённый прогноз;
18. открыть Dashboard;
19. продемонстрировать ограничения роли USER.

---

## 28. Безопасность

В репозиторий запрещено добавлять:

```text
реальные пароли
JWT secret
Cloudinary API secret
локальные .env-файлы
токены доступа
credentials PostgreSQL
```

В Git должны храниться только безопасные шаблоны:

```text
.env.example
```

---

## 29. Состояние проекта

Реализированы основные подсистемы:

```text
Authentication             READY
Profile                    READY
Products                   READY
Sales                      READY
CSV Import                 READY
Forecasting                READY
Forecast History           READY
Dashboard                  READY
User Management            READY
Organization Management    READY
RBAC                       READY
ML-service                 READY
PostgreSQL persistence     READY
```

Программное средство готово к интеграционному тестированию, демонстрации и дальнейшему оформлению курсового проекта.
