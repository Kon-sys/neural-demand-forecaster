import {
    api,
} from '@/shared/api/client'

import type {
    AdminUserDto,
    AdminUserPageDto,
    AdminUserQuery,
    AdminUserSummary,
    UpdateAdminUserInput,
} from '@/entities/admin-user/model/types'

function buildQuery(
    params: AdminUserQuery,
): string {
    const query =
        new URLSearchParams()

    if (params.search?.trim()) {
        query.set(
            'search',
            params.search.trim(),
        )
    }

    if (params.role) {
        query.set(
            'role',
            params.role,
        )
    }

    if (params.status) {
        query.set(
            'status',
            params.status,
        )
    }

    if (params.departmentId) {
        query.set(
            'departmentId',
            params.departmentId,
        )
    }

    if (params.positionId) {
        query.set(
            'positionId',
            params.positionId,
        )
    }

    query.set(
        'page',
        String(
            params.page
            ?? 0,
        ),
    )

    query.set(
        'size',
        String(
            params.size
            ?? 20,
        ),
    )

    return query.toString()
}

function toUpdateRequest(
    input: UpdateAdminUserInput,
) {
    const request: {
        positionId?: number | null
        role?: UpdateAdminUserInput['role']
        status?: UpdateAdminUserInput['status']
    } = {}

    if (
        input.positionId
        !== undefined
    ) {
        request.positionId =
            input.positionId === null
                ? null
                : Number(
                    input.positionId,
                )
    }

    if (
        input.role
        !== undefined
    ) {
        request.role =
            input.role
    }

    if (
        input.status
        !== undefined
    ) {
        request.status =
            input.status
    }

    return request
}

export const adminUsersApi = {
    getUsers(
        params: AdminUserQuery = {},
        signal?: AbortSignal,
    ): Promise<AdminUserPageDto> {
        return api.get<AdminUserPageDto>(
            `/api/v1/users?${buildQuery(params)}`,
            {
                signal,
            },
        )
    },

    getById(
        id: string,
        signal?: AbortSignal,
    ): Promise<AdminUserDto> {
        return api.get<AdminUserDto>(
            `/api/v1/users/${id}`,
            {
                signal,
            },
        )
    },

    update(
        id: string,
        input: UpdateAdminUserInput,
    ): Promise<AdminUserDto> {
        return api.patch<AdminUserDto>(
            `/api/v1/users/${id}`,
            {
                json:
                    toUpdateRequest(
                        input,
                    ),
            },
        )
    },

    async getSummary(
        signal?: AbortSignal,
    ): Promise<AdminUserSummary> {
        const [
            all,
            active,
            activeAdmins,
            blocked,
        ] = await Promise.all([
            adminUsersApi.getUsers(
                {
                    page: 0,
                    size: 1,
                },
                signal,
            ),

            adminUsersApi.getUsers(
                {
                    status:
                        'ACTIVE',
                    page:
                        0,
                    size:
                        1,
                },
                signal,
            ),

            adminUsersApi.getUsers(
                {
                    role:
                        'ADMIN',
                    status:
                        'ACTIVE',
                    page:
                        0,
                    size:
                        1,
                },
                signal,
            ),

            adminUsersApi.getUsers(
                {
                    status:
                        'BLOCKED',
                    page:
                        0,
                    size:
                        1,
                },
                signal,
            ),
        ])

        return {
            total:
            all.totalElements,

            active:
            active.totalElements,

            activeAdmins:
            activeAdmins.totalElements,

            blocked:
            blocked.totalElements,
        }
    },
}