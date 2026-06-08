<?php

declare(strict_types=1);

namespace Nafu\Support;

/**
 * Merkezi serilestirme: DB satirlarini types/api.ts sozlesmesine birebir
 * uyan JSON-hazir dizilere cevirir.
 *
 * Sozlesme (web/src/types/api.ts):
 *   - Tum id ve foreign-key alanlari STRING (Id = string). BIGINT UNSIGNED
 *     tasmasini onlemek icin.
 *   - Tarih/zaman alanlari ISO-8601 UTC, sonunda 'Z' ("2026-06-08T08:17:28Z").
 *     DB UTC saklar; "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SSZ".
 *   - tinyint(1) bayraklar gercek boolean.
 *   - Tamsayi sayaclar int.
 *   - JSON kolonlar parse edilip nesne/dizi olarak doner.
 *
 * Her entity icin alan tipleri asagidaki haritalarda tanimlidir. Haritada
 * olmayan alanlar oldugu gibi (dize) gecirilir. Boylece SELECT'e eklenen
 * turetilmis alanlar (orn. group_name) bozulmaz.
 *
 * Kullanim:
 *   Serialize::row($row, Serialize::TASK)
 *   Serialize::rows($rows, Serialize::TASK)
 */
final class Serialize
{
    // Alan tipi sabitleri.
    private const T_ID   = 'id';   // dizeye cevir (FK/PK)
    private const T_DT   = 'dt';   // ISO-8601 UTC + Z
    private const T_DATE = 'date'; // YYYY-MM-DD (oldugu gibi, sadece null korumasi)
    private const T_BOOL = 'bool'; // gercek boolean
    private const T_INT  = 'int';  // tamsayi
    private const T_JSON = 'json'; // JSON kolonu -> parse

    /**
     * np_users -> User
     *
     * @var array<string,string>
     */
    public const USER = [
        'id'           => self::T_ID,
        'created_at'   => self::T_DT,
        'updated_at'   => self::T_DT,
        'last_seen_at' => self::T_DT,
    ];

    /** Kullanici ozeti (yorum/aktivite icine gomulen): id, name, avatar_url. */
    public const USER_SUMMARY = [
        'id' => self::T_ID,
    ];

    /**
     * np_groups (+ uyelik turetilmis alanlari) -> Group
     *
     * @var array<string,string>
     */
    public const GROUP = [
        'id'             => self::T_ID,
        'created_by'     => self::T_ID,
        'created_at'     => self::T_DT,
        'updated_at'     => self::T_DT,
        'member_count'   => self::T_INT,
        // Turetilmis uyelik alanlari (loadGroup/list bunlari da seciyor):
        'points'         => self::T_INT,
        'streak_current' => self::T_INT,
        'streak_best'    => self::T_INT,
        'last_completed_date' => self::T_DATE,
        'joined_at'      => self::T_DT,
    ];

    /**
     * np_group_members -> GroupMember
     *
     * @var array<string,string>
     */
    public const MEMBER = [
        'id'             => self::T_ID,
        'group_id'       => self::T_ID,
        'user_id'        => self::T_ID,
        'points'         => self::T_INT,
        'streak_current' => self::T_INT,
        'streak_best'    => self::T_INT,
        'last_completed_date' => self::T_DATE,
        'joined_at'      => self::T_DT,
    ];

    /**
     * np_categories -> Category
     *
     * @var array<string,string>
     */
    public const CATEGORY = [
        'id'         => self::T_ID,
        'group_id'   => self::T_ID,
        'sort_order' => self::T_INT,
        'is_default' => self::T_BOOL,
        'created_at' => self::T_DT,
    ];

    /**
     * np_tags -> (Tag; types/api.ts'de ayri arayuz yok ama snake_case ayni)
     *
     * @var array<string,string>
     */
    public const TAG = [
        'id'       => self::T_ID,
        'group_id' => self::T_ID,
    ];

    /**
     * np_tasks -> Task
     *
     * @var array<string,string>
     */
    public const TASK = [
        'id'               => self::T_ID,
        'group_id'         => self::T_ID,
        'category_id'      => self::T_ID,
        'series_id'        => self::T_ID,
        'occurrence_date'  => self::T_DATE,
        'priority'         => self::T_INT,
        'due_at'           => self::T_DT,
        'due_has_time'     => self::T_BOOL,
        'created_by'       => self::T_ID,
        'completed_by'     => self::T_ID,
        'completed_at'     => self::T_DT,
        'escalation_level' => self::T_INT,
        'archived_at'      => self::T_DT,
        'created_at'       => self::T_DT,
        'updated_at'       => self::T_DT,
        'comment_count'    => self::T_INT,
    ];

    /**
     * np_subtasks -> Subtask
     *
     * @var array<string,string>
     */
    public const SUBTASK = [
        'id'         => self::T_ID,
        'task_id'    => self::T_ID,
        'done'       => self::T_BOOL,
        'sort_order' => self::T_INT,
        'created_at' => self::T_DT,
    ];

    /**
     * np_task_comments -> TaskComment
     *
     * @var array<string,string>
     */
    public const COMMENT = [
        'id'         => self::T_ID,
        'task_id'    => self::T_ID,
        'user_id'    => self::T_ID,
        'created_at' => self::T_DT,
    ];

    /**
     * np_task_attachments -> TaskAttachment
     *
     * @var array<string,string>
     */
    public const ATTACHMENT = [
        'id'         => self::T_ID,
        'task_id'    => self::T_ID,
        'user_id'    => self::T_ID,
        'size_bytes' => self::T_INT,
        'created_at' => self::T_DT,
    ];

    /**
     * np_task_series -> TaskSeries
     *
     * @var array<string,string>
     */
    public const SERIES = [
        'id'                  => self::T_ID,
        'group_id'            => self::T_ID,
        'category_id'         => self::T_ID,
        'priority'            => self::T_INT,
        'recurrence_rule'     => self::T_JSON,
        'reminder_offsets'    => self::T_JSON,
        'active'              => self::T_BOOL,
        'created_by'          => self::T_ID,
        'last_generated_date' => self::T_DATE,
        'created_at'          => self::T_DT,
        'updated_at'          => self::T_DT,
    ];

    /**
     * np_shopping_items -> ShoppingItem
     *
     * @var array<string,string>
     */
    public const SHOPPING = [
        'id'         => self::T_ID,
        'group_id'   => self::T_ID,
        'checked'    => self::T_BOOL,
        'checked_by' => self::T_ID,
        'checked_at' => self::T_DT,
        'added_by'   => self::T_ID,
        'sort_order' => self::T_INT,
        'created_at' => self::T_DT,
        'updated_at' => self::T_DT,
    ];

    /**
     * np_activity_log -> Activity
     *
     * @var array<string,string>
     */
    public const ACTIVITY = [
        'id'            => self::T_ID,
        'group_id'      => self::T_ID,
        'actor_user_id' => self::T_ID,
        'target_id'     => self::T_ID,
        'meta'          => self::T_JSON,
        'created_at'    => self::T_DT,
    ];

    /**
     * np_badges -> Badge
     *
     * @var array<string,string>
     */
    public const BADGE = [
        'id'              => self::T_ID,
        'threshold_value' => self::T_INT,
        'earned_at'       => self::T_DT,
    ];

    /**
     * np_notification_settings -> NotificationSettings
     *
     * @var array<string,string>
     */
    public const NOTIFICATION_SETTINGS = [
        'id'                   => self::T_ID,
        'user_id'              => self::T_ID,
        'group_id'             => self::T_ID,
        'daily_digest_enabled' => self::T_BOOL,
        'max_push_per_day'     => self::T_INT,
        'partner_nudge'        => self::T_BOOL,
        'created_at'           => self::T_DT,
        'updated_at'           => self::T_DT,
    ];

    /**
     * Tek bir DB satirini verilen tip haritasina gore serilestirir.
     *
     * @param array<string,mixed> $row
     * @param array<string,string> $map alan -> tip
     * @return array<string,mixed>
     */
    public static function row(array $row, array $map): array
    {
        foreach ($row as $key => $value) {
            $type = $map[$key] ?? null;
            if ($type === null) {
                continue; // haritada yoksa dokunma
            }
            $row[$key] = self::cast($value, $type);
        }
        return $row;
    }

    /**
     * Bir satir listesini serilestirir.
     *
     * @param array<int,array<string,mixed>> $rows
     * @param array<string,string> $map
     * @return array<int,array<string,mixed>>
     */
    public static function rows(array $rows, array $map): array
    {
        $out = [];
        foreach ($rows as $row) {
            $out[] = self::row($row, $map);
        }
        return $out;
    }

    /**
     * Tek bir degeri belirtilen tipe cevirir (null korunur).
     */
    private static function cast(mixed $value, string $type): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            self::T_ID   => (string) $value,
            self::T_INT  => (int) $value,
            self::T_BOOL => (bool) ((int) $value),
            self::T_DT   => self::toIso((string) $value),
            self::T_DATE => (string) $value,
            self::T_JSON => self::toJson($value),
            default      => $value,
        };
    }

    /**
     * "YYYY-MM-DD HH:MM:SS" (UTC) -> "YYYY-MM-DDTHH:MM:SSZ".
     *
     * DB tum DATETIME/TIMESTAMP degerlerini UTC saklar (SET time_zone='+00:00').
     * Zaten 'T'/'Z' iceren bir deger gelirse oldugu gibi birakilir.
     */
    private static function toIso(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return $value;
        }
        // "0000-00-00 00:00:00" gibi gecersiz degerleri null'a yakin tut.
        if (str_starts_with($value, '0000-00-00')) {
            return $value;
        }
        // Bosluk ayiriciyi 'T' yap ve sonuna 'Z' ekle (yoksa).
        if (str_contains($value, ' ') && !str_contains($value, 'T')) {
            $value = str_replace(' ', 'T', $value);
        }
        if (!str_ends_with($value, 'Z') && !preg_match('/[+\-]\d{2}:?\d{2}$/', $value)) {
            $value .= 'Z';
        }
        return $value;
    }

    /**
     * JSON kolon degerini parse eder. DB'den dize gelir; zaten dizi/nesne ise
     * oldugu gibi birakilir. Parse basarisizsa ham deger korunur.
     */
    private static function toJson(mixed $value): mixed
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        }
        return $value;
    }
}
