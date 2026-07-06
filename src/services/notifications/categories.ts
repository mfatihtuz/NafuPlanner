/**
 * Eyleme dönük bildirim kategori/aksiyon kimlikleri. Hem kategori kaydı
 * (config.ts), hem push gönderimi (taskWorkflows → categoryId), hem de yanıt
 * işleyici (NotificationActionHandler) aynı sabitleri kullanır.
 */
export const NOTIF_CATEGORY = {
  task: 'task',
  approval: 'approval',
} as const;

export const NOTIF_ACTION = {
  complete: 'complete',
  snooze: 'snooze',
  approve: 'approve',
  reject: 'reject',
} as const;
