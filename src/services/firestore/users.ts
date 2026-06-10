import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';

import type { UserProfile } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { docData, omitUndefined } from './utils';

export interface AuthUserLike {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/** Girişte users/{uid} belgesini oluşturur ya da profil alanlarını tazeler. */
export async function ensureUserDoc(user: AuthUserLike): Promise<void> {
  const ref = doc(requireDb(), 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName ?? 'Kullanıcı',
      email: user.email ?? '',
      photoUrl: user.photoURL ?? null,
      householdId: null,
      createdAtMs: Date.now(),
    });
    return;
  }
  await setDoc(
    ref,
    omitUndefined({
      displayName: user.displayName ?? undefined,
      photoUrl: user.photoURL ?? undefined,
    }),
    { merge: true },
  );
}

export interface UserDocSnapshot {
  profile: UserProfile | null;
}

/** users/{uid} belgesini canlı dinler. */
export function watchUserDoc(
  uid: string,
  callback: (data: UserDocSnapshot) => void,
): () => void {
  const ref = doc(requireDb(), 'users', uid);
  return onSnapshot(
    ref,
    (snap) => callback({ profile: docData<UserProfile>(snap) }),
    (error) => {
      console.warn('[firestore] kullanıcı dinleme hatası', error);
      callback({ profile: null });
    },
  );
}
