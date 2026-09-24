import {
    BrowserRouter,
    Navigate,
    Outlet,
    Route,
    Routes,
} from 'react-router-dom'
import {
    useAuth,
} from '@/features/auth/model/useAuth'
import {
    AppLayout,
} from '@/components/layout/AppLayout'
import {
    Skeleton,
} from '@/components/feedback/States'
import {
    Toast,
} from '@/components/feedback/Toast'

import {
    AuthPage,
} from '@/pages/auth/ui/AuthPage'
import {
    ProfilePage,
} from '@/pages/profile/ui/ProfilePage'

import {
    Dashboard,
} from '@/features/forecasts/Dashboard'
import {
    ForecastCreate,
    ForecastHistory,
    ForecastResult,
    RouteError,
} from '@/features/forecasts/ForecastPages'

import {
    ProductsPage,
} from '@/features/products/ProductsPage'
import {
    ProductForm,
} from '@/features/products/ProductForm'
import {
    SalesPage,
} from '@/features/sales/SalesPage'
import {
    ImportPage,
} from '@/features/import/ImportPage'
import {
    OrganizationPage,
} from '@/features/admin/OrganizationPage'
import {
    UsersPage,
} from '@/features/admin/UsersPage'

function RequireSession() {
    const {
        user,
        ready,
    } = useAuth()

    if (!ready) {
        return <Skeleton />
    }

    return user
        ? <Outlet />
        : (
            <Navigate
                to="/login"
                replace
            />
        )
}

function RequireAdmin() {
    const {
        user,
        ready,
    } = useAuth()

    if (!ready) {
        return <Skeleton />
    }

    return user?.role ===
    'ADMIN'
        ? <Outlet />
        : (
            <Navigate
                to="/403"
                replace
            />
        )
}

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <AuthPage
                            key="login"
                        />
                    }
                />

                <Route
                    path="/register"
                    element={
                        <AuthPage
                            key="register"
                            register
                        />
                    }
                />

                <Route
                    element={
                        <RequireSession />
                    }
                >
                    <Route
                        element={
                            <AppLayout />
                        }
                    >
                        <Route
                            index
                            element={
                                <Navigate
                                    to="/dashboard"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="/dashboard"
                            element={
                                <Dashboard />
                            }
                        />

                        <Route
                            path="/profile"
                            element={
                                <ProfilePage />
                            }
                        />

                        <Route
                            path="/products"
                            element={
                                <ProductsPage />
                            }
                        />

                        <Route
                            path="/sales"
                            element={
                                <SalesPage />
                            }
                        />

                        <Route
                            path="/forecasts/new"
                            element={
                                <ForecastCreate />
                            }
                        />

                        <Route
                            path="/forecasts"
                            element={
                                <ForecastHistory />
                            }
                        />

                        <Route
                            path="/forecasts/:id"
                            element={
                                <ForecastResult />
                            }
                        />

                        <Route
                            element={
                                <RequireAdmin />
                            }
                        >
                            <Route
                                path="/products/new"
                                element={
                                    <ProductForm
                                        key="create"
                                    />
                                }
                            />

                            <Route
                                path="/products/:id/edit"
                                element={
                                    <ProductForm />
                                }
                            />

                            <Route
                                path="/sales/import"
                                element={
                                    <ImportPage />
                                }
                            />

                            <Route
                                path="/admin/users"
                                element={
                                    <UsersPage />
                                }
                            />

                            <Route
                                path="/admin/organization"
                                element={
                                    <OrganizationPage />
                                }
                            />
                        </Route>

                        <Route
                            path="/403"
                            element={
                                <RouteError
                                    forbidden
                                />
                            }
                        />

                        <Route
                            path="*"
                            element={
                                <RouteError />
                            }
                        />
                    </Route>
                </Route>
            </Routes>

            <Toast />
        </BrowserRouter>
    )
}