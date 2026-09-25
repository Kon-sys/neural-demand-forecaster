import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import {
    organizationApi,
} from '@/features/admin/api/organization.api'

import {
    mapDepartmentDto,
    mapPositionDto,
    type CreateDepartmentInput,
    type CreatePositionInput,
    type Department,
    type Position,
    type UpdateDepartmentInput,
    type UpdatePositionInput,
} from '@/entities/organization/model/types'

interface OrganizationRequestState {
    version: number
    error: Error | null
}

function sortDepartments(
    items: Department[],
): Department[] {
    return [...items].sort(
        (
            first,
            second,
        ) =>
            first.name.localeCompare(
                second.name,
                'ru',
            ),
    )
}

function sortPositions(
    items: Position[],
): Position[] {
    return [...items].sort(
        (
            first,
            second,
        ) =>
            first.name.localeCompare(
                second.name,
                'ru',
            ),
    )
}

export function useOrganization() {
    const [
        departments,
        setDepartments,
    ] = useState<Department[]>([])

    const [
        positions,
        setPositions,
    ] = useState<Position[]>([])

    const [
        reloadVersion,
        setReloadVersion,
    ] = useState(
        0,
    )

    const [
        requestState,
        setRequestState,
    ] = useState<OrganizationRequestState>({
        version:
            -1,

        error:
            null,
    })

    const loading =
        requestState.version
        !== reloadVersion

    const error =
        requestState.version
        === reloadVersion
            ? requestState.error
            : null

    useEffect(
        () => {
            const controller =
                new AbortController()

            const version =
                reloadVersion

            Promise.all([
                organizationApi.getDepartments(
                    controller.signal,
                ),

                organizationApi.getPositions(
                    controller.signal,
                ),
            ])
                .then(
                    ([
                         departmentsResponse,
                         positionsResponse,
                     ]) => {
                        if (
                            controller.signal
                                .aborted
                        ) {
                            return
                        }

                        setDepartments(
                            sortDepartments(
                                departmentsResponse.map(
                                    mapDepartmentDto,
                                ),
                            ),
                        )

                        setPositions(
                            sortPositions(
                                positionsResponse.map(
                                    mapPositionDto,
                                ),
                            ),
                        )

                        setRequestState({
                            version,
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
                            version,

                            error:
                                reason
                                instanceof Error
                                    ? reason
                                    : new Error(
                                        'Не удалось загрузить оргструктуру',
                                    ),
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

    const createDepartment =
        useCallback(
            async (
                input: CreateDepartmentInput,
            ) => {
                const response =
                    await organizationApi.createDepartment(
                        input,
                    )

                const department =
                    mapDepartmentDto(
                        response,
                    )

                setDepartments(
                    current =>
                        sortDepartments([
                            ...current,
                            department,
                        ]),
                )

                return department
            },
            [],
        )

    const updateDepartment =
        useCallback(
            async (
                id: string,
                input: UpdateDepartmentInput,
            ) => {
                const response =
                    await organizationApi.updateDepartment(
                        id,
                        input,
                    )

                const department =
                    mapDepartmentDto(
                        response,
                    )

                setDepartments(
                    current =>
                        sortDepartments(
                            current.map(
                                item =>
                                    item.id === id
                                        ? department
                                        : item,
                            ),
                        ),
                )

                return department
            },
            [],
        )

    const createPosition =
        useCallback(
            async (
                input: CreatePositionInput,
            ) => {
                const response =
                    await organizationApi.createPosition(
                        input,
                    )

                const position =
                    mapPositionDto(
                        response,
                    )

                setPositions(
                    current =>
                        sortPositions([
                            ...current,
                            position,
                        ]),
                )

                return position
            },
            [],
        )

    const updatePosition =
        useCallback(
            async (
                id: string,
                input: UpdatePositionInput,
            ) => {
                const response =
                    await organizationApi.updatePosition(
                        id,
                        input,
                    )

                const position =
                    mapPositionDto(
                        response,
                    )

                setPositions(
                    current =>
                        sortPositions(
                            current.map(
                                item =>
                                    item.id === id
                                        ? position
                                        : item,
                            ),
                        ),
                )

                return position
            },
            [],
        )

    return {
        departments,
        positions,
        loading,
        error,

        reload,

        createDepartment,
        updateDepartment,

        createPosition,
        updatePosition,
    }
}