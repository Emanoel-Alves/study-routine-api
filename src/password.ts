import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const saltLength = 16;
const keyLength = 64;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltLength);
  const derivedKey = await deriveKey(password, salt);

  return `scrypt$32768$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, cost, saltValue, hashValue, ...extra] =
    encodedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    cost !== "32768" ||
    saltValue === undefined ||
    hashValue === undefined ||
    extra.length > 0
  ) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expectedHash = Buffer.from(hashValue, "base64url");
  if (salt.length !== saltLength || expectedHash.length !== keyLength) {
    return false;
  }

  const actualHash = await deriveKey(password, salt);

  return timingSafeEqual(actualHash, expectedHash);
}
