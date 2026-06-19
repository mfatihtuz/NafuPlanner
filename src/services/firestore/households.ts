import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { DEFAULT_CATEGORIES } from '@/domain/constants';
import * as Crypto from 'expo-crypto';

import {
  INVITE_TTL_MS,
  generateInviteCode,
  isInviteUsable,
  normalizeInviteCode,
  type RandomInt,
} from '@/domain/invites';
import type { Household, Invitation, Member } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import type { AuthUserLike } from './users';
import { docData, omitUndefined } from './utils';

export class InviteError extends Error {
  constructor(public readonly reason: 'notFound' | 'expired') {
    super(`invite:${reason}`);
  }
}

function memberDoc(user: AuthUserLike, householdId: string, role: Member['role']): Member {
  return {
    userId: user.uid,
    householdId,
    role,
    displayName: user.displayName ?? 'Kullanıcı',
    photoUrl: user.photoURL ?? undefined,
    points: 0,
    level: 1,
    streakCount: 0,
    joinedAtMs: Date.now(),
  };
}

/**
 * Yeni hane kurar: grup belgesi → kurucu üyelik → varsayılan kategoriler →
 * kullanıcı profilindeki hane bağlantısı. Güvenlik kuralları sıralı yazımı
 * doğrular (üyelik belgesi oluşmadan kategori yazılamaz).
 */
export async function createHousehold(user: AuthUserLike, name: string): Promise<string> {
  const db = requireDb();
  const gid = doc(collection(db, 'groups')).id;

  const household: Omit<Household, 'id'> = {
    name: name.trim(),
    createdBy: user.uid,
    createdAtMs: Date.now(),
    memberIds: [user.uid],
  };
  await setDoc(doc(db, 'groups', gid), household);

  const member = memberDoc(user, gid, 'owner');
  const { userId, ...memberData } = member;
  // photoUrl e-posta hesaplarında olmayabilir; undefined alanlar ayıklanır.
  await setDoc(doc(db, 'groups', gid, 'members', userId), omitUndefined(memberData));

  await Promise.all(
    DEFAULT_CATEGORIES.map((cat, index) =>
      setDoc(doc(db, 'groups', gid, 'categories', cat.slug), {
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        isDefault: true,
        order: index,
      }),
    ),
  );

  await setDoc(doc(db, 'users', user.uid), { householdId: gid }, { merge: true });
  return gid;
}

/** Davet koduyla mevcut bir haneye katılır. */
export async function joinHousehold(user: AuthUserLike, rawCode: string): Promise<string> {
  const db = requireDb();
  const code = normalizeInviteCode(rawCode);

  const inviteSnap = await getDoc(doc(db, 'invitations', code));
  const invite = docData<Invitation & { id: string }>(inviteSnap);
  if (!invite) throw new InviteError('notFound');
  if (!isInviteUsable({ ...invite, token: code }, Date.now())) {
    throw new InviteError('expired');
  }

  const gid = invite.householdId;
  const member = memberDoc(user, gid, 'member');
  const { userId, ...memberData } = member;
  // inviteCode alanı güvenlik kurallarının davet doğrulaması için gerekli.
  await setDoc(doc(db, 'groups', gid, 'members', userId), {
    ...omitUndefined(memberData),
    inviteCode: code,
  });
  await updateDoc(doc(db, 'groups', gid), { memberIds: arrayUnion(user.uid) });
  await setDoc(doc(db, 'users', user.uid), { householdId: gid }, { merge: true });
  // Tek kullanımlık: kod "kabul edildi" olarak işaretlenir; aynı kod ikinci kez
  // kullanılamaz (isInviteUsable + kurallar status === 'pending' arar). Üye
  // belgesi az önce oluştuğundan isMember(gid) artık doğru → güncelleme izinli.
  // En iyi-çaba: işaretleme başarısız olsa bile katılım tamamlanmış sayılır.
  await updateDoc(doc(db, 'invitations', code), {
    status: 'accepted',
    acceptedBy: user.uid,
    acceptedAtMs: Date.now(),
  }).catch((error) => console.warn('[household] davet işaretlenemedi', error));
  return gid;
}

/**
 * Kriptografik rastgele tam sayı [0, max). Davet kodu hanenin güvenlik
 * sınırıdır; Math.random yerine işletim sistemi RNG'si kullanılır. Modulo
 * yanlılığı reddetme örneklemesiyle önlenir.
 */
const cryptoRandomInt: RandomInt = (maxExclusive) => {
  const range = 0x1_0000_0000;
  const limit = range - (range % maxExclusive);
  for (;;) {
    const b = Crypto.getRandomBytes(4);
    const x = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    if (x < limit) return x % maxExclusive;
  }
};

/** Yeni davet kodu üretip kaydeder (7 gün geçerli, çok kullanımlık). */
export async function createInvitation(
  householdId: string,
  createdBy: string,
): Promise<{ code: string; expiresAtMs: number }> {
  const db = requireDb();
  // Çakışma (zaten var olan kod) kural ihlaliyle reddedilir; yeniden dene.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateInviteCode(cryptoRandomInt);
    const expiresAtMs = Date.now() + INVITE_TTL_MS;
    try {
      await setDoc(doc(db, 'invitations', code), {
        householdId,
        createdBy,
        createdAtMs: Date.now(),
        expiresAtMs,
        status: 'pending',
      });
      return { code, expiresAtMs };
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error('Davet kodu üretilemedi');
}

/** Üyenin görünen adını günceller (ad değişiminde diğer üyeler de görür). */
export async function updateMemberDisplayName(
  gid: string,
  uid: string,
  displayName: string,
): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'members', uid), {
    displayName: displayName.trim(),
  });
}

/** groups/{gid} belgesini canlı dinler. */
export function watchHousehold(
  gid: string,
  callback: (data: { household: Household | null }) => void,
): () => void {
  return onSnapshot(
    doc(requireDb(), 'groups', gid),
    (snap) => callback({ household: docData<Household>(snap) }),
    (error) => {
      console.warn('[firestore] hane dinleme hatası', error);
      callback({ household: null });
    },
  );
}

/** Hane üyelerini canlı dinler (katılım sırasına göre). */
export function watchMembers(gid: string, callback: (members: Member[]) => void): () => void {
  const q = query(collection(requireDb(), 'groups', gid, 'members'), orderBy('joinedAtMs', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const members = snap.docs.map(
        (d) => ({ userId: d.id, householdId: gid, ...d.data() }) as Member,
      );
      callback(members);
    },
    (error) => {
      console.warn('[firestore] üye dinleme hatası', error);
      callback([]);
    },
  );
}
