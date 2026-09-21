# Database

## 1. Назначение

Каталог `database` содержит реализацию PostgreSQL-схемы программного средства прогнозирования потребительского спроса.

База данных используется для хранения:

- пользователей;
- подразделений;
- должностей;
- товаров;
- исторических данных продаж;
- запусков прогнозирования;
- результатов прогнозирования.

В качестве СУБД используется PostgreSQL 16.

Для локального запуска используется Docker Compose.

---

# 2. Структура

```text
database/
├── migrations/
│   ├── V001__create_departments.sql
│   ├── V002__create_positions.sql
│   ├── V003__create_users.sql
│   ├── V004__create_products.sql
│   ├── V005__create_sales.sql
│   ├── V006__create_forecasts.sql
│   ├── V007__create_forecast_values.sql
│   └── V008__add_updated_at_triggers.sql
│
├── seeds/
│   ├── V100__seed_organization.sql
│   └── V110__seed_demo_data.sql
│
├── verification/
│   ├── verify_schema.sql
│   └── test_constraints.sql
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

# 3. Полный запуск базы данных на новом устройстве

Этот раздел описывает полный сценарий развёртывания базы данных после клонирования проекта на новое устройство.

После выполнения инструкции будут:

- запущен PostgreSQL 16;
- создана база данных проекта;
- применены все миграции;
- созданы таблицы, индексы, ограничения и триггеры;
- добавлена организационная структура;
- при необходимости добавлены демонстрационные данные;
- выполнена проверка корректности схемы.

## 3.1. Требования

На устройстве должны быть установлены:

- Git;
- Docker Desktop;
- Docker Compose.

Проверить установку:

```bash
git --version
docker --version
docker compose version
```

Docker Desktop должен быть запущен.

Проверить работу Docker:

```bash
docker info
```

Если команда выводит информацию о Docker Client и Docker Server, Docker готов к работе.

---

## 3.2. Клонирование репозитория

Клонировать проект:

```bash
git clone <URL_РЕПОЗИТОРИЯ>
```

Перейти в каталог проекта:

```bash
cd <ИМЯ_РЕПОЗИТОРИЯ>
```

Если основная рабочая ветка проекта — `develop`:

```bash
git switch develop
git pull
```

Все дальнейшие команды выполняются из корня проекта.

---

## 3.3. Создание локального файла конфигурации

В репозитории уже находится пример конфигурации:

```text
database/.env.example
```

Необходимо создать локальный файл:

```text
database/.env
```

### macOS / Linux

```bash
cp database/.env.example database/.env
```

### Windows PowerShell

```powershell
Copy-Item database/.env.example database/.env
```

Открыть созданный файл:

```text
database/.env
```

Пример содержимого:

```dotenv
POSTGRES_DB=demand_forecast
POSTGRES_USER=forecast_app
POSTGRES_PASSWORD=change_me
POSTGRES_PORT=5432
```

При необходимости пароль или порт можно изменить.

Файл `database/.env` является локальным и не должен добавляться в Git.

---

## 3.4. Запуск PostgreSQL

Запустить Docker Desktop.

После этого из корня проекта выполнить:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  up -d
```

Проверить состояние контейнера:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  ps
```

Контейнер PostgreSQL должен перейти в состояние:

```text
healthy
```

Проверить подключение к PostgreSQL:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  exec postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version();"'
```

При успешном запуске будет выведена версия PostgreSQL.

---

## 3.5. Применение миграций

После первого запуска PostgreSQL база ещё не содержит таблиц приложения.

Для создания структуры необходимо применить все миграции из каталога:

```text
database/migrations/
```

Выполнить:

```bash
for file in database/migrations/*.sql; do
  echo "Applying $file"

  docker compose \
    --env-file database/.env \
    -f database/docker-compose.yml \
    exec -T postgres sh -c \
    'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    < "$file" || break
done
```

Миграции применяются последовательно:

```text
V001__create_departments.sql
V002__create_positions.sql
V003__create_users.sql
V004__create_products.sql
V005__create_sales.sql
V006__create_forecasts.sql
V007__create_forecast_values.sql
V008__add_updated_at_triggers.sql
```

Параметр:

```text
ON_ERROR_STOP=1
```

останавливает выполнение при первой SQL-ошибке.

---

## 3.6. Проверка созданных таблиц

После применения миграций выполнить:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  exec postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
```

Должны существовать таблицы:

```text
departments
positions
users
products
sales
forecasts
forecast_values
```

---

## 3.7. Заполнение организационной структуры

Для создания начальных подразделений и должностей выполнить:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < database/seeds/V100__seed_organization.sql
```

После выполнения seed-файла в базе будут созданы тестовые подразделения и связанные с ними должности.

---

## 3.8. Загрузка демонстрационных данных

Для локальной разработки можно заполнить базу демонстрационными данными:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < database/seeds/V110__seed_demo_data.sql
```

Будут добавлены:

- демонстрационные пользователи;
- товары;
- исторические данные продаж;
- демонстрационный прогноз;
- прогнозируемые значения.

Демонстрационные пользователи содержат тестовое значение:

```text
DEMO_HASH_NOT_FOR_AUTH
```

в поле `password_hash`.

Оно не предназначено для реальной авторизации.

---

## 3.9. Проверка заполненной базы данных

Выполнить:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < database/verification/verify_schema.sql
```

Для стандартного набора демонстрационных данных ожидается примерно:

```text
departments      = 3
positions        = 7
users            = 2
products         = 2
sales            = 14
forecasts        = 1
forecast_values  = 7
```

Если данные отображаются корректно, база готова к использованию приложением.

---

## 3.10. Проверка ограничений базы данных

Дополнительно можно проверить работу ограничений:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < database/verification/test_constraints.sql
```

При успешной проверке в выводе должно появиться:

```text
ALL KP-14 DATABASE CONSTRAINT TESTS PASSED
```

Проверочные данные не остаются в базе, поскольку тест завершается через `ROLLBACK`.

---

## 3.11. Остановка базы данных

Для остановки PostgreSQL выполнить:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  down
```

Данные при этом сохраняются в Docker Volume.

При следующем запуске:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  up -d
```

повторно применять миграции и seed-файлы не требуется.

---

## 3.12. Полное удаление локальной базы данных

Если необходимо полностью удалить локальную базу и создать её заново:

```bash
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  down -v
```

ВНИМАНИЕ: команда удаляет Docker Volume и все локальные данные PostgreSQL.

После этого необходимо повторить шаги:

```text
1. Запустить PostgreSQL.
2. Применить миграции V001–V008.
3. Выполнить V100__seed_organization.sql.
4. При необходимости выполнить V110__seed_demo_data.sql.
5. Выполнить verify_schema.sql.
```

---

## 3.13. Краткий запуск с нуля

После клонирования репозитория на новое устройство последовательность выглядит следующим образом:

```bash
# 1. Создать локальный .env
cp database/.env.example database/.env

# 2. Запустить PostgreSQL
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  up -d

# 3. Применить все миграции
for file in database/migrations/*.sql; do
  docker compose \
    --env-file database/.env \
    -f database/docker-compose.yml \
    exec -T postgres sh -c \
    'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    < "$file" || break
done

# 4. Создать организационную структуру
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < database/seeds/V100__seed_organization.sql

# 5. Добавить демонстрационные данные
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < database/seeds/V110__seed_demo_data.sql

# 6. Проверить состояние базы
docker compose \
  --env-file database/.env \
  -f database/docker-compose.yml \
  exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < database/verification/verify_schema.sql
```

После выполнения этих команд локальная PostgreSQL-база полностью создана, заполнена демонстрационными данными и готова к дальнейшей разработке.