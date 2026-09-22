import {
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from "crypto"
import {promisify} from "node:util"


const scrypt = promisify(scryptCallback)

const SALT_LENGTH = 16
const KEY_LENGTH = 64


export async function hashPassword(password: string) {
    const salt = randomBytes(SALT_LENGTH)

    const derivedKey = (await scrypt(
        password,
        salt, 
        KEY_LENGTH
    )) as Buffer

    return `${salt.toString("hex")}:${derivedKey.toString("hex")}`
}


export async function verifyPassword(
    password: string,
    hashedPassword: string
) {
    const [saltHex, derivedKeyHex] = hashedPassword.split(":")

    if (!saltHex || !derivedKeyHex) {
        return false
    }

    const salt = Buffer.from(saltHex, "hex")
    const storedKey = Buffer.from(derivedKeyHex, "hex")

    const derivedKey = (await scrypt(
        password, 
        salt,
        storedKey.length
    )) as Buffer

    return timingSafeEqual(storedKey, derivedKey)
}