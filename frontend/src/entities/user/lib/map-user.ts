import type {
    User,
    UserDto,
} from '@/entities/user/model/types'

export function mapUserDto(
    response: UserDto,
): User {
    return {
        id: String(response.id),

        name:
        response.name,

        email:
        response.email,

        avatarUrl:
        response.avatarUrl,

        role:
        response.role,

        status:
        response.status,

        departmentId:
            response.department
                ? String(
                    response.department.id,
                )
                : null,

        departmentName:
            response.department?.name
            ?? null,

        positionId:
            response.position
                ? String(
                    response.position.id,
                )
                : null,

        positionName:
            response.position?.name
            ?? null,

        createdAt:
        response.createdAt,

        updatedAt:
        response.updatedAt,
    }
}