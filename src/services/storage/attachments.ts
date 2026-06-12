import { randomUUID } from 'expo-crypto';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { requireStorage } from '@/services/firebase/config';

/**
 * Yerel dosya URI'sini blob'a çevirir. React Native'de `fetch(uri).blob()`
 * bazı sürümlerde sessizce boş/bozuk blob döndürüp yüklemeyi düşürebiliyor;
 * XHR ile okumak Expo + Firebase'in önerdiği güvenilir yöntem.
 */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('Görsel dosyası okunamadı'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

/**
 * Görev fotoğrafını Firebase Storage'a yükler ve indirme URL'sini döndürür.
 * Yol: households/{gid}/tasks/{taskId}/{uuid}.jpg — kurallar hane üyesine açar.
 */
export async function uploadTaskImage(
  gid: string,
  taskId: string,
  localUri: string,
): Promise<{ storagePath: string; url: string }> {
  const storage = requireStorage();
  const blob = await uriToBlob(localUri);
  const storagePath = `households/${gid}/tasks/${taskId}/${randomUUID()}.jpg`;
  const objectRef = ref(storage, storagePath);
  try {
    await uploadBytes(objectRef, blob, { contentType: 'image/jpeg' });
  } finally {
    // RN Blob'unun close() metodu varsa belleği erkenden serbest bırak.
    (blob as unknown as { close?: () => void }).close?.();
  }
  const url = await getDownloadURL(objectRef);
  return { storagePath, url };
}

/** Storage nesnesini siler (en iyi çaba; nesne yoksa sessiz geçer). */
export async function deleteStorageObject(storagePath: string): Promise<void> {
  await deleteObject(ref(requireStorage(), storagePath)).catch((error) =>
    console.warn('[storage] nesne silinemedi', error),
  );
}
