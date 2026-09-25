export type AdminUserRole =
    | 'USER'
    | 'ADMIN'

export type AdminUserStatus =
    | 'ACTIVE'
    | 'BLOCKED'

export interface AdminUserPositionDto {
    id: number
    name: string
}

export interface AdminUserDepartmentDto {
    id: number
    name: string
}

export interface AdminUserDto {
    id: number
    name: string
    email: string
    avatarUrl: string | null
    role: AdminUserRole
    status: AdminUserStatus
    position: AdminUserPositionDto | null
    department: AdminUserDepartmentDto | null
}

export interface AdminUserPageDto {
    items: AdminUserDto[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export interface AdminUser {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    role: AdminUserRole
    status: AdminUserStatus
    positionId: string | null
    positionName: string | null
    departmentId: string | null
    departmentName: string | null
}

export interface AdminUserPage {
    items: AdminUser[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export interface AdminUserQuery {
    search?: string
    role?: AdminUserRole
    status?: AdminUserStatus
    departmentId?: string
    positionId?: string
    page?: number
    size?: number
}

export interface UpdateAdminUserInput {
    positionId?: string | null
    role?: AdminUserRole
    status?: AdminUserStatus
}

export interface AdminUserSummary {
    total: number
    active: number
    activeAdmins: number
    blocked: number
}

export function mapAdminUserDto(
    dto: AdminUserDto,
): AdminUser {
    return {
        id: String(
            dto.id,
        ),

        name:
        dto.name,

        email:
        dto.email,

        avatarUrl:
        dto.avatarUrl,

        role:
        dto.role,

        status:
        dto.status,

        positionId:
            dto.position
                ? String(
                    dto.position.id,
                )
                : null,

        positionName:
            dto.position?.name
            ?? null,

        departmentId:
            dto.department
                ? String(
                    dto.department.id,
                )
                : null,

        departmentName:
            dto.department?.name
            ?? null,
    }
}

export function mapAdminUserPageDto(
    dto: AdminUserPageDto,
): AdminUserPage {
    return {
        items:
            dto.items.map(
                mapAdminUserDto,
            ),

        page:
        dto.page,

        size:
        dto.size,

        totalElements:
        dto.totalElements,

        totalPages:
        dto.totalPages,
    }
}