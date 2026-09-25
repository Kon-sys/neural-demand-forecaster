import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import {
    adminUsersApi,
} from '@/features/admin/api/admin-users.api'

import {
    mapAdminUserDto,
    mapAdminUserPageDto,
    type AdminUser,
    type AdminUserPage,
    type AdminUserQuery,
    type AdminUserSummary,
    type UpdateAdminUserInput,
} from '@/entities/admin-user/model/types'

interface UsersRequestState {
    key: string
    data: AdminUserPage | null
    error: Error | null
}

interface SummaryRequestState {
    version: number
    data: AdminUserSummary
}

const EMPTY_SUMMARY: AdminUserSummary = {
    total:
        0,

    active:
        0,

    activeAdmins:
        0,

    blocked:
        0,
}

export function useAdminUsers(
    params: AdminUserQuery,
) {
    const [
        reloadVersion,
        setReloadVersion,
    ] = useState(
        0,
    )

    const [
        requestState,
        setRequestState,
    ] = useState<UsersRequestState>({
        key:
            '',

        data:
            null,

        error:
            null,
    })

    const [
        summaryState,
        setSummaryState,
    ] = useState<SummaryRequestState>({
        version:
            -1,

        data:
        EMPTY_SUMMARY,
    })

    const search =
        params.search
        ?? ''

    const role =
        params.role
        ?? ''

    const status =
        params.status
        ?? ''

    const departmentId =
        params.departmentId
        ?? ''

    const positionId =
        params.positionId
        ?? ''

    const page =
        params.page
        ?? 0

    const size =
        params.size
        ?? 20

    const requestKey = [
        search,
        role,
        status,
        departmentId,
        positionId,
        page,
        size,
        reloadVersion,
    ].join(
        '|',
    )

    useEffect(
        () => {
            const controller =
                new AbortController()

            adminUsersApi
                .getUsers(
                    {
                        search:
                            search
                            || undefined,

                        role:
                            role
                                ? role as AdminUserQuery['role']
                                : undefined,

                        status:
                            status
                                ? status as AdminUserQuery['status']
                                : undefined,

                        departmentId:
                            departmentId
                            || undefined,

                        positionId:
                            positionId
                            || undefined,

                        page,
                        size,
                    },
                    controller.signal,
                )
                .then(
                    response => {
                        if (
                            controller.signal
                                .aborted
                        ) {
                            return
                        }

                        setRequestState({
                            key:
                            requestKey,

                            data:
                                mapAdminUserPageDto(
                                    response,
                                ),

                            error:
                                null,
                        })
                    },
                )
                .catch(
                    reason => {
                        if (
                            controller.signal
                                .aborted
                        ) {
                            return
                        }

                        setRequestState({
                            key:
                            requestKey,

                            data:
                                null,

                            error:
                                reason
                                instanceof Error
                                    ? reason
                                    : new Error(
                                        'Не удалось загрузить пользователей',
                                    ),
                        })
                    },
                )

            return () => {
                controller.abort()
            }
        },
        [
            departmentId,
            page,
            positionId,
            reloadVersion,
            requestKey,
            role,
            search,
            size,
            status,
        ],
    )

    useEffect(
        () => {
            const controller =
                new AbortController()

            const version =
                reloadVersion

            adminUsersApi
                .getSummary(
                    controller.signal,
                )
                .then(
                    summary => {
                        if (
                            controller.signal
                                .aborted
                        ) {
                            return
                        }

                        setSummaryState({
                            version,
                            data:
                            summary,
                        })
                    },
                )
                .catch(
                    () => {
                        if (
                            controller.signal
                                .aborted
                        ) {
                            return
                        }

                        setSummaryState({
                            version,
                            data:
                            EMPTY_SUMMARY,
                        })
                    },
                )

            return () => {
                controller.abort()
            }
        },
        [
            reloadVersion,
        ],
    )

    const reload =
        useCallback(
            () => {
                setReloadVersion(
                    value =>
                        value + 1,
                )
            },
            [],
        )

    const updateUser =
        useCallback(
            async (
                id: string,
                input: UpdateAdminUserInput,
            ): Promise<AdminUser> => {
                const response =
                    await adminUsersApi.update(
                        id,
                        input,
                    )

                const updated =
                    mapAdminUserDto(
                        response,
                    )

                setReloadVersion(
                    value =>
                        value + 1,
                )

                return updated
            },
            [],
        )

    const current =
        requestState.key
        === requestKey

    return {
        data:
            current
                ? requestState.data
                : null,

        users:
            current
                ? requestState.data?.items
                ?? []
                : [],

        loading:
            !current,

        error:
            current
                ? requestState.error
                : null,

        summary:
            summaryState.version
            === reloadVersion
                ? summaryState.data
                : EMPTY_SUMMARY,

        summaryLoading:
            summaryState.version
            !== reloadVersion,

        reload,
        updateUser,
    }
}