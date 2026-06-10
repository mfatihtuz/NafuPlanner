/**
 * Türkçe metinler (varsayılan dil).
 *
 * Düz, noktalı anahtarlar kullanıyoruz; bu sayede `t()` çağrılarında tam
 * otomatik tamamlama ve tip denetimi olur. İnterpolasyon için {{deger}}.
 */
export const tr = {
  'common.appName': 'Nafu Planlayıcı',
  'common.tagline': 'Evi birlikte, tıkır tıkır yönetin',
  'common.loading': 'Yükleniyor…',
  'common.retry': 'Tekrar dene',
  'common.cancel': 'Vazgeç',
  'common.save': 'Kaydet',
  'common.delete': 'Sil',
  'common.done': 'Tamam',
  'common.next': 'İleri',
  'common.back': 'Geri',
  'common.settings': 'Ayarlar',
  'common.logout': 'Çıkış yap',
  'common.comingSoon': 'Çok yakında',

  'auth.welcomeTitle': 'Merhaba, ben Nafu!',
  'auth.welcomeSubtitle':
    'Ev işlerini, alışverişi ve hatırlatmaları birlikte yönetelim. Hiçbir şey unutulmasın.',
  'auth.googleButton': 'Google ile devam et',
  'auth.signingIn': 'Giriş yapılıyor…',
  'auth.signInError': 'Giriş yapılamadı. Lütfen tekrar dene.',
  'auth.configMissingTitle': 'Kurulum tamamlanmadı',
  'auth.configMissing':
    'Firebase yapılandırması eksik. Geliştirici notu: .env dosyasını doldurun.',

  'tabs.today': 'Bugün',
  'tabs.tasks': 'Görevler',
  'tabs.shopping': 'Alışveriş',
  'tabs.household': 'Hane',

  'today.greetingMorning': 'Günaydın',
  'today.greetingAfternoon': 'İyi günler',
  'today.greetingEvening': 'İyi akşamlar',
  'today.title': 'Bugün',
  'today.emptyTitle': 'Bugün için her şey tıkırında',
  'today.emptyBody': 'Henüz bekleyen bir işin yok. Nafu seninle gurur duyuyor.',

  'tasks.title': 'Görevler',
  'tasks.empty': 'Henüz görev yok. İlk görevini ekleyerek başla.',
  'tasks.add': 'Görev ekle',

  'shopping.title': 'Alışveriş Listesi',
  'shopping.empty': 'Liste boş. Eksikleri eklemeye başla.',
  'shopping.add': 'Ürün ekle',

  'household.title': 'Hane',
  'household.create': 'Hane oluştur',
  'household.join': 'Davetle katıl',
  'household.members': 'Üyeler',
  'household.invite': 'Davet et',
  'household.empty': 'Henüz bir haneye bağlı değilsin.',

  'profile.title': 'Profil',
  'profile.points': 'Puan',
  'profile.streak': 'Seri',
} as const;

export type TranslationKey = keyof typeof tr;
