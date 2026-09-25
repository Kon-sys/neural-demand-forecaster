import {
    api,
} from '@/shared/api/client'

import type {
    CreateDepartmentInput,
    CreatePositionInput,
    DepartmentDto,
    PositionDto,
    UpdateDepartmentInput,
    UpdatePositionInput,
} from '@/entities/organization/model/types'

function toPositionCreateRequest(
    input: CreatePositionInput,
) {
    return {
        name:
        input.name,

        departmentId:
            Number(
                input.departmentId,
            ),
    }
}

function toPositionUpdateRequest(
    input: UpdatePositionInput,
) {
    return {
        ...input,

        departmentId:
            input.departmentId === undefined
                ? undefined
                : Number(
                    input.departmentId,
                ),
    }
}

export const organizationApi = {
    getDepartments(
        signal?: AbortSignal,
    ): Promise<DepartmentDto[]> {
        return api.get<DepartmentDto[]>(
            '/api/v1/departments',
            {
                signal,
            },
        )
    },

    createDepartment(
        input: CreateDepartmentInput,
    ): Promise<DepartmentDto> {
        return api.post<DepartmentDto>(
            '/api/v1/departments',
            {
                json:
                input,
            },
        )
    },

    updateDepartment(
        id: string,
        input: UpdateDepartmentInput,
    ): Promise<DepartmentDto> {
        return api.patch<DepartmentDto>(
            `/api/v1/departments/${id}`,
            {
                json:
                input,
            },
        )
    },

    getPositions(
        signal?: AbortSignal,
    ): Promise<PositionDto[]> {
        return api.get<PositionDto[]>(
            '/api/v1/positions',
            {
                signal,
            },
        )
    },

    createPosition(
        input: CreatePositionInput,
    ): Promise<PositionDto> {
        return api.post<PositionDto>(
            '/api/v1/positions',
            {
                json:
                    toPositionCreateRequest(
                        input,
                    ),
            },
        )
    },

    updatePosition(
        id: string,
        input: UpdatePositionInput,
    ): Promise<PositionDto> {
        return api.patch<PositionDto>(
            `/api/v1/positions/${id}`,
            {
                json:
                    toPositionUpdateRequest(
                        input,
                    ),
            },
        )
    },
}