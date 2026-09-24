import {
 useState,
 type FormEvent,
} from 'react'

import {
 Link,
 Navigate,
 useNavigate,
} from 'react-router-dom'

import {
 ArrowRight,
 ChartNoAxesCombined,
 Eye,
 EyeOff,
 ShieldCheck,
} from 'lucide-react'

import {
 useStore,
} from '@/app/store-context'

import {
 useAuth,
} from '@/features/auth/model/useAuth'

import {
 ApiError,
} from '@/shared/api/api-error'

import {
 Button,
} from '@/components/ui/button'

import {
 Field,
} from '@/components/ui/primitives'

import {
 Brand,
} from '@/components/layout/AppLayout'

import {
 SignalCore,
} from '@/components/signal/SignalCore'

export function AuthPage({
                          register = false,
                         }: {
 register?: boolean
}) {
 const {
  user,
  ready,
  login,
  register: registerUser,
 } = useAuth()

 const {
  notify,
 } = useStore()

 const navigate =
     useNavigate()

 const [
  email,
  setEmail,
 ] = useState('')

 const [
  password,
  setPassword,
 ] = useState('')

 const [
  name,
  setName,
 ] = useState('')

 const [
  confirm,
  setConfirm,
 ] = useState('')

 const [
  show,
  setShow,
 ] = useState(false)

 const [
  busy,
  setBusy,
 ] = useState(false)

 const [
  errors,
  setErrors,
 ] = useState<
     Record<string, string>
 >({})

 if (!ready) {
  return null
 }

 if (user) {
  return (
      <Navigate
          to="/dashboard"
          replace
      />
  )
 }

 async function submit(
     event: FormEvent,
 ) {
  event.preventDefault()

  const next:
      Record<string, string> =
      {}

  if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
          .test(
              email.trim(),
          )
  ) {
   next.email =
       'Введите корректный адрес электронной почты'
  }

  if (!password) {
   next.password =
       'Введите пароль'
  }

  if (
      register
      && password.length < 8
  ) {
   next.password =
       'Пароль должен содержать не менее 8 символов'
  }

  if (
      register
      && password.length > 72
  ) {
   next.password =
       'Пароль не должен превышать 72 символа'
  }

  if (
      register
      && !name.trim()
  ) {
   next.name =
       'Введите ваше имя'
  }

  if (
      register
      && confirm !== password
  ) {
   next.confirm =
       'Пароли не совпадают'
  }

  setErrors(next)

  if (
      Object.keys(next).length
  ) {
   requestAnimationFrame(
       () =>
           document
               .querySelector<HTMLElement>(
                   '[aria-invalid="true"]',
               )
               ?.focus(),
   )

   return
  }

  setBusy(true)

  try {
   if (register) {
    await registerUser(
        name.trim(),
        email.trim(),
        password,
    )

    notify(
        'Аккаунт создан',
        'success',
    )
   } else {
    await login(
        email.trim(),
        password,
    )

    notify(
        'Вход выполнен',
        'success',
    )
   }

   navigate(
       '/dashboard',
       {
        replace: true,
       },
   )
  } catch (error) {
   if (
       error instanceof ApiError
   ) {
    if (
        error.code ===
        'INVALID_CREDENTIALS'
    ) {
     setErrors({
      email:
          'Неверная электронная почта или пароль',
     })
    } else if (
        error.code ===
        'EMAIL_ALREADY_EXISTS'
    ) {
     setErrors({
      email:
          'Пользователь с такой почтой уже существует',
     })
    } else if (
        error.code ===
        'USER_BLOCKED'
    ) {
     setErrors({
      email:
          'Учётная запись заблокирована администратором',
     })
    } else {
     notify(
         error.message,
         'error',
     )
    }
   } else {
    notify(
        'Не удалось выполнить запрос',
        'error',
    )
   }
  } finally {
   setBusy(false)
  }
 }

 return (
     <div className="auth-layout">
      <main className="auth-main">
       <div className="auth-top">
          <span>
            Система прогнозирования спроса
          </span>

        <span className="demo-label">
            <span />
            Защищённое соединение
          </span>
       </div>

       <div className="auth-form-wrap">
          <span className="eyebrow">
            РАБОЧЕЕ ПРОСТРАНСТВО
          </span>

        <h1>
         {register
             ? 'Создать аккаунт'
             : 'С возвращением'}
        </h1>

        <p className="page-description">
         {register
             ? 'Создайте учётную запись для работы с данными о спросе.'
             : 'Войдите, чтобы продолжить работу с прогнозами.'}
        </p>

        <form
            onSubmit={submit}
            noValidate
            className="auth-form"
        >
         {register && (
             <Field
                 label="Имя"
                 htmlFor="name"
                 error={errors.name}
             >
              <input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={event =>
                      setName(
                          event.target.value,
                      )
                  }
                  aria-invalid={
                   !!errors.name
                  }
                  placeholder="Ваше имя"
              />
             </Field>
         )}

         <Field
             label="Электронная почта"
             htmlFor="email"
             error={errors.email}
         >
          <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.ru"
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

         <Field
             label="Пароль"
             htmlFor="password"
             error={errors.password}
             hint={
              register
                  ? 'От 8 до 72 символов'
                  : undefined
             }
         >
          <div className="password-field">
           <input
               id="password"
               type={
                show
                    ? 'text'
                    : 'password'
               }
               autoComplete={
                register
                    ? 'new-password'
                    : 'current-password'
               }
               placeholder="Введите пароль"
               value={password}
               onChange={event =>
                   setPassword(
                       event.target.value,
                   )
               }
               aria-invalid={
                !!errors.password
               }
           />

           <button
               type="button"
               className="icon-btn"
               aria-label={
                show
                    ? 'Скрыть пароль'
                    : 'Показать пароль'
               }
               onClick={() =>
                   setShow(
                       value => !value,
                   )
               }
           >
            {show
                ? (
                    <EyeOff
                        size={18}
                    />
                )
                : (
                    <Eye
                        size={18}
                    />
                )}
           </button>
          </div>
         </Field>

         {register && (
             <Field
                 label="Подтверждение пароля"
                 htmlFor="confirm"
                 error={
                  errors.confirm
                 }
             >
              <input
                  id="confirm"
                  type={
                   show
                       ? 'text'
                       : 'password'
                  }
                  autoComplete="new-password"
                  value={confirm}
                  onChange={event =>
                      setConfirm(
                          event.target.value,
                      )
                  }
                  aria-invalid={
                   !!errors.confirm
                  }
              />
             </Field>
         )}

         <Button
             type="submit"
             disabled={busy}
             className="full-width"
         >
          {busy
              ? 'Подождите...'
              : register
                  ? 'Зарегистрироваться'
                  : 'Войти'}

          <ArrowRight
              size={17}
          />
         </Button>
        </form>

        <p className="auth-switch">
         {register
             ? 'Уже есть аккаунт?'
             : 'Нет аккаунта?'}

         {' '}

         <Link
             to={
              register
                  ? '/login'
                  : '/register'
             }
         >
          {register
              ? 'Войти'
              : 'Зарегистрироваться'}
         </Link>
        </p>
       </div>

       <div className="auth-footer">
        Доступ к системе защищён
        авторизацией JWT.
       </div>
      </main>

      <aside className="auth-brand">
       <Brand />

       <div className="auth-statement">
          <span className="eyebrow">
            АНАЛИТИКА ПОТРЕБИТЕЛЬСКОГО СПРОСА
          </span>

        <h2>
         За каждым числом —
         <br />

         <span>
              следующее решение.
            </span>
        </h2>

        <p>
         История продаж и прогноз спроса.
         <br />
         В одном точном рабочем пространстве.
        </p>

        <SignalCore dark />

        <div className="auth-principles">
         <div>
          <ChartNoAxesCombined
              size={21}
          />

          <span>
                От истории к прогнозу
              </span>
         </div>

         <div>
          <ShieldCheck
              size={21}
          />

          <span>
                Прозрачность в каждой цифре
              </span>
         </div>
        </div>
       </div>

       <div className="auth-brand-bottom">
          <span>
            СИГНАЛ / 2026
          </span>

        <span>
            Создан для работы с данными
          </span>
       </div>
      </aside>
     </div>
 )
}