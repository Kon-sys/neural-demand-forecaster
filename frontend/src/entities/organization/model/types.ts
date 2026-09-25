export interface DepartmentDto {
    id: number
    name: string
    isActive: boolean
}

export interface PositionDepartmentDto {
    id: number
    name: string
}

export interface PositionDto {
    id: number
    name: string
    isActive: boolean
    department: PositionDepartmentDto
}

export interface Department {
    id: string
    name: string
    isActive: boolean
}

export interface Position {
    id: string
    name: string
    departmentId: string
    departmentName: string
    isActive: boolean
}

export interface CreateDepartmentInput {
    name: string
}

export interface UpdateDepartmentInput {
    name?: string
    isActive?: boolean
}

export interface CreatePositionInput {
    name: string
    departmentId: string
}

export interface UpdatePositionInput {
    name?: string
    departmentId?: string
    isActive?: boolean
}

export function mapDepartmentDto(
    dto: DepartmentDto,
): Department {
    return {
        id:
            String(
                dto.id,
            ),

        name:
        dto.name,

        isActive:
        dto.isActive,
    }
}

export function mapPositionDto(
    dto: PositionDto,
): Position {
    return {
        id:
            String(
                dto.id,
            ),

        name:
        dto.name,

        departmentId:
            String(
                dto.department.id,
            ),

        departmentName:
        dto.department.name,

        isActive:
        dto.isActive,
    }
}