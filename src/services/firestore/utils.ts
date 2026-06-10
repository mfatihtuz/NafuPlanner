import type { DocumentSnapshot, QuerySnapshot } from 'firebase/firestore';

/** Firestore `undefined` kabul etmez; yazmadan önce ayıklarız. */
export function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

/** Belge verisini `{ id, ...data }` olarak tipli döndürür. */
export function docData<T>(snap: DocumentSnapshot): T | null {
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/** Sorgu sonucunu tipli listeye çevirir. */
export function queryData<T>(snap: QuerySnapshot): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}
