from __future__ import annotations

import argparse
import csv
import json
import math
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

DEMO_DOMAIN = "demo.demand.local"
INVALID_PASSWORD_HASH = "DEMO_HASH_NOT_FOR_AUTH"
DEFAULT_SEED = 20260927
DEFAULT_DAYS = 730


@dataclass(frozen=True)
class PositionSpec:
    department: str
    name: str


@dataclass(frozen=True)
class DemoUser:
    name: str
    email_local: str
    department: str
    position: str
    status: str = "ACTIVE"


@dataclass(frozen=True)
class ProductSpec:
    sku: str
    name: str
    category: str
    base_demand: float
    annual_trend: float
    seasonal_amplitude: float
    seasonal_peak_day: int
    weekly_factors: tuple[float, float, float, float, float, float, float]
    noise_sigma: float


DEPARTMENTS = (
    "Коммерческий отдел",
    "Отдел закупок",
    "Отдел маркетинга",
    "Отдел логистики",
    "Отдел аналитики",
    "Финансовый отдел",
    "ИТ-отдел",
    "Администрация",
)

POSITIONS: tuple[PositionSpec, ...] = (
    PositionSpec("Коммерческий отдел", "Коммерческий директор"),
    PositionSpec("Коммерческий отдел", "Менеджер по продажам"),
    PositionSpec("Коммерческий отдел", "Менеджер по работе с ключевыми клиентами"),
    PositionSpec("Отдел закупок", "Руководитель отдела закупок"),
    PositionSpec("Отдел закупок", "Специалист по закупкам"),
    PositionSpec("Отдел закупок", "Категорийный менеджер"),
    PositionSpec("Отдел маркетинга", "Руководитель отдела маркетинга"),
    PositionSpec("Отдел маркетинга", "Маркетолог"),
    PositionSpec("Отдел маркетинга", "CRM-специалист"),
    PositionSpec("Отдел логистики", "Руководитель логистики"),
    PositionSpec("Отдел логистики", "Логист"),
    PositionSpec("Отдел логистики", "Координатор склада"),
    PositionSpec("Отдел аналитики", "Руководитель аналитики"),
    PositionSpec("Отдел аналитики", "Data Analyst"),
    PositionSpec("Отдел аналитики", "Data Scientist"),
    PositionSpec("Финансовый отдел", "Финансовый директор"),
    PositionSpec("Финансовый отдел", "Финансовый аналитик"),
    PositionSpec("Финансовый отдел", "Бухгалтер"),
    PositionSpec("ИТ-отдел", "Руководитель ИТ"),
    PositionSpec("ИТ-отдел", "Системный администратор"),
    PositionSpec("ИТ-отдел", "Backend Developer"),
    PositionSpec("ИТ-отдел", "Frontend Developer"),
    PositionSpec("Администрация", "Операционный директор"),
    PositionSpec("Администрация", "Офис-менеджер"),
)

USERS: tuple[DemoUser, ...] = (
    DemoUser("Александр Морозов", "alexander.morozov", "Коммерческий отдел", "Коммерческий директор"),
    DemoUser("Екатерина Лебедева", "ekaterina.lebedeva", "Коммерческий отдел", "Менеджер по продажам"),
    DemoUser("Максим Соколов", "maxim.sokolov", "Коммерческий отдел", "Менеджер по продажам"),
    DemoUser("Анна Волкова", "anna.volkova", "Коммерческий отдел", "Менеджер по работе с ключевыми клиентами"),
    DemoUser("Илья Кузнецов", "ilya.kuznetsov", "Коммерческий отдел", "Менеджер по продажам"),
    DemoUser("Мария Попова", "maria.popova", "Коммерческий отдел", "Менеджер по работе с ключевыми клиентами"),
    DemoUser("Дмитрий Орлов", "dmitry.orlov", "Отдел закупок", "Руководитель отдела закупок"),
    DemoUser("София Павлова", "sofia.pavlova", "Отдел закупок", "Специалист по закупкам"),
    DemoUser("Артём Семёнов", "artem.semenov", "Отдел закупок", "Категорийный менеджер"),
    DemoUser("Полина Виноградова", "polina.vinogradova", "Отдел закупок", "Специалист по закупкам"),
    DemoUser("Никита Богданов", "nikita.bogdanov", "Отдел закупок", "Категорийный менеджер"),
    DemoUser("Алина Козлова", "alina.kozlova", "Отдел закупок", "Специалист по закупкам", "BLOCKED"),
    DemoUser("Виктория Новикова", "victoria.novikova", "Отдел маркетинга", "Руководитель отдела маркетинга"),
    DemoUser("Егор Фёдоров", "egor.fedorov", "Отдел маркетинга", "Маркетолог"),
    DemoUser("Дарья Михайлова", "daria.mikhailova", "Отдел маркетинга", "CRM-специалист"),
    DemoUser("Роман Беляев", "roman.belyaev", "Отдел маркетинга", "Маркетолог"),
    DemoUser("Ксения Тихонова", "ksenia.tikhonova", "Отдел маркетинга", "CRM-специалист"),
    DemoUser("Михаил Комаров", "mikhail.komarov", "Отдел маркетинга", "Маркетолог", "BLOCKED"),
    DemoUser("Алексей Жуков", "alexey.zhukov", "Отдел логистики", "Руководитель логистики"),
    DemoUser("Ольга Васильева", "olga.vasilieva", "Отдел логистики", "Логист"),
    DemoUser("Кирилл Николаев", "kirill.nikolaev", "Отдел логистики", "Координатор склада"),
    DemoUser("Юлия Захарова", "yulia.zakharova", "Отдел логистики", "Логист"),
    DemoUser("Сергей Макаров", "sergey.makarov", "Отдел логистики", "Координатор склада"),
    DemoUser("Елена Андреева", "elena.andreeva", "Отдел логистики", "Логист"),
    DemoUser("Иван Григорьев", "ivan.grigoriev", "Отдел аналитики", "Руководитель аналитики"),
    DemoUser("Наталья Романова", "natalia.romanova", "Отдел аналитики", "Data Analyst"),
    DemoUser("Павел Крылов", "pavel.krylov", "Отдел аналитики", "Data Analyst"),
    DemoUser("Анастасия Миронова", "anastasia.mironova", "Отдел аналитики", "Data Scientist"),
    DemoUser("Владислав Фомин", "vladislav.fomin", "Отдел аналитики", "Data Scientist"),
    DemoUser("Марина Алексеева", "marina.alekseeva", "Отдел аналитики", "Data Analyst"),
    DemoUser("Олег Дмитриев", "oleg.dmitriev", "Отдел аналитики", "Data Analyst", "BLOCKED"),
    DemoUser("Татьяна Фролова", "tatiana.frolova", "Финансовый отдел", "Финансовый директор"),
    DemoUser("Денис Ковалёв", "denis.kovalev", "Финансовый отдел", "Финансовый аналитик"),
    DemoUser("Вероника Зайцева", "veronika.zaitseva", "Финансовый отдел", "Бухгалтер"),
    DemoUser("Андрей Баранов", "andrey.baranov", "Финансовый отдел", "Финансовый аналитик"),
    DemoUser("Людмила Куликова", "lyudmila.kulikova", "Финансовый отдел", "Бухгалтер"),
    DemoUser("Глеб Соловьёв", "gleb.soloviev", "Финансовый отдел", "Финансовый аналитик"),
    DemoUser("Арсений Наумов", "arseniy.naumov", "ИТ-отдел", "Руководитель ИТ"),
    DemoUser("Ирина Киселёва", "irina.kiseleva", "ИТ-отдел", "Системный администратор"),
    DemoUser("Степан Тарасов", "stepan.tarasov", "ИТ-отдел", "Backend Developer"),
    DemoUser("Валерия Федотова", "valeria.fedotova", "ИТ-отдел", "Frontend Developer"),
    DemoUser("Георгий Щербаков", "georgy.scherbakov", "ИТ-отдел", "Backend Developer"),
    DemoUser("Диана Маслова", "diana.maslova", "ИТ-отдел", "Frontend Developer"),
    DemoUser("Руслан Ершов", "ruslan.ershov", "ИТ-отдел", "Системный администратор", "BLOCKED"),
    DemoUser("Вадим Соболев", "vadim.sobolev", "Администрация", "Операционный директор"),
    DemoUser("Светлана Егорова", "svetlana.egorova", "Администрация", "Офис-менеджер"),
    DemoUser("Лев Марков", "lev.markov", "Администрация", "Офис-менеджер"),
    DemoUser("Надежда Осипова", "nadezhda.osipova", "Администрация", "Офис-менеджер"),
    DemoUser("Константин Сафонов", "konstantin.safonov", "Коммерческий отдел", "Менеджер по продажам"),
    DemoUser("Елизавета Карпова", "elizaveta.karpova", "Отдел маркетинга", "Маркетолог"),
    DemoUser("Борис Данилов", "boris.danilov", "Отдел аналитики", "Data Analyst"),
    DemoUser("Алёна Трофимова", "alena.trofimova", "Отдел закупок", "Специалист по закупкам"),
)


def weekly(mon: float, tue: float, wed: float, thu: float, fri: float, sat: float, sun: float):
    return (mon, tue, wed, thu, fri, sat, sun)


PRODUCTS: tuple[ProductSpec, ...] = (
    ProductSpec("BEV-WATER-001", "Вода питьевая 1,5 л", "Напитки", 128, 0.05, 0.23, 200, weekly(.91,.94,.97,1.00,1.08,1.17,1.11), .055),
    ProductSpec("BEV-COLA-001", "Напиток Cola 1 л", "Напитки", 104, 0.06, 0.28, 205, weekly(.88,.92,.96,1.01,1.11,1.23,1.16), .065),
    ProductSpec("BEV-JUICE-001", "Сок апельсиновый 1 л", "Напитки", 72, 0.04, 0.18, 185, weekly(.94,.96,.99,1.01,1.06,1.12,1.08), .060),
    ProductSpec("BEV-ENERGY-001", "Энергетический напиток 0,45 л", "Напитки", 61, 0.08, 0.17, 210, weekly(.86,.91,.96,1.02,1.15,1.28,1.12), .080),
    ProductSpec("BEV-TEA-001", "Чай холодный лимон 1 л", "Напитки", 58, 0.05, 0.24, 198, weekly(.91,.94,.98,1.01,1.09,1.18,1.12), .070),
    ProductSpec("BEV-COFFEE-001", "Кофейный напиток 0,25 л", "Напитки", 43, 0.07, 0.11, 170, weekly(.96,.98,1.00,1.03,1.08,1.10,1.04), .075),

    ProductSpec("DAI-MILK-001", "Молоко 3,2% 1 л", "Молочная продукция", 136, 0.03, 0.06, 150, weekly(.98,.99,1.00,1.00,1.03,1.08,1.05), .045),
    ProductSpec("DAI-KEFIR-001", "Кефир 2,5% 1 л", "Молочная продукция", 84, 0.02, 0.05, 145, weekly(.98,.99,1.00,1.00,1.02,1.06,1.04), .050),
    ProductSpec("DAI-YOGURT-001", "Йогурт клубничный 125 г", "Молочная продукция", 96, 0.04, 0.08, 170, weekly(.95,.97,.99,1.00,1.04,1.10,1.07), .060),
    ProductSpec("DAI-CHEESE-001", "Сыр твёрдый 200 г", "Молочная продукция", 52, 0.04, 0.08, 340, weekly(.96,.98,1.00,1.01,1.06,1.12,1.08), .060),
    ProductSpec("DAI-CURD-001", "Творог 5% 200 г", "Молочная продукция", 63, 0.03, 0.05, 140, weekly(.99,1.00,1.00,1.00,1.03,1.06,1.04), .050),
    ProductSpec("DAI-BUTTER-001", "Масло сливочное 180 г", "Молочная продукция", 49, 0.03, 0.07, 350, weekly(.96,.98,.99,1.00,1.05,1.10,1.07), .055),

    ProductSpec("GRO-RICE-001", "Рис длиннозёрный 900 г", "Бакалея", 48, 0.03, 0.10, 20, weekly(.97,.98,.99,1.00,1.04,1.08,1.05), .060),
    ProductSpec("GRO-PASTA-001", "Макароны спагетти 450 г", "Бакалея", 62, 0.04, 0.08, 25, weekly(.96,.98,.99,1.00,1.04,1.09,1.06), .060),
    ProductSpec("GRO-BUCKWHEAT-001", "Крупа гречневая 800 г", "Бакалея", 54, 0.03, 0.11, 35, weekly(.97,.98,1.00,1.01,1.04,1.08,1.05), .055),
    ProductSpec("GRO-FLOUR-001", "Мука пшеничная 2 кг", "Бакалея", 39, 0.02, 0.18, 350, weekly(.95,.97,.99,1.00,1.05,1.12,1.08), .065),
    ProductSpec("GRO-OIL-001", "Масло подсолнечное 1 л", "Бакалея", 45, 0.03, 0.07, 40, weekly(.98,.99,1.00,1.00,1.03,1.07,1.05), .050),
    ProductSpec("GRO-SUGAR-001", "Сахар 1 кг", "Бакалея", 58, 0.02, 0.20, 350, weekly(.95,.97,.99,1.00,1.06,1.12,1.08), .065),

    ProductSpec("SNK-CHIPS-001", "Чипсы картофельные 140 г", "Снеки", 81, 0.06, 0.16, 205, weekly(.83,.88,.93,1.00,1.16,1.34,1.20), .080),
    ProductSpec("SNK-NUTS-001", "Арахис жареный 150 г", "Снеки", 57, 0.05, 0.12, 200, weekly(.87,.91,.95,1.00,1.13,1.28,1.17), .075),
    ProductSpec("SNK-CRACKERS-001", "Крекеры солёные 180 г", "Снеки", 44, 0.04, 0.09, 195, weekly(.90,.93,.96,1.00,1.10,1.20,1.13), .070),
    ProductSpec("SNK-POPCORN-001", "Попкорн карамельный 100 г", "Снеки", 36, 0.07, 0.11, 190, weekly(.82,.87,.92,1.00,1.18,1.39,1.24), .090),
    ProductSpec("SNK-BAR-001", "Злаковый батончик 40 г", "Снеки", 69, 0.08, 0.07, 160, weekly(.98,1.00,1.01,1.02,1.05,1.07,.95), .070),
    ProductSpec("SNK-CRISP-001", "Хлебцы цельнозерновые 100 г", "Снеки", 41, 0.06, 0.05, 120, weekly(1.01,1.02,1.02,1.01,1.00,.98,.94), .060),

    ProductSpec("CON-CHOC-001", "Шоколад молочный 90 г", "Кондитерские изделия", 86, 0.05, 0.30, 355, weekly(.90,.93,.96,1.00,1.09,1.20,1.14), .075),
    ProductSpec("CON-CANDY-001", "Конфеты шоколадные 200 г", "Кондитерские изделия", 63, 0.04, 0.36, 355, weekly(.89,.92,.95,1.00,1.10,1.22,1.15), .080),
    ProductSpec("CON-COOKIE-001", "Печенье овсяное 300 г", "Кондитерские изделия", 55, 0.03, 0.18, 345, weekly(.94,.96,.98,1.00,1.06,1.14,1.09), .065),
    ProductSpec("CON-WAFFLE-001", "Вафли сливочные 200 г", "Кондитерские изделия", 48, 0.03, 0.16, 350, weekly(.94,.96,.98,1.00,1.06,1.13,1.08), .065),
    ProductSpec("CON-MARSH-001", "Зефир ванильный 250 г", "Кондитерские изделия", 37, 0.04, 0.22, 350, weekly(.93,.95,.97,1.00,1.07,1.16,1.10), .070),
    ProductSpec("CON-CAKE-001", "Мини-кекс шоколадный 120 г", "Кондитерские изделия", 46, 0.06, 0.25, 350, weekly(.91,.94,.97,1.00,1.09,1.19,1.12), .075),

    ProductSpec("FRZ-PIZZA-001", "Пицца замороженная 350 г", "Замороженные продукты", 42, 0.06, 0.08, 40, weekly(.82,.87,.92,.98,1.17,1.36,1.22), .085),
    ProductSpec("FRZ-DUMPL-001", "Пельмени 800 г", "Замороженные продукты", 58, 0.03, 0.16, 25, weekly(.90,.93,.96,1.00,1.09,1.19,1.13), .070),
    ProductSpec("FRZ-VEG-001", "Овощная смесь 400 г", "Замороженные продукты", 35, 0.05, 0.12, 45, weekly(.96,.98,.99,1.00,1.04,1.09,1.06), .070),
    ProductSpec("FRZ-BERRY-001", "Ягоды замороженные 300 г", "Замороженные продукты", 29, 0.08, 0.19, 20, weekly(.95,.97,.99,1.00,1.05,1.10,1.07), .085),
    ProductSpec("FRZ-CUTLET-001", "Котлеты куриные 450 г", "Замороженные продукты", 39, 0.05, 0.09, 35, weekly(.91,.94,.97,1.00,1.08,1.17,1.11), .075),
    ProductSpec("FRZ-PANCAKE-001", "Блинчики с творогом 420 г", "Замороженные продукты", 33, 0.04, 0.12, 30, weekly(.92,.95,.97,1.00,1.07,1.15,1.10), .075),

    ProductSpec("HOU-DETERGENT-001", "Гель для стирки 1,5 л", "Бытовая химия", 24, 0.05, 0.05, 100, weekly(.96,.98,1.00,1.00,1.04,1.09,1.07), .085),
    ProductSpec("HOU-DISH-001", "Средство для мытья посуды 450 мл", "Бытовая химия", 31, 0.04, 0.04, 120, weekly(.97,.99,1.00,1.00,1.03,1.07,1.05), .075),
    ProductSpec("HOU-CLEAN-001", "Чистящее средство 500 мл", "Бытовая химия", 27, 0.04, 0.04, 110, weekly(.96,.98,1.00,1.00,1.04,1.08,1.06), .080),
    ProductSpec("HOU-SPONGE-001", "Губки для посуды 5 шт", "Бытовая химия", 21, 0.03, 0.03, 130, weekly(.98,.99,1.00,1.00,1.02,1.05,1.04), .080),
    ProductSpec("HOU-PAPER-001", "Полотенца бумажные 2 рулона", "Бытовая химия", 38, 0.05, 0.03, 150, weekly(.97,.99,1.00,1.00,1.03,1.07,1.05), .070),
    ProductSpec("HOU-BAGS-001", "Пакеты для мусора 30 шт", "Бытовая химия", 19, 0.04, 0.03, 140, weekly(.98,.99,1.00,1.00,1.02,1.05,1.04), .085),

    ProductSpec("PER-SHAMPOO-001", "Шампунь 400 мл", "Личная гигиена", 26, 0.05, 0.05, 125, weekly(.96,.98,1.00,1.01,1.04,1.08,1.05), .080),
    ProductSpec("PER-SOAP-001", "Мыло жидкое 500 мл", "Личная гигиена", 34, 0.04, 0.04, 130, weekly(.97,.99,1.00,1.00,1.03,1.07,1.05), .070),
    ProductSpec("PER-TOOTH-001", "Зубная паста 100 мл", "Личная гигиена", 29, 0.04, 0.03, 145, weekly(.98,.99,1.00,1.00,1.02,1.05,1.04), .075),
    ProductSpec("PER-DEO-001", "Дезодорант 150 мл", "Личная гигиена", 23, 0.07, 0.13, 190, weekly(.95,.97,.99,1.00,1.05,1.10,1.06), .085),
    ProductSpec("PER-GEL-001", "Гель для душа 250 мл", "Личная гигиена", 28, 0.06, 0.08, 185, weekly(.96,.98,1.00,1.01,1.04,1.09,1.05), .080),
    ProductSpec("PER-TISSUE-001", "Салфетки влажные 60 шт", "Личная гигиена", 41, 0.06, 0.06, 175, weekly(.96,.98,1.00,1.01,1.05,1.09,1.06), .070),
)


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def daterange(start: date, end: date) -> Iterable[date]:
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def promotion_windows(rng: random.Random, start: date, end: date) -> list[tuple[date, date, float]]:
    windows: list[tuple[date, date, float]] = []
    cursor = start + timedelta(days=rng.randint(25, 60))
    safe_end = end - timedelta(days=35)
    while cursor <= safe_end:
        length = rng.randint(3, 5)
        factor = rng.uniform(1.16, 1.38)
        windows.append((cursor, cursor + timedelta(days=length - 1), factor))
        cursor += timedelta(days=rng.randint(55, 85))
    return windows


def special_factor(product: ProductSpec, day: date) -> float:
    category = product.category
    if category == "Кондитерские изделия":
        if day.month == 12 and day.day >= 10:
            return 1.18
        if day.month == 2 and 8 <= day.day <= 14:
            return 1.10
        if day.month == 3 and 1 <= day.day <= 8:
            return 1.12
    if category == "Напитки" and day.month in (6, 7, 8):
        return 1.05
    if category == "Снеки" and day.month in (5, 6, 7, 8):
        return 1.04
    if category == "Бытовая химия" and day.day >= 25:
        return 1.05
    if category == "Личная гигиена" and day.month in (3, 12) and 1 <= day.day <= 10:
        return 1.06
    return 1.0


def seasonal_factor(product: ProductSpec, day: date) -> float:
    day_of_year = day.timetuple().tm_yday
    angle = 2.0 * math.pi * ((day_of_year - product.seasonal_peak_day) / 365.25)
    return 1.0 + product.seasonal_amplitude * math.cos(angle)


def generate_sales(product: ProductSpec, start: date, end: date, seed: int) -> list[tuple[str, str, int]]:
    product_seed = seed + sum(ord(ch) for ch in product.sku) * 17
    rng = random.Random(product_seed)
    promotions = promotion_windows(rng, start, end)
    total_days = max((end - start).days, 1)
    rows: list[tuple[str, str, int]] = []

    for current in daterange(start, end):
        progress_years = ((current - start).days / total_days) * (total_days / 365.25)
        trend = 1.0 + product.annual_trend * progress_years
        week = product.weekly_factors[current.weekday()]
        season = seasonal_factor(product, current)
        special = special_factor(product, current)
        promo = 1.0
        for promo_start, promo_end, promo_factor in promotions:
            if promo_start <= current <= promo_end:
                promo = promo_factor
                break

        noise = max(0.72, rng.normalvariate(1.0, product.noise_sigma))
        quantity = product.base_demand * trend * week * season * special * promo * noise

        # Keep the latest month relatively clean so the demo forecast starts
        # from a representative recent window rather than a random stockout.
        if current <= end - timedelta(days=30):
            incident = rng.random()
            if incident < 0.0015:
                quantity = 0.0
            elif incident < 0.006:
                quantity *= rng.uniform(0.25, 0.55)
            elif incident > 0.996:
                quantity *= rng.uniform(1.25, 1.55)

        rows.append((product.sku, current.isoformat(), max(0, int(round(quantity)))))

    return rows


def render_organization_and_users(end_date: date, seed: int) -> str:
    rng = random.Random(seed + 101)
    lines = [
        "-- Generated by scripts/demo/generate_demo_data.py",
        "-- Demo users use a deliberately invalid password hash and cannot authenticate.",
        "BEGIN;",
        "",
        "INSERT INTO departments (name, is_active) VALUES",
    ]
    lines.append(",\n".join(f"    ({sql_literal(name)}, TRUE)" for name in DEPARTMENTS) + "\nON CONFLICT DO NOTHING;\n")

    lines.append("INSERT INTO positions (department_id, name, is_active)")
    lines.append("SELECT d.id, v.position_name, TRUE")
    lines.append("FROM (VALUES")
    lines.append(",\n".join(
        f"    ({sql_literal(item.department)}, {sql_literal(item.name)})" for item in POSITIONS
    ))
    lines.append(") AS v(department_name, position_name)")
    lines.append("JOIN departments d ON LOWER(d.name) = LOWER(v.department_name)")
    lines.append("ON CONFLICT DO NOTHING;\n")

    for index, user in enumerate(USERS):
        created_days_ago = rng.randint(45, 620)
        created_at = datetime.combine(
            end_date - timedelta(days=created_days_ago),
            datetime.min.time(),
            tzinfo=timezone.utc,
        ) + timedelta(hours=rng.randint(7, 17), minutes=rng.randint(0, 59))
        blocked_at = "NULL"
        if user.status == "BLOCKED":
            blocked = datetime.combine(
                end_date - timedelta(days=rng.randint(5, 120)),
                datetime.min.time(),
                tzinfo=timezone.utc,
            ) + timedelta(hours=rng.randint(8, 18), minutes=rng.randint(0, 59))
            blocked_at = sql_literal(blocked.isoformat()) + "::timestamptz"

        email = f"{user.email_local}@{DEMO_DOMAIN}"
        lines.extend([
            "INSERT INTO users (name, email, password_hash, role, status, position_id, blocked_at, created_at, updated_at)",
            "SELECT",
            f"    {sql_literal(user.name)},",
            f"    {sql_literal(email)},",
            f"    {sql_literal(INVALID_PASSWORD_HASH)},",
            "    'USER',",
            f"    {sql_literal(user.status)},",
            "    p.id,",
            f"    {blocked_at},",
            f"    {sql_literal(created_at.isoformat())}::timestamptz,",
            f"    {sql_literal(created_at.isoformat())}::timestamptz",
            "FROM positions p",
            "JOIN departments d ON d.id = p.department_id",
            f"WHERE p.name = {sql_literal(user.position)}",
            f"  AND d.name = {sql_literal(user.department)}",
            f"  AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(BTRIM(u.email)) = LOWER(BTRIM({sql_literal(email)})));",
            "",
        ])

    lines.extend([
        "-- Re-attach any real preserved administrators to the new IT structure.",
        "UPDATE users",
        "SET position_id = (",
        "    SELECT p.id",
        "    FROM positions p",
        "    JOIN departments d ON d.id = p.department_id",
        "    WHERE p.name = 'Системный администратор'",
        "      AND d.name = 'ИТ-отдел'",
        "    LIMIT 1",
        ")",
        f"WHERE role = 'ADMIN' AND email NOT LIKE '%@{DEMO_DOMAIN}' AND position_id IS NULL;",
        "",
        "COMMIT;",
        "",
    ])
    return "\n".join(lines)


def render_products(end_date: date, seed: int) -> str:
    rng = random.Random(seed + 202)
    lines = [
        "-- Generated by scripts/demo/generate_demo_data.py",
        "BEGIN;",
        "",
        "INSERT INTO products (sku, name, category, created_at, updated_at) VALUES",
    ]
    values = []
    for product in PRODUCTS:
        created_at = datetime.combine(
            end_date - timedelta(days=rng.randint(500, 690)),
            datetime.min.time(),
            tzinfo=timezone.utc,
        ) + timedelta(hours=rng.randint(8, 16), minutes=rng.randint(0, 59))
        values.append(
            "    (" + ", ".join([
                sql_literal(product.sku),
                sql_literal(product.name),
                sql_literal(product.category),
                sql_literal(created_at.isoformat()) + "::timestamptz",
                sql_literal(created_at.isoformat()) + "::timestamptz",
            ]) + ")"
        )
    lines.append(",\n".join(values))
    lines.append("ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, updated_at = EXCLUDED.updated_at;")
    lines.extend(["", "COMMIT;", ""])
    return "\n".join(lines)


def write_sales(path: Path, start: date, end: date, seed: int) -> dict[str, object]:
    total_rows = 0
    per_category: dict[str, dict[str, float]] = {}
    per_product: dict[str, dict[str, float]] = {}

    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["product_sku", "date", "quantity"])
        for product in PRODUCTS:
            rows = generate_sales(product, start, end, seed)
            quantities = [row[2] for row in rows]
            writer.writerows(rows)
            total_rows += len(rows)
            per_product[product.sku] = {
                "min": min(quantities),
                "max": max(quantities),
                "average": round(sum(quantities) / len(quantities), 2),
                "latest_14_average": round(sum(quantities[-14:]) / 14, 2),
            }
            cat = per_category.setdefault(product.category, {"sum": 0.0, "count": 0.0})
            cat["sum"] += float(sum(quantities))
            cat["count"] += float(len(quantities))

    category_averages = {
        category: round(values["sum"] / values["count"], 2)
        for category, values in sorted(per_category.items())
    }
    return {
        "rows": total_rows,
        "category_daily_average": category_averages,
        "product_stats": per_product,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate deterministic demo data for Demand Forecast.")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent / "generated")
    parser.add_argument("--end-date", type=date.fromisoformat, default=date.today() - timedelta(days=1))
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.days < 120:
        raise SystemExit("--days must be at least 120 so training and seasonality remain meaningful.")

    output_dir: Path = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    start_date = args.end_date - timedelta(days=args.days - 1)

    organization_path = output_dir / "organization_users.sql"
    products_path = output_dir / "products.sql"
    sales_path = output_dir / "sales.csv"
    manifest_path = output_dir / "manifest.json"

    organization_path.write_text(render_organization_and_users(args.end_date, args.seed), encoding="utf-8")
    products_path.write_text(render_products(args.end_date, args.seed), encoding="utf-8")
    sales_stats = write_sales(sales_path, start_date, args.end_date, args.seed)

    manifest = {
        "generator_version": 1,
        "seed": args.seed,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "date_range": {"from": start_date.isoformat(), "to": args.end_date.isoformat(), "days": args.days},
        "departments": len(DEPARTMENTS),
        "positions": len(POSITIONS),
        "demo_users": len(USERS),
        "blocked_demo_users": sum(1 for user in USERS if user.status == "BLOCKED"),
        "products": len(PRODUCTS),
        "categories": len({product.category for product in PRODUCTS}),
        "sales_rows": sales_stats["rows"],
        "demo_user_domain": DEMO_DOMAIN,
        "sales": sales_stats,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Generated demo dataset in: {output_dir}")
    print(f"Date range: {start_date} .. {args.end_date} ({args.days} days)")
    print(f"Departments: {len(DEPARTMENTS)}")
    print(f"Positions: {len(POSITIONS)}")
    print(f"Demo users: {len(USERS)}")
    print(f"Products: {len(PRODUCTS)}")
    print(f"Sales rows: {sales_stats['rows']}")
    print(f"Training CSV: {sales_path}")


if __name__ == "__main__":
    main()
