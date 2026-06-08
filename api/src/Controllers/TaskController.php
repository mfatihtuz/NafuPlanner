<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use DateTimeImmutable;
use DateTimeZone;
use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;
use Nafu\Support\Validator;
use PDO;

/**
 * Gorev uc noktalari.
 *
 *   GET    /api/groups/{id}/tasks?scope=&category=&assignee=
 *   POST   /api/groups/{id}/tasks
 *   GET    /api/tasks/{id}
 *   PATCH  /api/tasks/{id}
 *   DELETE /api/tasks/{id}
 *   POST   /api/tasks/{id}/complete
 *   POST   /api/tasks/{id}/uncomplete
 *
 * "Bugun" kavrami kullanicinin np_users.timezone'una gore hesaplanir; due_at
 * UTC saklanir, sinirlar (gun sonu vb.) kullanici saat diliminden UTC'ye cevrilir.
 */
final class TaskController extends Controller
{
    /**
     * Gorev listesi. scope: today | all | overdue | upcoming (varsayilan today).
     * Ek suzgecler: category (kategori id), assignee (kullanici id).
     *
     * @return array<int,array<string,mixed>>
     */
    public function index(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $member  = $this->auth->requireGroupMember($groupId);
        $userId  = (int) $member['user_id'];

        $scope    = $request->query('scope', 'today') ?? 'today';
        $category = $request->query('category');
        $assignee = $request->query('assignee');

        // Kullanicinin saat dilimine gore "bugun" sinirlarini UTC olarak hesapla.
        [$todayEndUtc, $todayStartUtc, $nowUtc] = $this->dayBounds($userId);

        $where  = ['t.group_id = :gid', 't.archived_at IS NULL'];
        $args   = [':gid' => $groupId];

        switch ($scope) {
            case 'all':
                // Tum arsivlenmemis gorevler.
                break;

            case 'overdue':
                $where[] = "t.status = 'open'";
                $where[] = 't.due_at IS NOT NULL AND t.due_at < :now';
                $args[':now'] = $nowUtc;
                break;

            case 'upcoming':
                $where[] = "t.status = 'open'";
                $where[] = 't.due_at IS NOT NULL AND t.due_at > :todayEnd';
                $args[':todayEnd'] = $todayEndUtc;
                break;

            case 'today':
            default:
                // Acik + (son tarihi bugun sonuna kadar VEYA gecikmis) ARTI bugun tamamlananlar.
                $where[] = "(
                    (t.status = 'open' AND t.due_at IS NOT NULL AND t.due_at <= :todayEnd)
                    OR (t.status = 'done' AND t.completed_at IS NOT NULL
                        AND t.completed_at >= :todayStart AND t.completed_at <= :todayEndC)
                )";
                // Yerel prepared (emulate kapali) ayni adli yer tutucuyu iki kez
                // kabul etmez; tamamlanma karsilastirmasi icin ayri ad kullan.
                $args[':todayEnd']   = $todayEndUtc;
                $args[':todayEndC']  = $todayEndUtc;
                $args[':todayStart'] = $todayStartUtc;
                break;
        }

        if ($category !== null && $category !== '') {
            $where[] = 't.category_id = :cat';
            $args[':cat'] = (int) $category;
        }

        // Atanana gore suzme: EXISTS alt sorgu (cogul atama tablosu).
        if ($assignee !== null && $assignee !== '') {
            $where[] = 'EXISTS (SELECT 1 FROM np_task_assignees ta
                                 WHERE ta.task_id = t.id AND ta.user_id = :assignee)';
            $args[':assignee'] = (int) $assignee;
        }

        $sql = 'SELECT t.*,
                       (SELECT COUNT(*) FROM np_task_comments c WHERE c.task_id = t.id) AS comment_count
                  FROM np_tasks t
                 WHERE ' . implode(' AND ', $where) . '
                 ORDER BY (t.due_at IS NULL) ASC, t.due_at ASC, t.priority DESC, t.created_at DESC';

        $stmt = $this->db()->prepare($sql);
        $stmt->execute($args);
        $rows = $stmt->fetchAll();

        return $this->hydrateTasks($rows);
    }

    /**
     * Gorev olusturur (+ atanan, alt gorev, etiket iliskileri).
     *
     * @return array<string,mixed>
     */
    public function create(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $member  = $this->auth->requireGroupMember($groupId);
        $userId  = (int) $member['user_id'];

        $body = $request->json();
        $v = new Validator($body);
        $v->required('title')->string('title', 1, 255)
          ->string('notes', 0, 65535)
          ->integer('priority')->integer('category_id')->check();

        $title    = trim((string) $body['title']);
        $notes    = $this->nullableText($body['notes'] ?? null);
        $priority = $this->clampPriority($body['priority'] ?? 1);
        $catId    = $this->nullableInt($body['category_id'] ?? null);
        $dueHas   = !empty($body['due_has_time']);
        $dueAt    = $this->parseDueAt($body['due_at'] ?? null);

        $assignees = $this->idList($body['assignee_ids'] ?? []);
        $subtasks  = $this->stringList($body['subtasks'] ?? []);
        $tagIds    = $this->idList($body['tag_id'] ?? ($body['tag_ids'] ?? []));
        $tagNames  = $this->stringList($body['tags'] ?? []);

        $pdo = $this->db();

        // Kategori grubun mu? (FK var ama yetki/tutarlilik icin acik dogrula.)
        if ($catId !== null && !$this->categoryBelongsToGroup($catId, $groupId)) {
            throw ApiException::badRequest('Kategori bu gruba ait değil.');
        }

        $pdo->beginTransaction();
        try {
            $ins = $pdo->prepare(
                'INSERT INTO np_tasks
                    (group_id, category_id, title, notes, priority, status, due_at, due_has_time, created_by)
                 VALUES (:gid, :cat, :title, :notes, :priority, \'open\', :due_at, :due_has, :uid)'
            );
            $ins->execute([
                ':gid'      => $groupId,
                ':cat'      => $catId,
                ':title'    => $title,
                ':notes'    => $notes,
                ':priority' => $priority,
                ':due_at'   => $dueAt,
                ':due_has'  => $dueHas ? 1 : 0,
                ':uid'      => $userId,
            ]);
            $taskId = (int) $pdo->lastInsertId();

            $this->syncAssignees($pdo, $taskId, $groupId, $assignees);
            $this->insertSubtasks($pdo, $taskId, $subtasks);
            $this->syncTags($pdo, $taskId, $groupId, $tagIds);
            $this->syncTagsByName($pdo, $taskId, $groupId, $tagNames);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $this->logActivity(
            $groupId,
            $userId,
            'task_created',
            'task',
            $taskId,
            sprintf('%s yeni bir görev ekledi: %s', $this->actorLabel($member['display_name'] ?? null, $userId), $title),
            ['title' => $title]
        );

        return $this->loadTask($taskId);
    }

    /**
     * Tek gorev (uyelik gorevin grubundan cozulur).
     *
     * @return array<string,mixed>
     */
    public function get(Request $request, array $params): array
    {
        $taskId = $this->intParam($params, 'id');
        $this->requireTaskAsMember($taskId);
        return $this->loadTask($taskId);
    }

    /**
     * Gorev guncelleme (alan-bazli + iliskiler).
     *
     * @return array<string,mixed>
     */
    public function update(Request $request, array $params): array
    {
        $taskId = $this->intParam($params, 'id');
        $task = $this->requireTaskAsMember($taskId);
        $groupId = (int) $task['group_id'];

        $body = $request->json();
        $v = new Validator($body);
        $v->string('title', 1, 255)->string('notes', 0, 65535)
          ->integer('priority')->integer('category_id')->check();

        $fields = [];
        $args = [':id' => $taskId];

        if (array_key_exists('title', $body) && $body['title'] !== null && trim((string) $body['title']) !== '') {
            $fields[] = 'title = :title';
            $args[':title'] = trim((string) $body['title']);
        }
        if (array_key_exists('notes', $body)) {
            $fields[] = 'notes = :notes';
            $args[':notes'] = $this->nullableText($body['notes']);
        }
        if (array_key_exists('priority', $body) && $body['priority'] !== null) {
            $fields[] = 'priority = :priority';
            $args[':priority'] = $this->clampPriority($body['priority']);
        }
        if (array_key_exists('category_id', $body)) {
            $catId = $this->nullableInt($body['category_id']);
            if ($catId !== null && !$this->categoryBelongsToGroup($catId, $groupId)) {
                throw ApiException::badRequest('Kategori bu gruba ait değil.');
            }
            $fields[] = 'category_id = :cat';
            $args[':cat'] = $catId;
        }
        if (array_key_exists('due_at', $body)) {
            $fields[] = 'due_at = :due_at';
            $args[':due_at'] = $this->parseDueAt($body['due_at']);
        }
        if (array_key_exists('due_has_time', $body)) {
            $fields[] = 'due_has_time = :due_has';
            $args[':due_has'] = !empty($body['due_has_time']) ? 1 : 0;
        }

        $pdo = $this->db();
        $pdo->beginTransaction();
        try {
            if ($fields !== []) {
                $sql = 'UPDATE np_tasks SET ' . implode(', ', $fields) . ' WHERE id = :id';
                $pdo->prepare($sql)->execute($args);
            }
            if (array_key_exists('assignee_ids', $body)) {
                $this->syncAssignees($pdo, $taskId, $groupId, $this->idList($body['assignee_ids']), true);
            }
            if (array_key_exists('tag_id', $body) || array_key_exists('tag_ids', $body)) {
                $tags = $this->idList($body['tag_id'] ?? ($body['tag_ids'] ?? []));
                $this->syncTags($pdo, $taskId, $groupId, $tags, true);
            }
            if (array_key_exists('tags', $body)) {
                $this->syncTagsByName($pdo, $taskId, $groupId, $this->stringList($body['tags']), true);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return $this->loadTask($taskId);
    }

    /**
     * Gorev silme. Iliskili satirlar FK CASCADE ile silinir.
     *
     * @return array{deleted:bool}
     */
    public function delete(Request $request, array $params): array
    {
        $taskId = $this->intParam($params, 'id');
        $this->requireTaskAsMember($taskId);

        $stmt = $this->db()->prepare('DELETE FROM np_tasks WHERE id = :id');
        $stmt->execute([':id' => $taskId]);

        return ['deleted' => true];
    }

    /**
     * Gorevi tamamla: status=done, completed_by/at ayarla. Puan/streak YOK (Faz 3).
     *
     * @return array<string,mixed>
     */
    public function complete(Request $request, array $params): array
    {
        $taskId = $this->intParam($params, 'id');
        $task = $this->requireTaskAsMember($taskId);
        $userId = $this->auth->requireUserId();
        $groupId = (int) $task['group_id'];

        $now = gmdate('Y-m-d H:i:s');
        $stmt = $this->db()->prepare(
            "UPDATE np_tasks
                SET status = 'done', completed_by = :uid, completed_at = :now
              WHERE id = :id"
        );
        $stmt->execute([':uid' => $userId, ':now' => $now, ':id' => $taskId]);

        $this->logActivity(
            $groupId,
            $userId,
            'task_completed',
            'task',
            $taskId,
            sprintf('%s görevini tamamladı', (string) $task['title']),
            ['title' => $task['title']]
        );

        return $this->loadTask($taskId);
    }

    /**
     * Tamamlamayi geri al: status=open, completed_by/at temizle.
     *
     * @return array<string,mixed>
     */
    public function uncomplete(Request $request, array $params): array
    {
        $taskId = $this->intParam($params, 'id');
        $task = $this->requireTaskAsMember($taskId);
        $userId = $this->auth->requireUserId();
        $groupId = (int) $task['group_id'];

        $stmt = $this->db()->prepare(
            "UPDATE np_tasks
                SET status = 'open', completed_by = NULL, completed_at = NULL
              WHERE id = :id"
        );
        $stmt->execute([':id' => $taskId]);

        $this->logActivity(
            $groupId,
            $userId,
            'task_uncompleted',
            'task',
            $taskId,
            sprintf('%s görevini yeniden açtı', (string) $task['title']),
            ['title' => $task['title']]
        );

        return $this->loadTask($taskId);
    }

    // --- Yardimcilar -------------------------------------------------------

    /**
     * Kullanicinin saat dilimine gore [gunSonuUTC, gunBasiUTC, simdiUTC] dizesi.
     *
     * @return array{0:string,1:string,2:string}
     */
    private function dayBounds(int $userId): array
    {
        $tzName = $this->userTimezone($userId);
        try {
            $tz = new DateTimeZone($tzName);
        } catch (\Throwable) {
            $tz = new DateTimeZone('UTC');
        }
        $utc = new DateTimeZone('UTC');

        $nowLocal = new DateTimeImmutable('now', $tz);
        $startLocal = $nowLocal->setTime(0, 0, 0);
        $endLocal   = $nowLocal->setTime(23, 59, 59);

        return [
            $endLocal->setTimezone($utc)->format('Y-m-d H:i:s'),
            $startLocal->setTimezone($utc)->format('Y-m-d H:i:s'),
            (new DateTimeImmutable('now', $utc))->format('Y-m-d H:i:s'),
        ];
    }

    private function userTimezone(int $userId): string
    {
        $stmt = $this->db()->prepare('SELECT timezone FROM np_users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $userId]);
        $tz = $stmt->fetchColumn();
        return is_string($tz) && $tz !== '' ? $tz : 'UTC';
    }

    /**
     * Gorev satirlarini Task sozlesmesine cevirir; assignee_ids/subtasks ekler.
     *
     * @param array<int,array<string,mixed>> $rows
     * @return array<int,array<string,mixed>>
     */
    private function hydrateTasks(array $rows): array
    {
        if ($rows === []) {
            return [];
        }
        $ids = array_map(static fn (array $r): int => (int) $r['id'], $rows);

        $assigneeMap = $this->assigneesFor($ids);
        $subtaskMap  = $this->subtasksFor($ids);
        $tagMap      = $this->tagsFor($ids);

        $out = [];
        foreach ($rows as $row) {
            $id = (int) $row['id'];
            $task = Serialize::row($row, Serialize::TASK);
            $task['assignee_ids'] = $assigneeMap[$id] ?? [];
            $task['subtasks']     = $subtaskMap[$id] ?? [];
            $task['tags']         = $tagMap[$id] ?? [];
            if (!array_key_exists('comment_count', $task)) {
                $task['comment_count'] = 0;
            }
            $out[] = $task;
        }
        return $out;
    }

    /**
     * Verilen gorev id'leri icin atanan kullanici id'leri (dize) haritasi.
     *
     * @param array<int,int> $taskIds
     * @return array<int,array<int,string>>
     */
    private function assigneesFor(array $taskIds): array
    {
        if ($taskIds === []) {
            return [];
        }
        [$in, $args] = $this->inClause($taskIds);
        $stmt = $this->db()->prepare(
            "SELECT task_id, user_id FROM np_task_assignees WHERE task_id IN ($in) ORDER BY user_id ASC"
        );
        $stmt->execute($args);
        $map = [];
        foreach ($stmt->fetchAll() as $r) {
            $map[(int) $r['task_id']][] = (string) $r['user_id'];
        }
        return $map;
    }

    /**
     * Verilen gorev id'leri icin alt gorevler (serilestirilmis) haritasi.
     *
     * @param array<int,int> $taskIds
     * @return array<int,array<int,array<string,mixed>>>
     */
    private function subtasksFor(array $taskIds): array
    {
        if ($taskIds === []) {
            return [];
        }
        [$in, $args] = $this->inClause($taskIds);
        $stmt = $this->db()->prepare(
            "SELECT id, task_id, title, done, sort_order, created_at
               FROM np_subtasks WHERE task_id IN ($in)
              ORDER BY sort_order ASC, id ASC"
        );
        $stmt->execute($args);
        $map = [];
        foreach ($stmt->fetchAll() as $r) {
            $map[(int) $r['task_id']][] = Serialize::row($r, Serialize::SUBTASK);
        }
        return $map;
    }

    /**
     * Verilen gorev id'leri icin etiket ADLARI haritasi (istemci etiketleri
     * serbest metin ad olarak tutar).
     *
     * @param array<int,int> $taskIds
     * @return array<int,array<int,string>>
     */
    private function tagsFor(array $taskIds): array
    {
        if ($taskIds === []) {
            return [];
        }
        [$in, $args] = $this->inClause($taskIds);
        $stmt = $this->db()->prepare(
            "SELECT tt.task_id, g.name
               FROM np_task_tags tt
               JOIN np_tags g ON g.id = tt.tag_id
              WHERE tt.task_id IN ($in)
              ORDER BY g.name ASC"
        );
        $stmt->execute($args);
        $map = [];
        foreach ($stmt->fetchAll() as $r) {
            $map[(int) $r['task_id']][] = (string) $r['name'];
        }
        return $map;
    }

    /**
     * Tek gorevin eklerini (serilestirilmis) dondurur.
     *
     * @return array<int,array<string,mixed>>
     */
    private function attachmentsFor(int $taskId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT id, task_id, user_id, file_path, original_name, mime, size_bytes, created_at
               FROM np_task_attachments WHERE task_id = :tid ORDER BY id ASC'
        );
        $stmt->execute([':tid' => $taskId]);
        $out = [];
        foreach ($stmt->fetchAll() as $r) {
            $out[] = Serialize::row($r, Serialize::ATTACHMENT);
        }
        return $out;
    }

    /**
     * IN(...) yer tutuculari ve bagli argumanlari uretir (PDO prepared).
     *
     * @param array<int,int> $ids
     * @return array{0:string,1:array<string,int>}
     */
    private function inClause(array $ids): array
    {
        $placeholders = [];
        $args = [];
        foreach (array_values($ids) as $i => $id) {
            $key = ':id' . $i;
            $placeholders[] = $key;
            $args[$key] = (int) $id;
        }
        return [implode(',', $placeholders), $args];
    }

    /**
     * Tek gorevi tum turetilmis alanlariyla yukler.
     *
     * @return array<string,mixed>
     */
    private function loadTask(int $taskId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT t.*,
                    (SELECT COUNT(*) FROM np_task_comments c WHERE c.task_id = t.id) AS comment_count
               FROM np_tasks t WHERE t.id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $taskId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw ApiException::notFound('Görev bulunamadı.');
        }
        $hydrated = $this->hydrateTasks([$row]);
        $task = $hydrated[0];
        // Tek gorev yanitina ekleri (fotograflar) gom; istemci detayda bunu kullanir
        // ve ayri bir uca gerek kalmaz.
        $task['attachments'] = $this->attachmentsFor($taskId);
        return $task;
    }

    /**
     * Atananlari yazar. $replace true ise once mevcutlari siler. Yalnizca grubun
     * uyesi olan kullanicilar atanir (PDO prepared).
     *
     * @param array<int,int> $userIds
     */
    private function syncAssignees(PDO $pdo, int $taskId, int $groupId, array $userIds, bool $replace = false): void
    {
        if ($replace) {
            $del = $pdo->prepare('DELETE FROM np_task_assignees WHERE task_id = :tid');
            $del->execute([':tid' => $taskId]);
        }
        if ($userIds === []) {
            return;
        }
        // Yalnizca grup uyelerini kabul et.
        $valid = $this->filterGroupMembers($pdo, $groupId, $userIds);
        if ($valid === []) {
            return;
        }
        $ins = $pdo->prepare(
            'INSERT IGNORE INTO np_task_assignees (task_id, user_id) VALUES (:tid, :uid)'
        );
        foreach ($valid as $uid) {
            $ins->execute([':tid' => $taskId, ':uid' => $uid]);
        }
    }

    /**
     * Verilen kullanici id'lerinden grubun uyesi olanlari dondurur.
     *
     * @param array<int,int> $userIds
     * @return array<int,int>
     */
    private function filterGroupMembers(PDO $pdo, int $groupId, array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }
        [$in, $args] = $this->inClause($userIds);
        $args[':gid'] = $groupId;
        $stmt = $pdo->prepare(
            "SELECT user_id FROM np_group_members WHERE group_id = :gid AND user_id IN ($in)"
        );
        $stmt->execute($args);
        return array_map(static fn ($r): int => (int) $r['user_id'], $stmt->fetchAll());
    }

    /**
     * Alt gorev basliklarini ekler (sirayla).
     *
     * @param array<int,string> $titles
     */
    private function insertSubtasks(PDO $pdo, int $taskId, array $titles): void
    {
        if ($titles === []) {
            return;
        }
        $ins = $pdo->prepare(
            'INSERT INTO np_subtasks (task_id, title, sort_order) VALUES (:tid, :title, :sort)'
        );
        foreach ($titles as $i => $title) {
            $ins->execute([':tid' => $taskId, ':title' => $title, ':sort' => $i]);
        }
    }

    /**
     * Etiketleri baglar. $replace true ise once mevcutlari siler. Yalnizca grubun
     * etiketleri baglanir.
     *
     * @param array<int,int> $tagIds
     */
    private function syncTags(PDO $pdo, int $taskId, int $groupId, array $tagIds, bool $replace = false): void
    {
        if ($replace) {
            $del = $pdo->prepare('DELETE FROM np_task_tags WHERE task_id = :tid');
            $del->execute([':tid' => $taskId]);
        }
        if ($tagIds === []) {
            return;
        }
        [$in, $args] = $this->inClause($tagIds);
        $args[':gid'] = $groupId;
        $check = $pdo->prepare("SELECT id FROM np_tags WHERE group_id = :gid AND id IN ($in)");
        $check->execute($args);
        $valid = array_map(static fn ($r): int => (int) $r['id'], $check->fetchAll());

        $insTag = $pdo->prepare('INSERT IGNORE INTO np_task_tags (task_id, tag_id) VALUES (:tid, :tag)');
        foreach ($valid as $tagId) {
            $insTag->execute([':tid' => $taskId, ':tag' => $tagId]);
        }
    }

    /**
     * Etiketleri ADLARIYLA baglar: grupta yoksa olusturur (bul-veya-olustur),
     * sonra goreve baglar. $replace true ise once mevcut baglari siler.
     * Istemci etiketleri serbest metin ad olarak gonderir.
     *
     * @param array<int,string> $names
     */
    private function syncTagsByName(PDO $pdo, int $taskId, int $groupId, array $names, bool $replace = false): void
    {
        if ($replace) {
            $pdo->prepare('DELETE FROM np_task_tags WHERE task_id = :tid')->execute([':tid' => $taskId]);
        }
        if ($names === []) {
            return;
        }
        $find   = $pdo->prepare('SELECT id FROM np_tags WHERE group_id = :gid AND name = :name LIMIT 1');
        $create = $pdo->prepare('INSERT INTO np_tags (group_id, name) VALUES (:gid, :name)');
        $link   = $pdo->prepare('INSERT IGNORE INTO np_task_tags (task_id, tag_id) VALUES (:tid, :tag)');

        $seen = [];
        foreach ($names as $name) {
            $name = mb_substr(trim($name), 0, 60);
            if ($name === '' || isset($seen[$name])) {
                continue;
            }
            $seen[$name] = true;

            $find->execute([':gid' => $groupId, ':name' => $name]);
            $tagId = $find->fetchColumn();
            if ($tagId === false) {
                $create->execute([':gid' => $groupId, ':name' => $name]);
                $tagId = (int) $pdo->lastInsertId();
            }
            $link->execute([':tid' => $taskId, ':tag' => (int) $tagId]);
        }
    }

    private function categoryBelongsToGroup(int $categoryId, int $groupId): bool
    {
        $stmt = $this->db()->prepare(
            'SELECT 1 FROM np_categories WHERE id = :id AND group_id = :gid LIMIT 1'
        );
        $stmt->execute([':id' => $categoryId, ':gid' => $groupId]);
        return $stmt->fetchColumn() !== false;
    }

    // --- Girdi normalizasyonu ---------------------------------------------

    private function clampPriority(mixed $value): int
    {
        $p = (int) $value;
        return max(0, min(2, $p));
    }

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        return (int) $value;
    }

    private function nullableText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);
        return $s === '' ? null : $s;
    }

    /**
     * due_at girdisini DB DATETIME (UTC, "Y-m-d H:i:s") bicimine cevirir.
     * ISO-8601 ("...Z" veya ofsetli) ya da "Y-m-d H:i:s" kabul eder.
     */
    private function parseDueAt(mixed $value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        try {
            // Saat dilimi tasiyan degerleri UTC'ye normalize et.
            $dt = new DateTimeImmutable($value);
            return $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            throw ApiException::badRequest('Geçersiz tarih biçimi (due_at).');
        }
    }

    /**
     * Karisik girdiyi (dize/int dizisi) benzersiz pozitif int dizisine cevirir.
     *
     * @return array<int,int>
     */
    private function idList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $v) {
            if (is_int($v) || (is_string($v) && preg_match('/^\d+$/', $v))) {
                $n = (int) $v;
                if ($n > 0) {
                    $out[$n] = $n;
                }
            }
        }
        return array_values($out);
    }

    /**
     * Karisik girdiyi kirpilmis, bos olmayan dize dizisine cevirir.
     *
     * @return array<int,string>
     */
    private function stringList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $v) {
            if (is_string($v)) {
                $s = trim($v);
                if ($s !== '') {
                    $out[] = mb_substr($s, 0, 255);
                }
            }
        }
        return $out;
    }
}
