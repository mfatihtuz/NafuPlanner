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
  | 'icecek'
  | 'donuk'
  | 'temizlik'
  | 'kisisel'
  | 'bebekEvcil'
  | 'diger';

/** Markette dolaşma sırasına yakın reyon sırası (gösterim + eşleşme önceliği). */
export const AISLE_ORDER: readonly Aisle[] = [
  'manav',
  'kasap',
  'sutKahvalti',
  'firin',
  'temel',
  'atistirmalik',
  'icecek',
  'donuk',
  'temizlik',
  'kisisel',
  'bebekEvcil',
  'diger',
];

export const AISLE_LABELS: Record<Aisle, string> = {
  manav: 'Manav (meyve & sebze)',
  kasap: 'Et, tavuk, balık & şarküteri',
  sutKahvalti: 'Süt ürünleri & kahvaltılık',
  firin: 'Fırın & ekmek',
  temel: 'Temel gıda (bakliyat, baharat, konserve)',
  atistirmalik: 'Atıştırmalık & tatlı',
  icecek: 'İçecek',
  donuk: 'Donuk & dondurma',
  temizlik: 'Temizlik & kâğıt',
  kisisel: 'Kişisel bakım',
  bebekEvcil: 'Bebek & evcil hayvan',
  diger: 'Diğer',
};

/**
 * Reyon anahtar kelimeleri. Eşleşme kuralı (groceryAisle):
 * - Tek kelimelik anahtar: ürün adındaki bir kelimeyle birebir ya da (3+ harfse)
 *   önek eşleşir — Türkçe ekleri yakalar (elma→elmalar), kısa kelimelerde (su, et,
 *   un) yanlış eşleşmeyi önler.
 * - Boşluklu anahtar: ürün adının tamamında aranır (ör. "tuvalet kağıdı").
 * AISLE_ORDER sırası öncelik belirler; çakışan kelimelerde önce gelen kazanır.
 */
const AISLE_KEYWORDS: Record<Exclude<Aisle, 'diger'>, readonly string[]> = {
  manav: [
    // Meyve
    'elma', 'armut', 'muz', 'portakal', 'mandalina', 'limon', 'greyfurt', 'üzüm', 'uzum',
    'çilek', 'cilek', 'kiraz', 'vişne', 'visne', 'erik', 'kayısı', 'kayisi', 'şeftali', 'seftali',
    'nektarin', 'kavun', 'karpuz', 'nar', 'incir', 'ayva', 'avokado', 'avakado', 'ananas', 'kivi',
    'mango', 'hurma', 'dut', 'böğürtlen', 'ahududu', 'mersin', 'narenciye', 'meyve',
    // Sebze
    'domates', 'salatalık', 'salatalik', 'biber', 'patlıcan', 'patlican', 'kabak', 'patates',
    'soğan', 'sogan', 'sarımsak', 'sarimsak', 'havuç', 'havuc', 'marul', 'kıvırcık', 'kivircik',
    'maydanoz', 'dereotu', 'nane', 'roka', 'ıspanak', 'ispanak', 'pırasa', 'pirasa', 'lahana',
    'karnabahar', 'karnıbahar', 'brokoli', 'bezelye', 'bamya', 'enginar', 'turp', 'pancar',
    'kereviz', 'mantar', 'mısır', 'misir', 'börülce', 'semizotu', 'zencefil', 'balkabağı',
    'balkabagi', 'sebze', 'yeşillik', 'yesillik', 'zerzevat', 'manav',
  ],
  kasap: [
    'et', 'kıyma', 'kiyma', 'biftek', 'bonfile', 'antrikot', 'kuşbaşı', 'kusbasi', 'pirzola',
    'kuzu', 'dana', 'sığır', 'sigir', 'köfte', 'kofte', 'tavuk', 'but', 'göğüs', 'gogus', 'kanat',
    'hindi', 'balık', 'balik', 'somon', 'levrek', 'çipura', 'cipura', 'hamsi', 'uskumru',
    'midye', 'karides', 'sucuk', 'sosis', 'salam', 'jambon', 'pastırma', 'pastirma', 'kavurma',
    'ciğer', 'ciger', 'döner', 'doner', 'şarküteri', 'sarkuteri',
  ],
  sutKahvalti: [
    'süt', 'sut', 'yoğurt', 'yogurt', 'ayran', 'kefir', 'peynir', 'kaşar', 'kasar', 'lor',
    'labne', 'krema', 'kaymak', 'tereyağ', 'tereyag', 'tereyağı', 'margarin', 'yumurta', 'bal',
    'reçel', 'recel', 'pekmez', 'tahin', 'helva', 'zeytin', 'kahvaltılık', 'kahvaltilik',
    'çökelek', 'cokelek', 'muhallebi', 'sütlaç', 'sutlac',
  ],
  firin: [
    'ekmek', 'somun', 'baget', 'lavaş', 'lavas', 'pide', 'simit', 'poğaça', 'pogaca', 'açma',
    'acma', 'börek', 'borek', 'çörek', 'corek', 'kek', 'pasta', 'galeta', 'grissini', 'tost',
    'yufka', 'kruvasan', 'kruasan', 'bazlama', 'milföy', 'milfoy',
  ],
  temel: [
    'pirinç', 'pirinc', 'bulgur', 'makarna', 'şehriye', 'sehriye', 'erişte', 'eriste', 'mercimek',
    'nohut', 'fasulye', 'barbunya', 'bakliyat', 'un', 'irmik', 'nişasta', 'nisasta', 'yağ', 'yag',
    'ayçiçek', 'aycicek', 'zeytinyağ', 'zeytinyag', 'zeytinyağı', 'salça', 'salca', 'sirke', 'tuz',
    'şeker', 'seker', 'baharat', 'karabiber', 'kimyon', 'pul biber', 'kekik', 'tarçın', 'tarcin',
    'vanilya', 'maya', 'kabartma', 'konserve', 'ketçap', 'ketcap', 'mayonez', 'hardal', 'sos',
    'soya sosu', 'bulyon', 'çorba', 'corba', 'turşu', 'tursu',
  ],
  atistirmalik: [
    'cips', 'çikolata', 'cikolata', 'gofret', 'bisküvi', 'biskuvi', 'kraker', 'kuruyemiş',
    'kuruyemis', 'fındık', 'findik', 'fıstık', 'fistik', 'ceviz', 'badem', 'leblebi', 'çekirdek',
    'cekirdek', 'kaju', 'şekerleme', 'sekerleme', 'sakız', 'sakiz', 'lokum', 'jelibon', 'draje',
    'marshmallow', 'patlamış', 'patlamis', 'tatlı', 'tatli', 'kurabiye', 'gevrek', 'granola',
  ],
  icecek: [
    'su', 'soda', 'maden suyu', 'kola', 'gazoz', 'meşrubat', 'mesrubat', 'içecek', 'icecek',
    'meyve suyu', 'çay', 'cay', 'kahve', 'nescafe', 'ıhlamur', 'ihlamur', 'limonata', 'şalgam',
    'salgam', 'buzlu çay', 'soğuk çay', 'smoothie', 'şıra', 'sira', 'enerji içeceği',
  ],
  donuk: [
    'dondurma', 'donmuş', 'donmus', 'donuk', 'buz', 'parmak patates', 'donmuş pizza',
    'donmuş sebze', 'donmuş mantı', 'hazır mantı',
  ],
  temizlik: [
    'deterjan', 'çamaşır', 'camasir', 'bulaşık', 'bulasik', 'çamaşır suyu', 'yumuşatıcı',
    'yumusatici', 'sabun', 'temizlik', 'yüzey', 'yuzey', 'camsil', 'kireç', 'kirec', 'sünger',
    'sunger', 'eldiven', 'çöp', 'cop', 'poşet', 'poset', 'peçete', 'pecete', 'kağıt havlu',
    'kagit havlu', 'tuvalet kağıdı', 'tuvalet kagidi', 'havlu', 'ıslak mendil', 'oda spreyi',
    'koku giderici', 'çamaşır deterjanı', 'bulaşık deterjanı',
  ],
  kisisel: [
    'şampuan', 'sampuan', 'saç kremi', 'sac kremi', 'duş jeli', 'dus jeli', 'diş macunu',
    'dis macunu', 'macun', 'diş fırçası', 'dis fircasi', 'jilet', 'tıraş', 'tiras', 'deodorant',
    'parfüm', 'parfum', 'kolonya', 'krem', 'nemlendirici', 'güneş kremi', 'gunes kremi', 'makyaj',
    'ruj', 'fondöten', 'fondoten', 'ped', 'tampon', 'pamuk', 'oje', 'el kremi',
  ],
  bebekEvcil: [
    'bebek bezi', 'bebek maması', 'bebek mamasi', 'bebek', 'biberon', 'emzik', 'mama',
    'kedi maması', 'kedi mamasi', 'köpek maması', 'kopek mamasi', 'kedi kumu', 'kuş yemi',
    'kus yemi', 'balık yemi', 'evcil', 'pet shop',
  ],
};

function tokenize(lower: string): string[] {
  return lower.split(/[\s,./()\-–_]+/).filter(Boolean);
}

/** Bir ürün adının düştüğü reyon (anahtar kelimeye göre; bulunamazsa "diğer"). */
export function groceryAisle(name: string): Aisle {
  const lower = name.toLocaleLowerCase('tr').trim();
  if (!lower) return 'diger';
  const tokens = tokenize(lower);
  for (const aisle of AISLE_ORDER) {
    if (aisle === 'diger') continue;
    for (const kw of AISLE_KEYWORDS[aisle]) {
      if (kw.includes(' ')) {
        if (lower.includes(kw)) return aisle;
      } else if (tokens.some((tok) => tok === kw || (kw.length >= 3 && tok.startsWith(kw)))) {
        return aisle;
      }
    }
  }
  return 'diger';
}

/** Geçerli bir Aisle anahtarı mı? (manuel kategori doğrulaması) */
export function isAisle(value: string | undefined | null): value is Aisle {
  return value != null && (AISLE_ORDER as readonly string[]).includes(value);
}

/**
 * Bir ürünün reyonu: kullanıcı elle bir kategori seçtiyse (geçerliyse) o; yoksa
 * ada göre otomatik tahmin.
 */
export function aisleOf(item: { name: string; aisle?: string }): Aisle {
  return isAisle(item.aisle) ? item.aisle : groceryAisle(item.name);
}

export interface AisleGroup<T> {
  aisle: Aisle;
  label: string;
  items: T[];
}

/** Ürünleri reyona göre, markette dolaşma sırasıyla gruplar. */
export function groupItemsByAisle<T extends { name: string; aisle?: string }>(
  items: T[],
): AisleGroup<T>[] {
  const buckets = new Map<Aisle, T[]>();
  for (const it of items) {
    const a = aisleOf(it);
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
