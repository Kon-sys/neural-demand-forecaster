import {
 useEffect,
 useState,
} from 'react'

import {
 NavLink,
 useLocation,
 useNavigate,
} from 'react-router-dom'

import {
 Activity,
 ArrowUpRight,
 Box,
 Building2,
 ChartNoAxesCombined,
 ChevronRight,
 Database,
 History,
 House,
 LogOut,
 Menu,
 Upload,
 UserRound,
 UsersRound,
} from 'lucide-react'

import {
 motion,
} from 'motion/react'

import {
 PageTransition,
} from './PageTransition'

import {
 useStore,
} from '../../app/store-context'

import {
 Overlay,
} from '../ui/overlay'

export function Brand() {
 return (
     <div className="brand">
      <div className="brand-mark">
       <Activity
           size={22}
           strokeWidth={2.1}
       />
      </div>

      <div>
       СИГНАЛ
       <span>
                    ПРОГНОЗ СПРОСА
                </span>
      </div>
     </div>
 )
}

const mainEntries = [
 {
  to: '/dashboard',
  title: 'Главная',
  icon: House,
 },
 {
  to: '/products',
  title: 'Товары',
  icon: Box,
 },
 {
  to: '/sales',
  title: 'Продажи',
  icon: Database,
 },
 {
  to: '/forecasts/new',
  title: 'Прогнозирование',
  icon: ChartNoAxesCombined,
 },
 {
  to: '/forecasts',
  title: 'История прогнозов',
  icon: History,
 },
]

const adminEntries = [
 {
  to: '/sales/import',
  title: 'Импорт CSV',
  icon: Upload,
 },
 {
  to: '/admin/users',
  title: 'Пользователи',
  icon: UsersRound,
 },
 {
  to: '/admin/organization',
  title: 'Оргструктура',
  icon: Building2,
 },
]

const allEntries = [
 ...mainEntries,
 ...adminEntries,
]

export function AppLayout() {
 const {
  user,
  logout,
 } = useStore()

 const [
  drawer,
  setDrawer,
 ] = useState(
     false,
 )

 const location =
     useLocation()

 const navigate =
     useNavigate()

 const title =
     location.pathname === '/profile'
         ? 'Профиль'
         : location.pathname === '/forecasts/new'
             ? 'Прогнозирование'
             : location.pathname.startsWith('/forecasts/')
                 ? 'Результат прогноза'
                 : location.pathname === '/products/new'
                     ? 'Новый товар'
                     : location.pathname.endsWith('/edit')
                         ? 'Редактирование товара'
                         : allEntries.find(
                             item =>
                                 item.to
                                 === location.pathname,
                         )?.title
                         ?? 'Навигация'

 useEffect(
     () => {
      document.title =
          `${title} — Сигнал`

      window.scrollTo(
          0,
          0,
      )

      const id =
          window.setTimeout(
              () =>
                  document
                      .querySelector<HTMLElement>(
                          'h1',
                      )
                      ?.focus({
                       preventScroll:
                           true,
                      }),
              50,
          )

      return () =>
          clearTimeout(
              id,
          )
     },
     [
      location.pathname,
      title,
     ],
 )

 const renderLinks = (
     items: typeof mainEntries,
 ) =>
     items.map(
         ({
           to,
           title: itemTitle,
           icon: Icon,
          }) => (
             <NavLink
                 key={to}
                 to={to}
                 end={
                     to === '/sales'
                     || to === '/forecasts'
                 }
                 className={
                  ({
                    isActive,
                   }) =>
                      `nav-item ${isActive ? 'active' : ''}`
                 }
                 onClick={
                  () =>
                      setDrawer(
                          false,
                      )
                 }
             >
              <Icon
                  size={18}
                  strokeWidth={1.65}
              />

              {itemTitle}

              <motion.i
                  className="nav-signal"
                  key={
                   `${to}-${location.pathname}`
                  }
                  initial={{
                   opacity:
                       0,
                  }}
                  animate={{
                   opacity:
                       1,
                  }}
                  transition={{
                   duration:
                       0.22,
                  }}
              />
             </NavLink>
         ),
     )

 const nav = (
     <nav aria-label="Основная навигация">
      {
       renderLinks(
           mainEntries,
       )
      }

      {user?.role === 'ADMIN' && (
          <>
           <div className="nav-section-label">
            УПРАВЛЕНИЕ
           </div>

           {
            renderLinks(
                adminEntries,
            )
           }
          </>
      )}
     </nav>
 )

 const account = (
     <div className="sidebar-account">
      <NavLink
          to="/profile"
          className={
           ({
             isActive,
            }) =>
               `sidebar-account-profile ${isActive ? 'active' : ''}`
          }
          onClick={
           () =>
               setDrawer(
                   false,
               )
          }
          aria-label="Открыть профиль"
      >
       <div className="avatar">
        {user?.avatarUrl
            ? (
                <img
                    src={
                     user.avatarUrl
                    }
                    alt=""
                />
            )
            : (
                <UserRound
                    size={18}
                />
            )}
       </div>

       <div>
        <strong>
         {user?.name}
        </strong>

        <span>
                        {
                         user?.role === 'ADMIN'
                             ? 'Администратор'
                             : 'Пользователь'
                        }
                    </span>
       </div>
      </NavLink>

      <button
          className="icon-btn"
          title="Выйти"
          aria-label="Выйти"
          onClick={
           () => {
            logout()

            navigate(
                '/login',
            )
           }
          }
      >
       <LogOut
           size={17}
       />
      </button>
     </div>
 )

 return (
     <div className="app-shell">
      <a
          href="#main-content"
          className="skip-link"
      >
       Перейти к содержимому
      </a>

      <aside className="sidebar">
       <Brand />

       <div className="workspace-label">
        <span className="workspace-dot" />
        Рабочее пространство
       </div>

       {nav}

       <div className="sidebar-note">
                    <span className="mini-label">
                        ОТ ДАННЫХ К РЕШЕНИЯМ
                    </span>

        <p>
         Понимайте спрос.
         <br />
         Планируйте уверенно.
        </p>

        <ArrowUpRight
            size={19}
        />
       </div>

       {account}
      </aside>

      <div className="workspace">
       <header className="topbar">
        <div className="breadcrumb">
         <button
             className="icon-btn mobile-menu"
             aria-label="Открыть меню"
             onClick={
              () =>
                  setDrawer(
                      true,
                  )
             }
         >
          <Menu
              size={21}
          />
         </button>

         <span className="breadcrumb-root">
                            Рабочее пространство
                        </span>

         <ChevronRight
             size={14}
             className="breadcrumb-root"
         />

         <span>
                            {title}
                        </span>
        </div>

        <span className="demo-label">
                        <span />
                        Данные приложения
                    </span>
       </header>

       <PageTransition />

       <footer className="app-footer">
                    <span>
                        Сигнал · Прогнозирование спроса
                    </span>

        <span>
                        Рабочая версия · 2026
                    </span>
       </footer>
      </div>

      {drawer && (
          <Overlay
              kind="drawer"
              title="Навигация"
              onClose={
               () =>
                   setDrawer(
                       false,
                   )
              }
          >
           <Brand />

           {nav}

           {account}
          </Overlay>
      )}
     </div>
 )
}