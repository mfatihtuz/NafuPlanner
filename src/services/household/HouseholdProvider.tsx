import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

import type { Household, Member, UserProfile } from '@/domain/types';
import { useAuth } from '@/services/auth/AuthProvider';
import { addActivity } from '@/services/firestore/activity';
import {
  createHousehold as createHouseholdSvc,
  createInvitation,
  joinHousehold as joinHouseholdSvc,
  watchHousehold,
  watchMembers,
} from '@/services/firestore/households';
import { ensureUserDoc, watchUserDoc } from '@/services/firestore/users';
import { useWatch } from '@/services/firestore/useWatch';
import { registerPushToken } from '@/services/notifications/push';

interface HouseholdContextValue {
  /** users/{uid} profili; null = yükleniyor ya da oluşturuluyor. */
  profile: UserProfile | null;
  profileLoaded: boolean;
  household: Household | null;
  householdLoaded: boolean;
  members: Member[];
  myMember: Member | null;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  createInvite: () => Promise<{ code: string; expiresAtMs: number }>;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // Girişte profil belgesini garanti altına al.
  useEffect(() => {
    if (!user) return;
    ensureUserDoc(user).catch((error) => {
      console.warn('[household] profil oluşturma hatası', error);
    });
  }, [user]);

  const profileSnap = useWatch(uid, watchUserDoc);
  const profile = profileSnap?.profile ?? null;
  const householdId = profile?.householdId ?? null;

  const householdSnap = useWatch(householdId, watchHousehold);
  const household = householdSnap?.household ?? null;
  const membersSnap = useWatch(householdId, watchMembers);
  const members = useMemo(() => membersSnap ?? [], [membersSnap]);

  const myMember = useMemo(
    () => members.find((m) => m.userId === uid) ?? null,
    [members, uid],
  );

  // Cihazın push token'ını üyelik belgesine kaydet (TestFlight build'inde
  // çalışır; Expo Go/simülatörde sessizce atlanır).
  useEffect(() => {
    if (!uid || !householdId) return;
    void registerPushToken(householdId, uid);
  }, [uid, householdId]);

  const createHousehold = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Oturum yok');
      await createHouseholdSvc(user, name);
    },
    [user],
  );

  const joinHousehold = useCallback(
    async (code: string) => {
      if (!user) throw new Error('Oturum yok');
      const gid = await joinHouseholdSvc(user, code);
      void addActivity({
        householdId: gid,
        type: 'member_joined',
        actorId: user.uid,
        actorName: user.displayName ?? 'Üye',
      });
    },
    [user],
  );

  const createInvite = useCallback(async () => {
    if (!uid || !householdId) throw new Error('Hane yok');
    return createInvitation(householdId, uid);
  }, [uid, householdId]);

  const value = useMemo<HouseholdContextValue>(
    () => ({
      profile,
      profileLoaded: profileSnap !== null,
      household,
      householdLoaded: householdId === null || householdSnap !== null,
      members,
      myMember,
      createHousehold,
      joinHousehold,
      createInvite,
    }),
    [
      profile,
      profileSnap,
      household,
      householdId,
      householdSnap,
      members,
      myMember,
      createHousehold,
      joinHousehold,
      createInvite,
    ],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold, HouseholdProvider içinde kullanılmalı.');
  return ctx;
}
