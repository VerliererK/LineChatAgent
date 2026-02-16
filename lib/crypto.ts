const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const PREFIX = 'enc:';

function toBytes(hex: string): Uint8Array {
  return Uint8Array.from({ length: hex.length / 2 }, (_, i) =>
    parseInt(hex.slice(i * 2, i * 2 + 2), 16),
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function importKey() {
  return crypto.subtle.importKey(
    'raw', toBytes(ENCRYPTION_KEY!), 'AES-GCM', false, ['encrypt', 'decrypt'],
  );
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!ENCRYPTION_KEY || !plaintext) return plaintext;

  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext),
  );

  return `${PREFIX}${toHex(iv)}:${toHex(new Uint8Array(encrypted))}`;
}

export async function decrypt(encoded: string): Promise<string> {
  if (!encoded || !encoded.startsWith(PREFIX)) return encoded;
  if (!ENCRYPTION_KEY) return encoded;

  const [ivHex, dataHex] = encoded.slice(PREFIX.length).split(':');
  if (!ivHex || !dataHex) return encoded;

  const key = await importKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBytes(ivHex) }, key, toBytes(dataHex),
  );

  return new TextDecoder().decode(decrypted);
}
