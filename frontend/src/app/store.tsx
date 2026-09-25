import {
 useCallback,
 useState,
 type ReactNode,
} from 'react'

import {
 Context,
 type GeneralState,
 type ToastMessage,
 type ToastType,
} from './store-context'

import {
 useAuth,
} from '@/features/auth/model/useAuth'

export function StoreProvider({
                               children,
                              }: {
 children: ReactNode
}) {
 const {
  user,
  logout:
      authLogout,
 } = useAuth()

 const [
  general,
  setGeneral,
 ] = useState<GeneralState>(
     'default',
 )

 const [
  toast,
  setToast,
 ] = useState<ToastMessage | null>(
     null,
 )

 const notify =
     useCallback(
         (
             message: string,
             type: ToastType = 'info',
         ) => {
          const normalized =
              message.trim()

          if (!normalized) {
           setToast(
               null,
           )

           return
          }

          setToast({
           message:
           normalized,

           type,
          })
         },
         [],
     )

 const logout =
     useCallback(
         () => {
          authLogout()

          setGeneral(
              'default',
          )
         },
         [
          authLogout,
         ],
     )

 return (
     <Context.Provider
         value={{
          user,

          logout,

          general,
          setGeneral,

          toast,
          notify,
         }}
     >
      {children}
     </Context.Provider>
 )
}