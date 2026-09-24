export type UserRole =
    | 'USER'
    | 'ADMIN'

export type UserStatus =
    | 'ACTIVE'
    | 'BLOCKED'

export interface OrganizationSummaryDto {
    id: number
    name: string
}

export interface UserDto {
    id: number
    name: string
    email: string
    avatarUrl: string | null
    role: UserRole
    status: UserStatus
    position: OrganizationSummaryDto | null
    department: OrganizationSummaryDto | null
    createdAt: string
    updatedAt: string
}

export interface User {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    role: UserRole
    status: UserStatus

    departmentId: string | null
    departmentName?: string | null

    positionId: string | null
    positionName?: string | null

    createdAt?: string
    updatedAt?: string
}