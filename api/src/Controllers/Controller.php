<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Auth\Auth;
use Nafu\Http\Request;
use PDO;
use Nafu\Database;
use Nafu\Support\ApiException;

/**
 * Denetleyiciler icin ortak temel: istek, kimlik dogrulama ve PDO erisimi.
 */
abstract class Controller
{
    protected Auth $auth;

    public function __construct(protected Request $request)
    {
        $this->auth = new Auth($request);
    }

    protected function db(): PDO
    {
        return Database::pdo();
    }

    /**
     * URL parametresini guvenli sekilde pozitif tam sayiya cevirir.
     */
    protected function intParam(array $params, string $key): int
    {
        return (int) ($params[$key] ?? 0);
    }

    /**
     * Bir gorevin satirini getirir ve cagiran kullanicinin gorevin grubuna
     * uyeligini dogrular. Gorev yoksa veya kullanici uye degilse 404 firlatir
     * (varlik sizmasini onlemek icin ikisi de 404).
     *
     * @return array<string,mixed> np_tasks satiri (uyelik dogrulanmis)
     */
    protected function requireTaskAsMember(int $taskId): array
    {
        $stmt = $this->db()->prepare('SELECT * FROM np_tasks WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $taskId]);
        $task = $stmt->fetch();
        if ($task === false) {
            throw ApiException::notFound('Gorev bulunamadi.');
        }
        // Grup uyeligini dogrula (uye degilse zaten 403/forbidden firlar). Burada
        // tutarli olmak adina, uye olunmayan grubun gorevini "bulunamadi" gosteririz.
        $userId = $this->auth->requireUserId();
        $member = $this->db()->prepare(
            'SELECT id FROM np_group_members WHERE group_id = :gid AND user_id = :uid LIMIT 1'
        );
        $member->execute([':gid' => (int) $task['group_id'], ':uid' => $userId]);
        if ($member->fetchColumn() === false) {
            throw ApiException::notFound('Gorev bulunamadi.');
        }
        return $task;
    }

    /**
     * Aktivite ozetlerinde kullanilacak gorunur ad: once grup takma adi, yoksa
     * kullanicinin gercek adi. Bos asla donmez (en kotu durumda 'Bir uye').
     */
    protected function actorLabel(?string $displayName, int $userId): string
    {
        $dn = $displayName !== null ? trim($displayName) : '';
        if ($dn !== '') {
            return $dn;
        }
        $stmt = $this->db()->prepare('SELECT name FROM np_users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $userId]);
        $name = $stmt->fetchColumn();
        return is_string($name) && trim($name) !== '' ? trim($name) : 'Bir uye';
    }

    /**
     * Aktivite akisina bir olay yazar (np_activity_log). Hata olursa sessizce
     * yutar: aktivite gunlugu ikincil bir etkidir, ana islemi bozmamali.
     *
     * @param array<string,mixed>|null $meta JSON kolonuna yazilacak ek veri
     */
    protected function logActivity(
        int $groupId,
        ?int $actorUserId,
        string $action,
        ?string $targetType,
        ?int $targetId,
        ?string $summary,
        ?array $meta = null
    ): void {
        try {
            $stmt = $this->db()->prepare(
                'INSERT INTO np_activity_log
                    (group_id, actor_user_id, action, target_type, target_id, summary, meta)
                 VALUES (:gid, :actor, :action, :ttype, :tid, :summary, :meta)'
            );
            $stmt->execute([
                ':gid'     => $groupId,
                ':actor'   => $actorUserId,
                ':action'  => $action,
                ':ttype'   => $targetType,
                ':tid'     => $targetId,
                ':summary' => $summary,
                ':meta'    => $meta === null ? null : json_encode($meta, JSON_UNESCAPED_UNICODE),
            ]);
        } catch (\Throwable $e) {
            error_log('[NafuPlanner] activity log failed: ' . $e->getMessage());
        }
    }
}
