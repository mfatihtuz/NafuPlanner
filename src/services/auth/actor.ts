/** Bir eylemi yapan kullanıcı (uid + görünen ad); akışlara/aktiviteye geçer. */
export interface Actor {
  uid: string;
  name: string;
}

/** Oturum kullanıcısından Actor üretir (ad yoksa "Üye"). Tek kaynak. */
export function actorOf(user: { uid: string; displayName?: string | null }): Actor {
  return { uid: user.uid, name: user.displayName ?? 'Üye' };
}
