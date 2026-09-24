import {
    api,
} from '@/shared/api/client'
import type {
    UserDto,
} from '@/entities/user/model/types'

export interface UpdateProfileRequest {
    name: string
    email: string
}

export interface AvatarResponse {
    avatarUrl: string
}

export const profileApi = {
    update(
        request: UpdateProfileRequest,
    ): Promise<UserDto> {
        return api.patch<UserDto>(
            '/api/v1/users/me',
            {
                json: request,
            },
        )
    },

    uploadAvatar(
        file: File,
    ): Promise<AvatarResponse> {
        const formData =
            new FormData()

        formData.append(
            'file',
            file,
        )

        return api.upload<AvatarResponse>(
            '/api/v1/users/me/avatar',
            formData,
        )
    },

    deleteAvatar(): Promise<void> {
        return api.delete<void>(
            '/api/v1/users/me/avatar',
        )
    },
}