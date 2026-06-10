import { put, del } from '@vercel/blob';
import sharp from 'sharp';

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 85;

export const isBlobEnabled = () =>
  !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

export async function resizeImage(data: ArrayBuffer | Buffer): Promise<Buffer> {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return sharp(buffer)
    .rotate() // 依 EXIF 方向自動轉正
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

export async function uploadImage(
  pathname: string,
  data: ArrayBuffer | Buffer | Blob,
  contentType?: string,
): Promise<string | null> {
  if (!isBlobEnabled()) return null;
  try {
    let body: ArrayBuffer | Buffer | Blob = data;
    let type = contentType;
    try {
      const input = data instanceof Blob ? await data.arrayBuffer() : data;
      body = await resizeImage(input);
      type = 'image/jpeg';
    } catch (error) {
      // 解析失敗（非圖片格式等）時退回上傳原始內容
      console.error('[Error] resizeImage:', error);
    }
    const { url } = await put(pathname, body, {
      access: 'public',
      contentType: type,
      addRandomSuffix: true,
    });
    return url;
  } catch (error) {
    console.error('[Error] uploadImage:', error);
    return null;
  }
}

export async function deleteImage(url: string | string[]): Promise<void> {
  if (!isBlobEnabled() || !url || url.length === 0) return;
  try {
    await del(url);
  } catch (error) {
    console.error('[Error] deleteImage:', error);
  }
}
