import {
    ArrowLeft,
} from 'lucide-react'

import {
    LinkButton,
    PageHeader,
} from '@/components/ui/primitives'

interface RouteErrorPageProps {
    forbidden?: boolean
}

export function RouteErrorPage({
                                   forbidden = false,
                               }: RouteErrorPageProps) {
    return (
        <div className="route-error">
            <span className="error-code">
                {
                    forbidden
                        ? '403'
                        : '404'
                }
            </span>

            <PageHeader
                title={
                    forbidden
                        ? 'Доступ ограничен'
                        : 'Страница не найдена'
                }
                description={
                    forbidden
                        ? 'Этот раздел доступен только администратору.'
                        : 'Возможно, адрес изменился или в нём допущена ошибка.'
                }
            />

            <LinkButton to="/dashboard">
                <ArrowLeft size={16} />
                На главную
            </LinkButton>
        </div>
    )
}