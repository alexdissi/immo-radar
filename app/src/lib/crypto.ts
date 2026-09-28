import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function key(): Buffer {
  const key = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return key;
}

/** Returns "iv.tag.ciphertext", each part base64url-encoded. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, ciphertext] = payload.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
