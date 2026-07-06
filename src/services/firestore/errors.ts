import { t } from '@/i18n';

/**
 * Firestore hata kodunu kullanıcı mesajına çevirir. İzin reddi
 * (permission-denied) neredeyse her zaman "güvenlik kuralları eski/
 * yayınlanmamış" demektir; ona özel yönlendirme gösterir, aksi halde verilen
 * yedek mesajı döndürür. Tek kaynak: tüm ekranlar bunu kullanır (mesaj
 * eşlemesi kopyalanmasın).
 */
export function firestoreErrorMessage(error: unknown, fallback: string): string {
  return (error as { code?: string }).code === 'permission-denied'
    ? t('common.errorRules')
    : fallback;
}
