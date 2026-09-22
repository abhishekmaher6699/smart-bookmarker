import { createHmac, timingSafeEqual } from "crypto";
import { AppError } from "../../errors/app-error.js";

function getJwtSecret(): string {

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return secret;
}

type JwtPayload = {
    sub: string;
    iat: number;
    exp: number;
}

function encodedBase64Url(input: object): string {
    return Buffer
        .from(JSON.stringify(input), "utf8")
        .toString("base64url")
    }

function createSignature(
    encodedHeader: string,
    encodedPayload: string
): string {

    const data = `${encodedHeader}.${encodedPayload}`;
    const JWT_SECRET = getJwtSecret();

    return createHmac("sha256", JWT_SECRET)
        .update(data)
        .digest("base64url")
}


export function signJwt(
    userId: string,
    expiresIn: number
): string {

    //  convert to seconds
    const now = Math.floor(Date.now() / 1000);

    const header = {
        alg: "HS256",
        typ: "JWT"
    }

    const payload: JwtPayload = {
        sub: userId,
        iat: now,
        exp: now + expiresIn,
    };

    const encodedHeader = encodedBase64Url(header);
    const encodedPayload = encodedBase64Url(payload);

    const signature = createSignature(encodedHeader, encodedPayload);

    return `${encodedHeader}.${encodedPayload}.${signature}`;

}


export function verifyJwt(token: string): JwtPayload { 

    const parts = token.split(".");

    if (parts.length !== 3) {
        throw new AppError(401, "Invalid token format")
    }

    const encodedHeader = parts[0];
    const encodedPayload = parts[1];
    const encodedSignature = parts[2];

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
       throw new AppError(401, "Invalid token header")
    }

    let header: unknown;
    let payload: unknown;

    // Parse the header and payload from base64url to JSON
    try {
        header = JSON.parse(
            Buffer.from(encodedHeader, "base64url").toString("utf8")
        )

        payload = JSON.parse(
            Buffer.from(encodedPayload, "base64url").toString("utf8")
        )
    } catch (error) {
        throw new AppError(401, "Invalid token format")
    }


    // Validate the header and payload structure and types
    if (
        typeof header !== "object" ||
        header === null ||
        !("alg" in header) ||
        header.alg !== "HS256"
    ) {
         throw new AppError(401, "Invalid token header")
    }


    // Validate the signature using timingSafeEqual to prevent timing attacks
    const expectedSignature = createSignature(encodedHeader, encodedPayload);
    const actualSignature = Buffer.from(encodedSignature, "base64url");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "base64url");


    if (
        actualSignature.length !==
        expectedSignatureBuffer.length
    ) {
        throw new AppError(401, "Invalid token signature");
    }


    if (!timingSafeEqual(actualSignature, expectedSignatureBuffer)) {
         throw new AppError(401, "Invalid token signature")
    }


    // Validate the payload structure and types
    if (
        typeof payload !== "object" ||
        payload === null ||
        !("sub" in payload) ||
        !("iat" in payload) ||
        !("exp" in payload)
    ) {
         throw new AppError(401, "Invalid token payload")
    }

    // Validate the payload properties and expiration
    if (
        typeof payload.sub !== "string" ||
        typeof payload.iat !== "number" ||
        typeof payload.exp !== "number"
    ) {
         throw new AppError(401, "Invalid token payload")
    }

    // Check if the token has expired
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
         throw new AppError(401, "Token has expired")
    }

    return {
        sub: payload.sub,
        iat: payload.iat,
        exp: payload.exp
    }

}