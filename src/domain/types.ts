/**
 * Nafu Planlayıcı — alan (domain) modeli.
 *
 * Platformdan bağımsız tipler. Firestore'a yazılırken zaman alanları
 * Firestore Timestamp'e çevrilir; alan katmanında epoch milisaniye (number)
 * kullanırız ki iş kuralları saf ve test edilebilir kalsın.
 */

export type Id = string;
/** Epoch milisaniye. */
export type Millis = number;
/** Gün anahtarı "YYYY-MM-DD" (yerel gün bazlı seriler/tekrarlar için). */
export type DayKey = string;

export interface ClockTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

// --- Kullanıcı & Hane ---------------------------------------------------------

export interface User {
  id: Id;
  displayName: string;
  email: string;
  photoUrl?: string;
  locale?: string;
  createdAtMs: Millis;
}

/** Kullanıcının bildirim tercihleri (users/{uid}.settings altında gömülü). */
export interface UserSettings {
  quietHoursStart?: ClockTime;
  quietHoursEnd?: ClockTime;
  dailyDigestEnabled: boolean;
  dailyDigestTime?: ClockTime;
  nudgesEnabled: boolean;
}

/** users/{uid} belgesi: profil + aktif hane bağlantısı. */
export interface UserProfile extends User {
  householdId: Id | null;
  settings?: UserSettings;
}

export type HouseholdRole = 'owner' | 'member';

export interface Household {
  id: Id;
  name: string;
  createdBy: Id;
  createdAtMs: Millis;
  memberIds: Id[];
}

/** Bir kullanıcının bir hane içindeki üyelik + oyunlaştırma durumu. */
export interface Member {
  userId: Id;
  householdId: Id;
  role: HouseholdRole;
  displayName: string;
  photoUrl?: string;
  points: number;
  level: number;
  streakCount: number;
  lastActiveDayKey?: DayKey;
  joinedAtMs: Millis;
  /**
   * Cihazlar arası bildirim için denormalize alanlar: kullanıcı ayarları
   * users/{uid} altında durur (yalnızca sahibi okur); push gönderebilmek için
   * token + sessiz saat + dürtme izni üyelik belgesine kopyalanır.
   */
  pushToken?: string;
  pushTokenUpdatedAtMs?: Millis;
  quietHoursStart?: ClockTime;
  quietHoursEnd?: ClockTime;
  nudgesEnabled?: boolean;
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Invitation {
  token: Id;
  householdId: Id;
  createdBy: Id;
  createdAtMs: Millis;
  expiresAtMs: Millis;
  status: InvitationStatus;
}

// --- Kategoriler --------------------------------------------------------------

export interface Category {
  id: Id;
  householdId: Id;
  name: string;
  /** palette anahtarı veya hex; UI renklendirme için. */
  color: string;
  /** ikon anahtarı (bkz. ui/icons). */
  icon: string;
  isDefault: boolean;
  order: number;
}

// --- Görevler -----------------------------------------------------------------

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'archived';

export interface Subtask {
  id: Id;
  title: string;
  done: boolean;
}

export interface Task {
  id: Id;
  householdId: Id;
  title: string;
  description?: string;
  categoryId?: Id;
  priority: Priority;
  status: TaskStatus;
  /** Son tarih (varsa). Saat içeriyorsa hasTime=true. */
  dueAtMs?: Millis;
  hasTime: boolean;
  assigneeIds: Id[];
  subtasks: Subtask[];
  recurrenceId?: Id;
  /** Tekrar eden bir kuraldan üretildiyse o günün anahtarı. */
  occurrenceDayKey?: DayKey;
  points: number;
  attachmentsCount: number;
  commentsCount: number;
  createdBy: Id;
  createdAtMs: Millis;
  completedBy?: Id;
  completedAtMs?: Millis;
}

export interface TaskComment {
  id: Id;
  taskId: Id;
  householdId: Id;
  authorId: Id;
  body: string;
  createdAtMs: Millis;
}

export interface Attachment {
  id: Id;
  taskId: Id;
  householdId: Id;
  storagePath: string;
  url?: string;
  kind: 'image';
  uploadedBy: Id;
  createdAtMs: Millis;
}

// --- Alışveriş ----------------------------------------------------------------

export interface ShoppingItem {
  id: Id;
  householdId: Id;
  name: string;
  quantity?: string;
  note?: string;
  categoryId?: Id;
  checked: boolean;
  addedBy: Id;
  addedAtMs: Millis;
  checkedBy?: Id;
  checkedAtMs?: Millis;
}

// --- Tekrar (esnek kalıplar) --------------------------------------------------

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'interval';

export interface RecurrenceRule {
  id: Id;
  householdId: Id;
  frequency: RecurrenceFrequency;
  /** interval/weekly/daily için N (örn. her 3 günde bir → interval, interval=3). */
  interval?: number;
  /** weekly için 0=Pazar … 6=Cumartesi seçili günler. */
  weekdays?: number[];
  /** monthly için ayın günü (1-31). */
  monthDay?: number;
  /** Üretilen görevin saati (varsa). */
  time?: ClockTime;
  startDayKey: DayKey;
  endDayKey?: DayKey;
  /** Şablon görev alanları (başlık, kategori, atananlar, öncelik vb.). */
  template: Pick<
    Task,
    'title' | 'description' | 'categoryId' | 'priority' | 'assigneeIds' | 'points'
  >;
  active: boolean;
  createdBy: Id;
  createdAtMs: Millis;
  /** Üretilen en son örneğin günü (idempotent ilerletme için). */
  lastSpawnedDayKey?: DayKey;
}

// --- Aktivite akışı -----------------------------------------------------------

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_nudged'
  | 'member_joined';

export interface ActivityEntry {
  id: Id;
  householdId: Id;
  type: ActivityType;
  actorId: Id;
  actorName: string;
  taskId?: Id;
  taskTitle?: string;
  /** Dürtmede hedef kişiler (görüntüleme için adlar). */
  targetNames?: string[];
  atMs: Millis;
}

// --- Hatırlatma & Bildirim ----------------------------------------------------

export type ReminderKind = 'due' | 'pre' | 'nudge' | 'escalation' | 'digest';

export interface Reminder {
  id: Id;
  householdId: Id;
  taskId?: Id;
  atMs: Millis;
  kind: ReminderKind;
  sent: boolean;
}

export type DevicePlatform = 'ios' | 'android' | 'web';

export interface PushToken {
  id: Id;
  userId: Id;
  token: string;
  platform: DevicePlatform;
  createdAtMs: Millis;
}

export interface NotificationSettings {
  userId: Id;
  quietHoursStart?: ClockTime;
  quietHoursEnd?: ClockTime;
  dailyDigestEnabled: boolean;
  dailyDigestTime?: ClockTime;
  nudgesEnabled: boolean;
  /** Geciken görevde eşe/diğer üyeye haber verilsin mi. */
  escalateToPartner: boolean;
}

// --- Oyunlaştırma -------------------------------------------------------------

export interface PointsEntry {
  id: Id;
  householdId: Id;
  userId: Id;
  delta: number;
  reason: string;
  taskId?: Id;
  createdAtMs: Millis;
}

export interface Badge {
  key: string;
  name: string;
  description: string;
  icon: string;
}

export interface MemberBadge {
  badgeKey: string;
  awardedAtMs: Millis;
}

/** Kullanıcı tanımlı gerçek ödüller (örn. "kazanan filmi seçer"). */
export type RewardStatus = 'active' | 'won' | 'archived';

export interface Reward {
  id: Id;
  householdId: Id;
  title: string;
  description?: string;
  costPoints?: number;
  createdBy: Id;
  createdAtMs: Millis;
  status: RewardStatus;
  winnerId?: Id;
}

// --- Aktivite akışı -----------------------------------------------------------

export type ActivityKind =
  | 'task_created'
  | 'task_completed'
  | 'task_assigned'
  | 'task_commented'
  | 'shopping_added'
  | 'shopping_checked'
  | 'nudge'
  | 'badge_awarded'
  | 'reward_won'
  | 'member_joined';

export interface Activity {
  id: Id;
  householdId: Id;
  actorId: Id;
  kind: ActivityKind;
  targetTaskId?: Id;
  targetUserId?: Id;
  message?: string;
  createdAtMs: Millis;
}
