import { randomUUID } from 'expo-crypto';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { requireStorage } from '@/services/firebase/config';

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
  // RN'de yerel dosya URI'sini blob'a çevir (Firebase JS SDK blob bekler).
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storagePath = `households/${gid}/tasks/${taskId}/${randomUUID()}.jpg`;
  const objectRef = ref(storage, storagePath);
  await uploadBytes(objectRef, blob, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(objectRef);
  return { storagePath, url };
}

/** Storage nesnesini siler (en iyi çaba; nesne yoksa sessiz geçer). */
export async function deleteStorageObject(storagePath: string): Promise<void> {
  await deleteObject(ref(requireStorage(), storagePath)).catch((error) =>
    console.warn('[storage] nesne silinemedi', error),
  );
}
