import {
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import {
    BriefcaseBusiness,
    Building2,
    Camera,
    LockKeyhole,
    Mail,
    ShieldCheck,
    Trash2,
    UserRound,
} from 'lucide-react'
import {
    useProfile,
} from '@/features/profile/model/useProfile'
import {
    ApiError,
} from '@/shared/api/api-error'
import {
    useStore,
} from '@/app/store-context'
import {
    Button,
} from '@/components/ui/button'
import {
    Badge,
    Field,
    PageHeader,
    SectionTitle,
} from '@/components/ui/primitives'

const MAX_AVATAR_FILE_SIZE =
    2 * 1024 * 1024

const SUPPORTED_AVATAR_TYPES =
    new Set([
        'image/jpeg',
        'image/png',
        'image/webp',
    ])

export function ProfilePage() {
    const {
        user,
    } = useProfile()

    if (!user) {
        return null
    }

    return (
        <ProfileContent
            key={user.id}
        />
    )
}

function ProfileContent() {
    const {
        user,
        updateProfile,
        uploadAvatar,
        deleteAvatar,
    } = useProfile()

    const {
        notify,
    } = useStore()

    const fileInputRef =
        useRef<HTMLInputElement>(
            null,
        )

    const [
        name,
        setName,
    ] = useState(
        user?.name ?? '',
    )

    const [
        email,
        setEmail,
    ] = useState(
        user?.email ?? '',
    )

    const [
        busy,
        setBusy,
    ] = useState(false)

    const [
        avatarBusy,
        setAvatarBusy,
    ] = useState(false)

    const [
        errors,
        setErrors,
    ] = useState<
        Record<string, string>
    >({})

    if (!user) {
        return null
    }

    const departmentName =
        user.departmentName
        ?? 'Не назначено'

    const positionName =
        user.positionName
        ?? 'Не назначено'

    async function handleAvatarChange(
        event:
        ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target.files?.[0]

        event.target.value = ''

        if (!file) {
            return
        }

        if (
            !SUPPORTED_AVATAR_TYPES
                .has(file.type)
        ) {
            setErrors(
                current => ({
                    ...current,
                    avatar:
                        'Выберите изображение в формате JPG, PNG или WebP',
                }),
            )

            return
        }

        if (
            file.size >
            MAX_AVATAR_FILE_SIZE
        ) {
            setErrors(
                current => ({
                    ...current,
                    avatar:
                        '� азмер изображения не должен превышать 2 МБ',
                }),
            )

            return
        }

        setAvatarBusy(true)

        try {
            await uploadAvatar(
                file,
            )

            setErrors(
                current => {
                    const next = {
                        ...current,
                    }

                    delete next.avatar

                    return next
                },
            )

            notify(
                'Фотография профиля обновлена',
            )
        } catch (error) {
            const message =
                error instanceof ApiError
                    ? error.message
                    : 'Не удалось загрузить изображение'

            setErrors(
                current => ({
                    ...current,
                    avatar: message,
                }),
            )
        } finally {
            setAvatarBusy(false)
        }
    }

    async function removeAvatar() {
        setAvatarBusy(true)

        try {
            await deleteAvatar()

            setErrors(
                current => {
                    const next = {
                        ...current,
                    }

                    delete next.avatar

                    return next
                },
            )

            notify(
                'Фотография профиля удалена',
            )
        } catch (error) {
            notify(
                error instanceof ApiError
                    ? error.message
                    : 'Не удалось удалить фотографию',
            )
        } finally {
            setAvatarBusy(false)
        }
    }

    async function submit(
        event: FormEvent,
    ) {
        event.preventDefault()

        const next:
            Record<string, string> =
            {}

        if (!name.trim()) {
            next.name =
                'Укажите имя пользователя'
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(
                    email.trim(),
                )
        ) {
            next.email =
                'Введите корректный адрес электронной почты'
        }

        setErrors(next)

        if (
            Object.keys(next).length
        ) {
            return
        }

        setBusy(true)

        try {
            await updateProfile({
                name: name.trim(),
                email: email.trim(),
            })

            notify(
                'Профиль обновлён',
            )
        } catch (error) {
            if (
                error instanceof ApiError
                && error.code ===
                'EMAIL_ALREADY_EXISTS'
            ) {
                setErrors({
                    email:
                        'Пользователь с такой почтой уже существует',
                })
            } else {
                notify(
                    error instanceof ApiError
                        ? error.message
                        : 'Не удалось обновить профиль',
                )
            }
        } finally {
            setBusy(false)
        }
    }

    const initials =
        user.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(
                part => part[0],
            )
            .join('')
            .toUpperCase()

    const dirty =
        name !== user.name
        || email !== user.email

    return (
        <>
            <PageHeader
                eyebrow="УЧЁТНАЯ ЗАПИСЬ"
                title="Профиль"
                description="Личные данные и рабочая информация вашей учётной записи."
            />

            <div className="profile-layout">
                <aside className="profile-summary">
                    <div
                        className="profile-avatar-large"
                        aria-label="Фотография профиля"
                    >
                        {user.avatarUrl
                            ? (
                                <img
                                    src={
                                        user.avatarUrl
                                    }
                                    alt="Фотография профиля"
                                />
                            )
                            : (
                                initials
                                || (
                                    <UserRound
                                        size={28}
                                    />
                                )
                            )}
                    </div>

                    <div className="profile-avatar-actions">
                        <input
                            ref={fileInputRef}
                            className="sr-only"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={
                                handleAvatarChange
                            }
                        />

                        <Button
                            type="button"
                            variant="secondary"
                            disabled={
                                avatarBusy
                                || busy
                            }
                            onClick={() =>
                                fileInputRef
                                    .current
                                    ?.click()
                            }
                        >
                            <Camera size={16} />

                            {avatarBusy
                                ? 'Загружаем...'
                                : user.avatarUrl
                                    ? 'Заменить фото'
                                    : 'Загрузить фото'}
                        </Button>

                        {user.avatarUrl && (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={
                                    avatarBusy
                                    || busy
                                }
                                onClick={
                                    removeAvatar
                                }
                            >
                                <Trash2
                                    size={16}
                                />
                                Удалить
                            </Button>
                        )}
                    </div>

                    {errors.avatar && (
                        <p
                            className="field-error"
                            role="alert"
                        >
                            {errors.avatar}
                        </p>
                    )}

                    <p className="profile-avatar-hint">
                        JPG, PNG или WebP,
                        до 2 МБ.
                    </p>

                    <div className="profile-summary-title">
                        <h2>
                            {user.name}
                        </h2>

                        <p>
                            {positionName}
                        </p>
                    </div>

                    <Badge tone="neutral">
                        {user.role ===
                        'ADMIN'
                            ? 'Администратор'
                            : 'Пользователь'}
                    </Badge>

                    <dl className="profile-detail-list">
                        <div>
                            <dt>
                                <Mail size={15} />
                                Почта
                            </dt>

                            <dd>
                                {user.email}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                <Building2
                                    size={15}
                                />
                                Подразделение
                            </dt>

                            <dd>
                                {departmentName}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                <BriefcaseBusiness
                                    size={15}
                                />
                                Должность
                            </dt>

                            <dd>
                                {positionName}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                <ShieldCheck
                                    size={15}
                                />
                                Доступ
                            </dt>

                            <dd>
                                {user.role ===
                                'ADMIN'
                                    ? '� асширенный'
                                    : 'Стандартный'}
                            </dd>
                        </div>
                    </dl>

                    <p className="profile-summary-note">
                        � оль, статус учётной записи,
                        должность и подразделение
                        назначаются администратором
                        системы.
                    </p>
                </aside>

                <form
                    className="profile-form"
                    onSubmit={submit}
                    noValidate
                >
                    <SectionTitle
                        aside={
                            <span className="muted">
                ID · {user.id}
              </span>
                        }
                    >
                        Основные данные
                    </SectionTitle>

                    <p className="profile-section-description">
                        Вы можете изменить имя,
                        электронную почту и фотографию.
                        � абочие атрибуты управляются
                        администратором.
                    </p>

                    <div className="profile-fields-grid">
                        <Field
                            label="Имя и фамилия"
                            htmlFor="profile-name"
                            error={errors.name}
                        >
                            <input
                                id="profile-name"
                                value={name}
                                onChange={event =>
                                    setName(
                                        event.target.value,
                                    )
                                }
                                aria-invalid={
                                    !!errors.name
                                }
                            />
                        </Field>

                        <Field
                            label="Электронная почта"
                            htmlFor="profile-email"
                            error={errors.email}
                        >
                            <input
                                id="profile-email"
                                type="email"
                                value={email}
                                onChange={event =>
                                    setEmail(
                                        event.target.value,
                                    )
                                }
                                aria-invalid={
                                    !!errors.email
                                }
                            />
                        </Field>
                    </div>

                    <div
                        className="profile-readonly-grid"
                        aria-label="� абочие атрибуты"
                    >
                        <div className="profile-readonly-field">
                            <div>
                                <Building2
                                    size={17}
                                />
                                <span>
                  Подразделение
                </span>
                            </div>

                            <strong>
                                {departmentName}
                            </strong>

                            <small>
                                <LockKeyhole
                                    size={12}
                                />
                                Назначается администратором
                            </small>
                        </div>

                        <div className="profile-readonly-field">
                            <div>
                                <BriefcaseBusiness
                                    size={17}
                                />
                                <span>
                  Должность
                </span>
                            </div>

                            <strong>
                                {positionName}
                            </strong>

                            <small>
                                <LockKeyhole
                                    size={12}
                                />
                                Назначается администратором
                            </small>
                        </div>
                    </div>

                    <div className="profile-access-panel">
                        <div>
                            <ShieldCheck
                                size={20}
                            />

                            <div>
                                <strong>
                                    Уровень доступа
                                </strong>

                                <span>
                  {user.role ===
                  'ADMIN'
                      ? 'Администратор может управлять данными, импортом, пользователями и оргструктурой.'
                      : 'Пользователь работает с каталогом, продажами и прогнозами.'}
                </span>
                            </div>
                        </div>

                        <Badge tone="neutral">
                            {user.role}
                        </Badge>
                    </div>

                    <div className="form-actions">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={
                                !dirty
                                || busy
                            }
                            onClick={() => {
                                setName(
                                    user.name,
                                )

                                setEmail(
                                    user.email,
                                )

                                setErrors({})
                            }}
                        >
                            Отменить изменения
                        </Button>

                        <Button
                            type="submit"
                            disabled={
                                !dirty
                                || busy
                                || avatarBusy
                            }
                        >
                            {busy
                                ? 'Сохраняем...'
                                : 'Сохранить изменения'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    )
}
