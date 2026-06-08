// API tipleri — db/schema.sql'i birebir snake_case yansitir.
// Ara donusum katmani yok: DB, JSON ve buradaki arayuzler ayni alan adlarini kullanir.
// Tarihler ISO-8601 UTC dize (ornek: "2026-06-08T19:00:00Z"); istemci yerel saate cevirir.

/** API zarfi (CONVENTIONS.md). Basari: { ok:true, data }, hata: { ok:false, error }. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiErrorBody;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

// --- Ortak takma adlar ----------------------------------------------------

/** BIGINT UNSIGNED degerleri tasmayi onlemek icin dize tasinir. */
export type Id = string;
/** ISO-8601 UTC zaman damgasi. */
export type IsoDateTime = string;
/** YYYY-MM-DD bicimli tarih. */
export type IsoDate = string;

/** Gorev onceligi: 0=dusuk, 1=normal, 2=yuksek. */
export type Priority = 0 | 1 | 2;
export type TaskStatus = 'open' | 'done';
export type MemberRole = 'owner' | 'member';

// --- Kimlik ve gruplar ----------------------------------------------------

export interface User {
  id: Id;
  email: string;
  name: string;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  last_seen_at: IsoDateTime | null;
}

export interface Group {
  id: Id;
  name: string;
  color: string; // palet anahtari (ornek: 'tropical_teal')
  icon: string; // Lucide ikon adi
  created_by: Id;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  /** Sunucu ekledigi turetilmis alan: kullanicinin bu gruptaki rolu. */
  role?: MemberRole;
  /** Sunucu ekledigi turetilmis alan: uye sayisi. */
  member_count?: number;
}

export interface GroupMember {
  id: Id;
  group_id: Id;
  user_id: Id;
  role: MemberRole;
  display_name: string | null;
  points: number;
  streak_current: number;
  streak_best: number;
  last_completed_date: IsoDate | null;
  joined_at: IsoDateTime;
  /** Sunucu ekledigi turetilmis kullanici ozeti (ad, avatar). */
  user?: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

// --- Kategoriler ----------------------------------------------------------

export interface Category {
  id: Id;
  group_id: Id;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_default: boolean;
  created_at: IsoDateTime;
}

// --- Gorevler -------------------------------------------------------------

export interface Subtask {
  id: Id;
  task_id: Id;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: IsoDateTime;
}

export interface TaskComment {
  id: Id;
  task_id: Id;
  user_id: Id;
  body: string;
  created_at: IsoDateTime;
  user?: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

export interface TaskAttachment {
  id: Id;
  task_id: Id;
  user_id: Id;
  file_path: string;
  original_name: string | null;
  mime: string | null;
  size_bytes: number | null;
  created_at: IsoDateTime;
}

export interface Task {
  id: Id;
  group_id: Id;
  category_id: Id | null;
  series_id: Id | null;
  occurrence_date: IsoDate | null;
  title: string;
  notes: string | null;
  priority: Priority;
  status: TaskStatus;
  due_at: IsoDateTime | null;
  due_has_time: boolean;
  created_by: Id;
  completed_by: Id | null;
  completed_at: IsoDateTime | null;
  escalation_level: number;
  archived_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  /** Sunucu ekledigi turetilmis alanlar. */
  assignee_ids?: Id[];
  subtasks?: Subtask[];
  comment_count?: number;
  /** Detay yanitinda gomulu gelebilir; gelmezse ayri uctan cekilir. */
  attachments?: TaskAttachment[];
  /** Etiket adlari (varsa). */
  tags?: string[];
}

// --- Tekrar serileri ------------------------------------------------------

export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
  /** 0=Pazartesi ... 6=Pazar */
  byweekday?: number[];
  /** "HH:MM" */
  time?: string;
}

export interface TaskSeries {
  id: Id;
  group_id: Id;
  category_id: Id | null;
  title: string;
  notes: string | null;
  priority: Priority;
  recurrence_rule: RecurrenceRule;
  reminder_offsets: number[] | null;
  active: boolean;
  created_by: Id;
  last_generated_date: IsoDate | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  assignee_ids?: Id[];
}

// --- Alisveris ------------------------------------------------------------

export interface ShoppingItem {
  id: Id;
  group_id: Id;
  name: string;
  quantity: string | null;
  note: string | null;
  checked: boolean;
  checked_by: Id | null;
  checked_at: IsoDateTime | null;
  added_by: Id;
  sort_order: number;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

// --- Oyunlastirma / akis --------------------------------------------------

export interface Badge {
  id: Id;
  code: string;
  name: string;
  description: string;
  icon: string;
  threshold_type: string; // tasks_completed | streak_days | points_total
  threshold_value: number;
  /** Sunucu ekledigi turetilmis alan: bu rozet kazanildi mi. */
  earned_at?: IsoDateTime | null;
}

export interface LeaderboardRow {
  user_id: Id;
  display_name: string;
  avatar_url: string | null;
  points: number;
  streak_current: number;
  rank: number;
  tasks_completed?: number;
}

export interface Activity {
  id: Id;
  group_id: Id;
  actor_user_id: Id | null;
  action: string; // task_created | task_completed | comment_added | ...
  target_type: string | null; // task | shopping_item | ...
  target_id: Id | null;
  summary: string | null;
  meta: Record<string, unknown> | null;
  created_at: IsoDateTime;
  actor?: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

// --- Bildirim ayarlari ----------------------------------------------------

export interface NotificationSettings {
  id: Id;
  user_id: Id;
  group_id: Id | null;
  /** "HH:MM:SS" */
  quiet_start: string;
  quiet_end: string;
  daily_digest_enabled: boolean;
  daily_digest_time: string;
  max_push_per_day: number;
  partner_nudge: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

// --- Birlesik yanit tipleri ----------------------------------------------

/** GET /api/me yaniti. */
export interface MeResponse {
  user: User;
  groups: Group[];
}

/** POST /api/auth/google yaniti. */
export interface AuthResponse {
  user: User;
}

/** GET /api/config: istemcinin calisma aninda okudugu acik yapilandirma. */
export interface AppConfig {
  google_client_id: string | null;
  app_url: string | null;
}

/** GET /api/invitations/{token} onizleme yaniti. */
export interface InvitationPreview {
  group_name: string;
  group_color?: string;
  group_icon?: string;
  inviter_name?: string;
  member_count?: number;
}

/** POST /api/groups/{id}/invitations yaniti. */
export interface InvitationCreated {
  token: string;
  url: string;
}
