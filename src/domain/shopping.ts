import { dayKeyFromMs } from './time';
import type { Millis, ShoppingItem, ShoppingList } from './types';

/**
 * Alışveriş listeleri için "Bugün" gündemi (TODO mantığı). Aktif listeler şu
 * durumda bugünkü işlere girer:
 *  - Tarihliyse: gün anahtarı geçmiş → overdue, bugün → today (herkes için).
 *  - Tarihsizse: bana atanmış VEYA (atanmamış ve benim oluşturduğum) → today —
 *    yani sorumlusu olduğum liste, tarih vermesem de bugünkü işlerimde durur.
 * Tarihi gelecekte olan listeler gösterilmez (o güne planlı).
 */

export interface ShoppingDue {
  overdue: ShoppingList[];
  today: ShoppingList[];
}

function isMine(list: ShoppingList, uid: string): boolean {
  return list.assigneeId === uid || (list.assigneeId == null && list.createdBy === uid);
}

export function shoppingListsDue(
  lists: ShoppingList[],
  now: Millis,
  uid: string | null,
): ShoppingDue {
  const todayK = dayKeyFromMs(now);
  const overdue: ShoppingList[] = [];
  const today: ShoppingList[] = [];

  for (const list of lists) {
    if (list.status !== 'active') continue;
    if (list.dueAtMs != null) {
      const key = dayKeyFromMs(list.dueAtMs);
      if (key < todayK) overdue.push(list);
      else if (key === todayK) today.push(list);
      // gelecek tarih → gösterme
    } else if (uid && isMine(list, uid)) {
      today.push(list);
    }
  }

  overdue.sort((a, b) => (a.dueAtMs ?? 0) - (b.dueAtMs ?? 0));
  // Bugün: tarihli olanlar saate göre önce, tarihsizler (Infinity) sona; eşitse
  // yeni oluşturulan üste.
  today.sort((a, b) => {
    const ad = a.dueAtMs ?? Number.POSITIVE_INFINITY;
    const bd = b.dueAtMs ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return b.createdAtMs - a.createdAtMs;
  });
  return { overdue, today };
}

// --- Sık alınanlar (geçmişten öneri) -------------------------------------------

/**
 * Geçmiş ürünlerden "sık alınanlar" önerisi (saf). En çok eklenenler önce,
 * eşitlikte en yeni; `draft` doluysa o metni içeren adlarla süzülür; listede
 * zaten açık olan ürünler (excludeNames) elenir.
 */
export function suggestItemNames(
  history: Pick<ShoppingItem, 'name' | 'addedAtMs'>[],
  draft: string,
  excludeNames: string[],
  limit = 6,
): string[] {
  const q = draft.trim().toLocaleLowerCase('tr');
  const exclude = new Set(excludeNames.map((n) => n.trim().toLocaleLowerCase('tr')));
  const agg = new Map<string, { display: string; count: number; last: Millis }>();
  for (const it of history) {
    const display = it.name.trim();
    if (!display) continue;
    const key = display.toLocaleLowerCase('tr');
    if (exclude.has(key)) continue;
    if (q && !key.includes(q)) continue;
    const cur = agg.get(key);
    if (cur) {
      cur.count += 1;
      if (it.addedAtMs > cur.last) {
        cur.last = it.addedAtMs;
        cur.display = display;
      }
    } else {
      agg.set(key, { display, count: 1, last: it.addedAtMs });
    }
  }
  return [...agg.values()]
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, limit)
    .map((e) => e.display);
}

// --- Reyon (kategori) grupları -------------------------------------------------

export type Aisle =
  | 'manav'
  | 'kasap'
  | 'sutKahvalti'
  | 'firin'
  | 'temel'
  | 'atistirmalik'
  | 'temizlik'
  | 'kisisel'
  | 'diger';

/** Markette dolaşma sırasına yakın reyon sırası. */
export const AISLE_ORDER: readonly Aisle[] = [
  'manav',
  'kasap',
  'sutKahvalti',
  'firin',
  'temel',
  'atistirmalik',
  'temizlik',
  'kisisel',
  'diger',
];

export const AISLE_LABELS: Record<Aisle, string> = {
  manav: 'Manav (meyve & sebze)',
  kasap: 'Kasap & şarküteri',
  sutKahvalti: 'Süt & kahvaltılık',
  firin: 'Fırın & ekmek',
  temel: 'Temel gıda',
  atistirmalik: 'Atıştırmalık & içecek',
  temizlik: 'Temizlik & kağıt',
  kisisel: 'Kişisel bakım',
  diger: 'Diğer',
};

const AISLE_KEYWORDS: Record<Exclude<Aisle, 'diger'>, readonly string[]> = {
  manav: ['elma','muz','domates','salatalık','salatalik','patates','soğan','sogan','biber','limon','portakal','marul','havuç','havuc','sarımsak','sarimsak','meyve','sebze','yeşillik','yesillik','maydanoz','mandalina','çilek','cilek','üzüm','uzum','karpuz','kavun','avokado','ıspanak','ispanak','patlıcan','patlican','kabak','brokoli','mantar','nar','kayısı','kayisi','şeftali','seftali','armut'],
  kasap: ['et ','kıyma','kiyma','tavuk','balık','balik','köfte','kofte','sucuk','sosis','salam','pastırma','pastirma','hindi','kuzu','dana','bonfile','but','kanat','ciğer','ciger','jambon'],
  sutKahvalti: ['süt','sut','yoğurt','yogurt','peynir','yumurta','tereyağ','tereyag','kaymak','bal','reçel','recel','zeytin','ayran','kahvaltılık','kahvaltilik','krema','labne','kaşar','kasar','tahin','pekmez'],
  firin: ['ekmek','simit','poğaça','pogaca','börek','borek','lavaş','lavas','bazlama','kek','pasta','un','maya','galeta','kraker','tost'],
  temel: ['pirinç','pirinc','makarna','mercimek','nohut','fasulye','bulgur','salça','salca','yağ','zeytinyağ','zeytinyag','şeker','seker','tuz','baharat','konserve','sirke','irmik','nişasta','nisasta','bakliyat','un '],
  atistirmalik: ['cips','çikolata','cikolata','bisküvi','biskuvi','gofret','kola','soda','meşrubat','mesrubat','çay','cay','kahve','su ','içecek','icecek','kuruyemiş','kuruyemis','fındık','findik','fıstık','fistik','gazoz','meyve suyu','dondurma','sakız','sakiz','şekerleme','sekerleme'],
  temizlik: ['deterjan','çamaşır','camasir','bulaşık','bulasik','sabun','temizlik','peçete','pecete','havlu','tuvalet kağıdı','tuvalet kagidi','kağıt','kagit','çöp','cop','poşet','poset','yumuşatıcı','yumusatici','camsil','çamaşır suyu','kireç','kirec','sünger','sunger'],
  kisisel: ['şampuan','sampuan','diş','dis ','macun','jilet','ped','deodorant','duş jeli','dus jeli','krem','parfüm','parfum','tıraş','tiras','bakım','bakim','kolonya','mendil','bebek bezi','pomat'],
};

/** Bir ürün adının düştüğü reyon (anahtar kelimeye göre; bulunamazsa "diğer"). */
export function groceryAisle(name: string): Aisle {
  const n = ` ${name.toLocaleLowerCase('tr')} `;
  for (const aisle of AISLE_ORDER) {
    if (aisle === 'diger') continue;
    const kws = AISLE_KEYWORDS[aisle];
    if (kws.some((kw) => n.includes(kw))) return aisle;
  }
  return 'diger';
}

export interface AisleGroup<T> {
  aisle: Aisle;
  label: string;
  items: T[];
}

/** Ürünleri reyona göre, markette dolaşma sırasıyla gruplar. */
export function groupItemsByAisle<T extends { name: string }>(items: T[]): AisleGroup<T>[] {
  const buckets = new Map<Aisle, T[]>();
  for (const it of items) {
    const a = groceryAisle(it.name);
    const arr = buckets.get(a);
    if (arr) arr.push(it);
    else buckets.set(a, [it]);
  }
  return AISLE_ORDER.filter((a) => buckets.has(a)).map((a) => ({
    aisle: a,
    label: AISLE_LABELS[a],
    items: buckets.get(a) ?? [],
  }));
}

// --- Harcama (bütçe) -----------------------------------------------------------

/** Bu ay (yerel) harcanan toplam: listelerin `spentAmount`'ları, ay bazında. */
export function monthlySpend(lists: ShoppingList[], now: Millis): number {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = d.getMonth();
  let total = 0;
  for (const list of lists) {
    if (list.spentAmount == null || list.spentAmount <= 0) continue;
    const at = list.completedAtMs ?? list.createdAtMs;
    const ad = new Date(at);
    if (ad.getFullYear() === y && ad.getMonth() === m) total += list.spentAmount;
  }
  return total;
}
