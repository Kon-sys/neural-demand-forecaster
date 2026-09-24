import {
    useCallback,
} from 'react'
import {
    profileApi,
    type UpdateProfileRequest,
} from '@/features/profile/api/profile.api'
import {
    mapUserDto,
} from '@/entities/user/lib/map-user'
import {
    useSession,
} from '@/entities/session/model/useSession'

export function useProfile() {
    const {
        user,
        setUser,
    } = useSession()

    const updateProfile =
        useCallback(
            async (
                request:
                UpdateProfileRequest,
            ) => {
                const response =
                    await profileApi.update(
                        request,
                    )

                setUser(
                    mapUserDto(
                        response,
                    ),
                )
            },
            [setUser],
        )

    const uploadAvatar =
        useCallback(
            async (
                file: File,
            ) => {
                const response =
                    await profileApi
                        .uploadAvatar(
                            file,
                        )

                setUser(
                    current =>
                        current
                            ? {
                                ...current,
                                avatarUrl:
                                response
                                    .avatarUrl,
                            }
                            : current,
                )
            },
            [setUser],
        )

    const deleteAvatar =
        useCallback(
            async () => {
                await profileApi
                    .deleteAvatar()

                setUser(
                    current =>
                        current
                            ? {
                                ...current,
                                avatarUrl:
                                    null,
                            }
                            : current,
                )
            },
            [setUser],
        )

    return {
        user,
        updateProfile,
        uploadAvatar,
        deleteAvatar,
    }
}