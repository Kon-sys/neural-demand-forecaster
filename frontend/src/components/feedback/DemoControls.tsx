import {
 useState,
} from 'react'
import {
 setReducedMotionDemo,
 useReducedMotionOverride,
} from '@/shared/hooks/motionPreference'
import {
 Link,
} from 'react-router-dom'
import {
 SlidersHorizontal,
 X,
} from 'lucide-react'
import {
 useStore,
 type CsvOutcome,
 type ForecastOutcome,
 type GeneralState,
} from '../../app/store-context'

export function DemoControls() {
 const [open, setOpen] =
     useState(false)

 const store =
     useStore()

 const reduced =
     useReducedMotionOverride()

 if (
     !import.meta.env.DEV
     || !store.user
 ) {
  return null
 }

 return (
     <aside
         className={`demo-controls ${
             open
                 ? 'is-open'
                 : ''
         }`}
         aria-label="Демонстрационные состояния"
     >
      {open && (
          <div className="demo-panel">
           <div className="section-heading">
            <strong>
             Проверка прототипа
            </strong>

            <button
                className="icon-btn"
                onClick={() =>
                    setOpen(false)
                }
                aria-label="Закрыть панель"
            >
             <X size={16} />
            </button>
           </div>

           <p className="field-hint">
            Авторизация и профиль уже
            работают через Backend.
            Остальные состояния будут
            подключаться по следующим KP.
           </p>

           <label>
            Состояние страницы

            <select
                value={
                 store.general
                }
                onChange={event =>
                    store.setGeneral(
                        event.target
                            .value as GeneralState,
                    )
                }
            >
             <option value="default">
              Обычное
             </option>

             <option value="loading">
              Загрузка
             </option>

             <option value="empty">
              Нет данных
             </option>

             <option value="error">
              Ошибка
             </option>
            </select>
           </label>

           <label>
            � езультат прогнозирования

            <select
                value={
                 store.forecastOutcome
                }
                onChange={event =>
                    store.setForecastOutcome(
                        event.target
                            .value as ForecastOutcome,
                    )
                }
            >
             <option value="success">
              Успешно
             </option>

             <option value="insufficient">
              Недостаточно истории
             </option>

             <option value="unavailable">
              Модель недоступна
             </option>
            </select>
           </label>

           <label>
            � езультат импорта CSV

            <select
                value={
                 store.csvOutcome
                }
                onChange={event =>
                    store.setCsvOutcome(
                        event.target
                            .value as CsvOutcome,
                    )
                }
            >
             <option value="success">
              Успешно
             </option>

             <option value="partial">
              Частично успешно
             </option>

             <option value="structure">
              Неверная структура
             </option>

             <option value="error">
              Ошибка
             </option>
            </select>
           </label>

           <label>
            Движение

            <select
                value={
                 reduced
                     ? 'reduce'
                     : 'system'
                }
                onChange={event =>
                    setReducedMotionDemo(
                        event.target.value
                        === 'reduce',
                    )
                }
            >
             <option value="system">
              Системная настройка
             </option>

             <option value="reduce">
              Уменьшенное движение
             </option>
            </select>
           </label>

           <div className="demo-route-links">
            <Link
                to="/403"
                onClick={() =>
                    setOpen(false)
                }
            >
             Проверить 403
            </Link>

            <Link
                to="/demo-not-found"
                onClick={() =>
                    setOpen(false)
                }
            >
             Проверить 404
            </Link>
           </div>
          </div>
      )}

      <button
          className="demo-trigger"
          aria-expanded={open}
          onClick={() =>
              setOpen(
                  value => !value,
              )
          }
      >
       <SlidersHorizontal
           size={14}
       />
       Демо
      </button>
     </aside>
 )
}
