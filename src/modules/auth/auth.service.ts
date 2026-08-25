import { signJwt } from "./jwt.js";

import { AppError } from "../../errors/app-error.js";

import { hashPassword, verifyPassword } from "./password.js";
import { generateRefreshToken, hashRefreshToken, getRefreshTokenExpiry } from "./refresh-token.js";
import { findUserByEmail, createUser, createRefreshToken, findRefreshToken, revokeRefreshToken, rotateRefreshToken, revokeRefreshTokenFamily } from "./auth.repository.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";
import { randomUUID } from "node:crypto";



export async function registerUser(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
        throw new AppError(409, "User already exists")
    }

    const passwordHash = await hashPassword(input.password);

    return createUser(email, passwordHash);
}

export async function loginUser(input: LoginInput) {
    const email = input.email.trim().toLowerCase();
    const user = await findUserByEmail(email);

    if (!user) {
       throw new AppError(401, "Invalid email or password")
    }

    const passwordValid = await verifyPassword(input.password, user.password);

    if (!passwordValid) {
        throw new AppError(401, "Invalid email or password")
    }

    const accessToken = signJwt(
        user.id,
        15 * 60
    )

    const familyId = randomUUID()
    const refreshToken = generateRefreshToken()
    const refreshTokenHash = hashRefreshToken(refreshToken)
    const refreshTokenExpiry = getRefreshTokenExpiry()

    await createRefreshToken(
        user.id,
        familyId,
        refreshTokenHash,
        refreshTokenExpiry
    )

    return {
        accessToken, 
        refreshToken,
    };
}

export async function refreshAccessToken(refreshToken: string) {

    const tokenHash = hashRefreshToken(refreshToken)

    const storedToken = await findRefreshToken(tokenHash)

    if  (!storedToken) {
        throw new AppError(401, "Invalid refresh token")
    }

    if (storedToken.revoked_at) {
        await revokeRefreshTokenFamily(storedToken.family_id)
        throw new AppError(
            401,
            "Refresh token reuse detected"
        )
    }

    if (new Date(storedToken.expires_at) <= new Date()) {
        throw new AppError(
            401,
            "Refresh token has expired",
        )
    }

    const newResfreshToken = generateRefreshToken()
    const newRefreshTokenHash = hashRefreshToken(newResfreshToken)
    const newRefreshTokenExpiry = getRefreshTokenExpiry()

    await rotateRefreshToken(
        storedToken.id,
        storedToken.user_id,
        storedToken.family_id,
        newRefreshTokenHash,
        newRefreshTokenExpiry
    )

    const accessToken = signJwt(
        storedToken.user_id,
        15 * 60
    )

    return {
        accessToken,
        refreshToken: newResfreshToken
    }
}

export async function logout(
    refreshToken: string
) {
    const tokenHash = hashRefreshToken(refreshToken)
    const storedToken = await findRefreshToken(tokenHash)

    if (!storedToken) {
        return
    }
    if (storedToken.revoked_at) {
        return
    }

    await revokeRefreshToken(storedToken.id)
}