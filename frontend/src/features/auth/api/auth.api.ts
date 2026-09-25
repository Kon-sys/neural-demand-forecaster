import {
    api,
} from '@/shared/api/client'
import type {
    UserDto,
} from '@/entities/user/model/types'

export interface LoginRequest {
    email: string
    password: string
}

export interface RegisterRequest {
    name: string
    email: string
    password: string
}

export interface AuthResponse {
    accessToken: string
    tokenType: string
    expiresIn: number
    user: UserDto
}

export const authApi = {
    login(
        request: LoginRequest,
    ): Promise<AuthResponse> {
        return api.post<AuthResponse>(
            '/api/v1/auth/login',
            {
                auth: false,
                json: request,
            },
        )
    },

    register(
        request: RegisterRequest,
    ): Promise<AuthResponse> {
        return api.post<AuthResponse>(
            '/api/v1/auth/register',
            {
                auth: false,
                json: request,
            },
        )
    },

    me(): Promise<UserDto> {
        return api.get<UserDto>(
            '/api/v1/auth/me',
        )
    },
}