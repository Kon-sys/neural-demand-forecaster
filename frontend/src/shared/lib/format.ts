type DateValue =
    | Date
    | string
    | number

/**
 * Imitates asynchronous API requests in the prototype.
 */
export const delay = (
    ms = 300,
): Promise<void> =>
    new Promise(resolve => {
        setTimeout(
            resolve,
            ms,
        )
    })

const parseDate = (
    value: DateValue,
): Date => {
    return value instanceof Date
        ? new Date(
            value.getTime(),
        )
        : new Date(value)
}

/**
 * Returns ISO date in YYYY-MM-DD format.
 *
 * Examples:
 * isoDay('2026-06-01')
 * isoDay(5, '2026-06-01') -> '2026-06-06'
 */
export const isoDay = (
    value: DateValue =
    new Date(),
    baseDate?: DateValue,
): string => {
    let result: Date

    if (
        typeof value === 'number'
        && baseDate !== undefined
    ) {
        result =
            parseDate(
                baseDate,
            )

        if (
            Number.isNaN(
                result.getTime(),
            )
        ) {
            return ''
        }

        result.setUTCDate(
            result.getUTCDate()
            + value,
        )
    } else {
        result =
            parseDate(value)
    }

    if (
        Number.isNaN(
            result.getTime(),
        )
    ) {
        return ''
    }

    return result
        .toISOString()
        .slice(
            0,
            10,
        )
}

/**
 * Formats a number.
 *
 * number(12500) -> '12 500'
 * number(12.345, 2) -> '12,35'
 * number(15.4, 1) -> '15,4'
 */
export const number = (
    value:
        | number
        | string
        | null
        | undefined,
    fractionDigits?: number,
): string => {
    if (
        value === null
        || value === undefined
        || value === ''
    ) {
        return '—'
    }

    const parsed =
        typeof value === 'number'
            ? value
            : Number(value)

    if (
        !Number.isFinite(
            parsed,
        )
    ) {
        return '—'
    }

    return new Intl.NumberFormat(
        'ru-RU',
        {
            minimumFractionDigits:
                fractionDigits ?? 0,

            maximumFractionDigits:
                fractionDigits ?? 0,
        },
    ).format(parsed)
}

/**
 * Formats date/time.
 *
 * date('2026-06-01') -> '01.06.2026'
 *
 * date(value, {
 *   hour: '2-digit',
 *   minute: '2-digit',
 * }) -> '12:30'
 */
export const date = (
    value:
        | DateValue
        | null
        | undefined,
    options?:
    Intl.DateTimeFormatOptions,
): string => {
    if (
        value === null
        || value === undefined
        || value === ''
    ) {
        return '—'
    }

    const parsed =
        parseDate(value)

    if (
        Number.isNaN(
            parsed.getTime(),
        )
    ) {
        return '—'
    }

    const formatOptions:
        Intl.DateTimeFormatOptions =
        options ?? {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }

    return new Intl.DateTimeFormat(
        'ru-RU',
        {
            ...formatOptions,
            timeZone: 'UTC',
        },
    ).format(parsed)
}

/**
 * Formats date for charts.
 *
 * shortDate('2026-06-01') -> '01.06'
 */
export const shortDate = (
    value:
        | DateValue
        | null
        | undefined,
): string => {
    if (
        value === null
        || value === undefined
        || value === ''
    ) {
        return '—'
    }

    const parsed =
        parseDate(value)

    if (
        Number.isNaN(
            parsed.getTime(),
        )
    ) {
        return '—'
    }

    return new Intl.DateTimeFormat(
        'ru-RU',
        {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'UTC',
        },
    ).format(parsed)
}

/**
 * Russian pluralization for forecast horizon.
 *
 * days(1)  -> '1 день'
 * days(2)  -> '2 дня'
 * days(5)  -> '5 дней'
 * days(14) -> '14 дней'
 * days(21) -> '21 день'
 */
export const days = (
    value:
        | number
        | null
        | undefined,
): string => {
    if (
        value === null
        || value === undefined
        || !Number.isFinite(value)
    ) {
        return '—'
    }

    const amount =
        Math.trunc(value)

    const absolute =
        Math.abs(amount)

    const mod10 =
        absolute % 10

    const mod100 =
        absolute % 100

    let word = 'дней'

    if (
        mod10 === 1
        && mod100 !== 11
    ) {
        word = 'день'
    } else if (
        mod10 >= 2
        && mod10 <= 4
        && (
            mod100 < 12
            || mod100 > 14
        )
    ) {
        word = 'дня'
    }

    return `${number(amount)} ${word}`
}