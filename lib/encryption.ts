import CryptoJS from 'crypto-js';

const secret = process.env.REFRESH_TOKEN_SECRET || 'fallback-secret';

export function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, secret).toString();
}

export function decryptToken(encryptedToken: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
}