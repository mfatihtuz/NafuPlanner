-- NafuPlanner veritabani semasi
-- MySQL 8 / MariaDB uyumlu, InnoDB, utf8mb4 (tam Turkce ve Unicode destegi)
-- Tum tablolar np_ on eki ile (paylasimli hosting ve rezerve kelime guvenligi icin)
--
-- Kurulum: phpMyAdmin > veritabanini sec > Ice Aktar > bu dosyayi yukle
-- veya: mysql -u KULLANICI -p VERITABANI < db/schema.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- Kimlik ve gruplar
-- ----------------------------------------------------------------------------

-- Kullanicilar (yalnizca Google ile giris)
CREATE TABLE IF NOT EXISTS np_users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  google_sub    VARCHAR(255) NOT NULL,            -- Google hesabinin benzersiz kimligi (sub)
  email         VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(1024) DEFAULT NULL,
  locale        VARCHAR(10) NOT NULL DEFAULT 'tr',
  timezone      VARCHAR(64) NOT NULL DEFAULT 'Europe/Istanbul',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_seen_at  TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_google_sub (google_sub),
  KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gruplar (ortak alanlar). 1, 2 veya daha cok kisi.
CREATE TABLE IF NOT EXISTS np_groups (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  color       VARCHAR(24) NOT NULL DEFAULT 'tropical_teal',  -- palet anahtari
  icon        VARCHAR(50) NOT NULL DEFAULT 'home',           -- Lucide ikon adi
  created_by  BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_groups_created_by (created_by),
  CONSTRAINT fk_groups_created_by FOREIGN KEY (created_by) REFERENCES np_users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grup uyelikleri (bir kullanici birden cok grupta olabilir). Oyunlastirma sayaclari burada.
CREATE TABLE IF NOT EXISTS np_group_members (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id            BIGINT UNSIGNED NOT NULL,
  user_id             BIGINT UNSIGNED NOT NULL,
  role                ENUM('owner','member') NOT NULL DEFAULT 'member',
  display_name        VARCHAR(120) DEFAULT NULL,    -- grup icindeki takma ad (opsiyonel)
  points              INT NOT NULL DEFAULT 0,       -- toplam puan (puan defterinden turetilir, hizli erisim icin onbellek)
  streak_current      INT NOT NULL DEFAULT 0,
  streak_best         INT NOT NULL DEFAULT 0,
  last_completed_date DATE DEFAULT NULL,            -- seri hesabi icin
  joined_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_member (group_id, user_id),
  KEY idx_member_user (user_id),
  CONSTRAINT fk_member_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_member_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Davet linkleri
CREATE TABLE IF NOT EXISTS np_invitations (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id    BIGINT UNSIGNED NOT NULL,
  token       CHAR(40) NOT NULL,                   -- linkteki gizli anahtar
  created_by  BIGINT UNSIGNED NOT NULL,
  role        ENUM('owner','member') NOT NULL DEFAULT 'member',
  expires_at  DATETIME DEFAULT NULL,
  max_uses    INT DEFAULT NULL,                    -- NULL = sinirsiz
  used_count  INT NOT NULL DEFAULT 0,
  revoked_at  DATETIME DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inv_token (token),
  KEY idx_inv_group (group_id),
  CONSTRAINT fk_inv_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_creator FOREIGN KEY (created_by) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Icerik: kategoriler, gorevler, alt parcalar
-- ----------------------------------------------------------------------------

-- Kategoriler (her grup icin; grup olusturulurken varsayilanlar tohumlanir)
CREATE TABLE IF NOT EXISTS np_categories (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id    BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(80) NOT NULL,
  color       VARCHAR(24) NOT NULL DEFAULT 'teal',
  icon        VARCHAR(50) NOT NULL DEFAULT 'list',
  sort_order  INT NOT NULL DEFAULT 0,
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cat_group (group_id),
  CONSTRAINT fk_cat_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tekrar serisi (tekrarlayan gorevlerin sablonu). Somut gorevler np_tasks icinde uretilir.
-- recurrence_rule JSON ornegi:
--   { "freq":"weekly", "interval":1, "byweekday":[1,4], "time":"20:00" }
--   freq: daily | weekly | monthly ; byweekday: 0=Pazartesi ... 6=Pazar
CREATE TABLE IF NOT EXISTS np_task_series (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id            BIGINT UNSIGNED NOT NULL,
  category_id         BIGINT UNSIGNED DEFAULT NULL,
  title               VARCHAR(255) NOT NULL,
  notes               TEXT DEFAULT NULL,
  priority            TINYINT NOT NULL DEFAULT 1,       -- 0=dusuk 1=normal 2=yuksek
  recurrence_rule     JSON NOT NULL,
  reminder_offsets    JSON DEFAULT NULL,                -- ornek: [1440, 60] (son tarihten kac dk once)
  active              TINYINT(1) NOT NULL DEFAULT 1,
  created_by          BIGINT UNSIGNED NOT NULL,
  last_generated_date DATE DEFAULT NULL,                -- jeneratorun en son urettigi tarih
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_series_group (group_id),
  KEY idx_series_active (active),
  CONSTRAINT fk_series_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_series_cat FOREIGN KEY (category_id) REFERENCES np_categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_series_creator FOREIGN KEY (created_by) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gorevler (hem tek seferlik hem tekrar serisinden uretilen somut isler)
CREATE TABLE IF NOT EXISTS np_tasks (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id          BIGINT UNSIGNED NOT NULL,
  category_id       BIGINT UNSIGNED DEFAULT NULL,
  series_id         BIGINT UNSIGNED DEFAULT NULL,      -- tekrar serisinden uretildi ise
  occurrence_date   DATE DEFAULT NULL,                 -- serideki hangi gune ait oldugu
  title             VARCHAR(255) NOT NULL,
  notes             TEXT DEFAULT NULL,
  priority          TINYINT NOT NULL DEFAULT 1,        -- 0=dusuk 1=normal 2=yuksek
  status            ENUM('open','done') NOT NULL DEFAULT 'open',
  due_at            DATETIME DEFAULT NULL,
  due_has_time      TINYINT(1) NOT NULL DEFAULT 0,     -- 0 ise tum gun (saat onemsiz)
  created_by        BIGINT UNSIGNED NOT NULL,
  completed_by      BIGINT UNSIGNED DEFAULT NULL,
  completed_at      DATETIME DEFAULT NULL,
  escalation_level  TINYINT NOT NULL DEFAULT 0,        -- yukselen hatirlatma kademesi
  archived_at       DATETIME DEFAULT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_group_status (group_id, status),
  KEY idx_tasks_due (due_at),
  KEY idx_tasks_series (series_id),
  UNIQUE KEY uq_series_occurrence (series_id, occurrence_date),
  CONSTRAINT fk_tasks_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_cat FOREIGN KEY (category_id) REFERENCES np_categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_series FOREIGN KEY (series_id) REFERENCES np_task_series (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) REFERENCES np_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_tasks_completer FOREIGN KEY (completed_by) REFERENCES np_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Goreve atanan kisiler (bir veya birden cok)
CREATE TABLE IF NOT EXISTS np_task_assignees (
  task_id  BIGINT UNSIGNED NOT NULL,
  user_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (task_id, user_id),
  KEY idx_ta_user (user_id),
  CONSTRAINT fk_ta_task FOREIGN KEY (task_id) REFERENCES np_tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_ta_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tekrar serisine varsayilan atanan kisiler (uretilen gorevlere kopyalanir)
CREATE TABLE IF NOT EXISTS np_task_series_assignees (
  series_id  BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (series_id, user_id),
  CONSTRAINT fk_tsa_series FOREIGN KEY (series_id) REFERENCES np_task_series (id) ON DELETE CASCADE,
  CONSTRAINT fk_tsa_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alt gorevler / kontrol listesi
CREATE TABLE IF NOT EXISTS np_subtasks (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id     BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  done        TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sub_task (task_id),
  CONSTRAINT fk_sub_task FOREIGN KEY (task_id) REFERENCES np_tasks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gorev yorumlari / notlari (WhatsApp konusmasinin yerini tutar)
CREATE TABLE IF NOT EXISTS np_task_comments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id     BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cmt_task (task_id),
  CONSTRAINT fk_cmt_task FOREIGN KEY (task_id) REFERENCES np_tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_cmt_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gorev fotograflari / ekleri
CREATE TABLE IF NOT EXISTS np_task_attachments (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id        BIGINT UNSIGNED NOT NULL,
  user_id        BIGINT UNSIGNED NOT NULL,
  file_path      VARCHAR(512) NOT NULL,    -- sunucudaki yol (uploads/...)
  original_name  VARCHAR(255) DEFAULT NULL,
  mime           VARCHAR(100) DEFAULT NULL,
  size_bytes     INT DEFAULT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_att_task (task_id),
  CONSTRAINT fk_att_task FOREIGN KEY (task_id) REFERENCES np_tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Etiketler
CREATE TABLE IF NOT EXISTS np_tags (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id  BIGINT UNSIGNED NOT NULL,
  name      VARCHAR(60) NOT NULL,
  color     VARCHAR(24) NOT NULL DEFAULT 'pearl_aqua',
  PRIMARY KEY (id),
  UNIQUE KEY uq_tag (group_id, name),
  CONSTRAINT fk_tag_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS np_task_tags (
  task_id  BIGINT UNSIGNED NOT NULL,
  tag_id   BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  CONSTRAINT fk_tt_task FOREIGN KEY (task_id) REFERENCES np_tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_tag FOREIGN KEY (tag_id) REFERENCES np_tags (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ortak alisveris listesi (anlik paylasimli)
CREATE TABLE IF NOT EXISTS np_shopping_items (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id    BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(255) NOT NULL,
  quantity    VARCHAR(50) DEFAULT NULL,
  note        VARCHAR(255) DEFAULT NULL,
  checked     TINYINT(1) NOT NULL DEFAULT 0,
  checked_by  BIGINT UNSIGNED DEFAULT NULL,
  checked_at  DATETIME DEFAULT NULL,
  added_by    BIGINT UNSIGNED NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_shop_group (group_id, checked),
  CONSTRAINT fk_shop_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_added FOREIGN KEY (added_by) REFERENCES np_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_checked FOREIGN KEY (checked_by) REFERENCES np_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Hatirlatma ve bildirim
-- ----------------------------------------------------------------------------

-- Zamanlanmis hatirlatmalar (cron tarar ve gonderir)
CREATE TABLE IF NOT EXISTS np_reminders (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id     BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED DEFAULT NULL,        -- NULL = tum atananlar/uyeler
  remind_at   DATETIME NOT NULL,
  kind        ENUM('pre','due','escalation','digest') NOT NULL DEFAULT 'due',
  status      ENUM('pending','sent','skipped','canceled') NOT NULL DEFAULT 'pending',
  attempt     INT NOT NULL DEFAULT 0,
  sent_at     DATETIME DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rem_due (status, remind_at),
  KEY idx_rem_task (task_id),
  CONSTRAINT fk_rem_task FOREIGN KEY (task_id) REFERENCES np_tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_rem_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Web Push abonelikleri (cihaz basina)
CREATE TABLE IF NOT EXISTS np_push_subscriptions (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  endpoint     VARCHAR(512) NOT NULL,
  p256dh       VARCHAR(255) NOT NULL,
  auth         VARCHAR(255) NOT NULL,
  user_agent   VARCHAR(255) DEFAULT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_endpoint (endpoint),
  KEY idx_push_user (user_id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bildirim ayarlari (kullanici basina; group_id NULL = genel varsayilan)
CREATE TABLE IF NOT EXISTS np_notification_settings (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id              BIGINT UNSIGNED NOT NULL,
  group_id             BIGINT UNSIGNED DEFAULT NULL,
  quiet_start          TIME NOT NULL DEFAULT '22:00:00',
  quiet_end            TIME NOT NULL DEFAULT '08:00:00',
  daily_digest_enabled TINYINT(1) NOT NULL DEFAULT 1,
  daily_digest_time    TIME NOT NULL DEFAULT '08:00:00',
  max_push_per_day     INT NOT NULL DEFAULT 6,        -- spam onleme: gunluk ust sinir
  partner_nudge        TINYINT(1) NOT NULL DEFAULT 1, -- gecikince diger uyelere durtme
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notif (user_id, group_id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gunluk gonderilen push sayaci (spam ust sinirini uygulamak icin)
CREATE TABLE IF NOT EXISTS np_push_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  sent_date   DATE NOT NULL,
  sent_count  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pushlog (user_id, sent_date),
  CONSTRAINT fk_pushlog_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Oyunlastirma
-- ----------------------------------------------------------------------------

-- Puan defteri (katki tablosu ve seviyeler bundan turetilir)
CREATE TABLE IF NOT EXISTS np_points_ledger (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id    BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  task_id     BIGINT UNSIGNED DEFAULT NULL,
  points      INT NOT NULL,
  reason      VARCHAR(120) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pts_group_user (group_id, user_id),
  KEY idx_pts_created (created_at),
  CONSTRAINT fk_pts_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_pts_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_pts_task FOREIGN KEY (task_id) REFERENCES np_tasks (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rozet katalogu (tohumlanir, asagida)
CREATE TABLE IF NOT EXISTS np_badges (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(50) NOT NULL,
  name            VARCHAR(120) NOT NULL,
  description     VARCHAR(255) NOT NULL,
  icon            VARCHAR(50) NOT NULL DEFAULT 'award',
  threshold_type  VARCHAR(50) NOT NULL,    -- ornek: tasks_completed, streak_days, points_total
  threshold_value INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_badge_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kazanilan rozetler
CREATE TABLE IF NOT EXISTS np_member_badges (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_member_id  BIGINT UNSIGNED NOT NULL,
  badge_id         BIGINT UNSIGNED NOT NULL,
  earned_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_member_badge (group_member_id, badge_id),
  CONSTRAINT fk_mb_member FOREIGN KEY (group_member_id) REFERENCES np_group_members (id) ON DELETE CASCADE,
  CONSTRAINT fk_mb_badge FOREIGN KEY (badge_id) REFERENCES np_badges (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Sistem: aktivite akisi ve oturumlar
-- ----------------------------------------------------------------------------

-- Aktivite akisi (kim ne yapti; WhatsApp hissi ve durtme kaynagi)
CREATE TABLE IF NOT EXISTS np_activity_log (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id      BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED DEFAULT NULL,
  action        VARCHAR(50) NOT NULL,     -- task_created, task_completed, comment_added, ...
  target_type   VARCHAR(50) DEFAULT NULL, -- task, shopping_item, ...
  target_id     BIGINT UNSIGNED DEFAULT NULL,
  summary       VARCHAR(255) DEFAULT NULL,
  meta          JSON DEFAULT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_act_group (group_id, created_at),
  CONSTRAINT fk_act_group FOREIGN KEY (group_id) REFERENCES np_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_act_actor FOREIGN KEY (actor_user_id) REFERENCES np_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Yenileme oturumlari (JWT yenileme / cikis icin)
CREATE TABLE IF NOT EXISTS np_auth_sessions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,        -- yenileme jetonunun SHA-256 ozeti
  user_agent  VARCHAR(255) DEFAULT NULL,
  ip          VARCHAR(45) DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_token (token_hash),
  KEY idx_session_user (user_id),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES np_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
