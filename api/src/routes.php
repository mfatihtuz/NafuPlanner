<?php

declare(strict_types=1);

/**
 * Uc nokta -> denetleyici eslemeleri (CONVENTIONS.md v1 listesi).
 *
 * Uygulanmis denetleyiciler tam calisir; geri kalanlar 501 (not_implemented)
 * doner. Yollar /api oneki cikarilmis haldedir (Request bu oneki normalize eder),
 * orn. CONVENTIONS'taki /api/groups burada /groups olur.
 *
 * Her handler: function(Request $req, array $params): mixed
 * Donen deger index.php tarafindan basari zarfina sarilir.
 */

use Nafu\Http\Request;
use Nafu\Http\Router;
use Nafu\Controllers\ActivityController;
use Nafu\Controllers\AttachmentController;
use Nafu\Controllers\AuthController;
use Nafu\Controllers\BadgeController;
use Nafu\Controllers\CategoryController;
use Nafu\Controllers\CommentController;
use Nafu\Controllers\CronController;
use Nafu\Controllers\GroupController;
use Nafu\Controllers\HealthController;
use Nafu\Controllers\InvitationController;
use Nafu\Controllers\LeaderboardController;
use Nafu\Controllers\PushController;
use Nafu\Controllers\SeriesController;
use Nafu\Controllers\SettingsController;
use Nafu\Controllers\ShoppingController;
use Nafu\Controllers\SubtaskController;
use Nafu\Controllers\TagController;
use Nafu\Controllers\TaskController;

if (!function_exists('bind_routes')) {
    /**
     * Tum uc noktalari yonlendiriciye baglar.
     *
     * @param Router  $r       yonlendirici
     * @param Request $request gelen istek (denetleyicilere enjekte edilir)
     */
    function bind_routes(Router $r, Request $request): void
    {
        // Belirli bir denetleyici sinifi + metot icin handler uretir.
        $h = static function (string $class, string $method) use ($request): callable {
            return static function (Request $req, array $params) use ($class, $method): mixed {
                /** @var object $controller */
                $controller = new $class($req);
                return $controller->{$method}($req, $params);
            };
        };

        // -- Sistem -------------------------------------------------------
        $r->get('/health', $h(HealthController::class, 'getHealth'));
        $r->get('/cron/run', $h(CronController::class, 'run'));

        // -- Auth / Profil ------------------------------------------------
        $r->post('/auth/google', $h(AuthController::class, 'postGoogle'));
        $r->post('/auth/logout', $h(AuthController::class, 'postLogout'));
        $r->get('/me', $h(AuthController::class, 'getMe'));
        $r->patch('/me', $h(AuthController::class, 'patchMe'));

        // -- Gruplar ve davet ---------------------------------------------
        $r->get('/groups', $h(GroupController::class, 'list'));
        $r->post('/groups', $h(GroupController::class, 'create'));
        $r->get('/groups/{id}', $h(GroupController::class, 'get'));
        $r->patch('/groups/{id}', $h(GroupController::class, 'update'));
        $r->delete('/groups/{id}', $h(GroupController::class, 'delete'));
        $r->get('/groups/{id}/members', $h(GroupController::class, 'members'));
        $r->post('/groups/{id}/invitations', $h(InvitationController::class, 'create'));
        $r->get('/invitations/{token}', $h(InvitationController::class, 'preview'));
        $r->post('/invitations/{token}/accept', $h(InvitationController::class, 'accept'));

        // -- Kategoriler / etiketler (stub) -------------------------------
        $r->get('/groups/{id}/categories', $h(CategoryController::class, 'index'));
        $r->post('/groups/{id}/categories', $h(CategoryController::class, 'create'));
        $r->patch('/categories/{id}', $h(CategoryController::class, 'update'));
        $r->delete('/categories/{id}', $h(CategoryController::class, 'delete'));
        $r->get('/groups/{id}/tags', $h(TagController::class, 'index'));
        $r->post('/groups/{id}/tags', $h(TagController::class, 'create'));

        // -- Gorevler (stub) ----------------------------------------------
        $r->get('/groups/{id}/tasks', $h(TaskController::class, 'index'));
        $r->post('/groups/{id}/tasks', $h(TaskController::class, 'create'));
        $r->get('/tasks/{id}', $h(TaskController::class, 'get'));
        $r->patch('/tasks/{id}', $h(TaskController::class, 'update'));
        $r->delete('/tasks/{id}', $h(TaskController::class, 'delete'));
        $r->post('/tasks/{id}/complete', $h(TaskController::class, 'complete'));
        $r->post('/tasks/{id}/uncomplete', $h(TaskController::class, 'uncomplete'));
        $r->post('/tasks/{id}/subtasks', $h(SubtaskController::class, 'create'));
        $r->patch('/subtasks/{id}', $h(SubtaskController::class, 'update'));
        $r->delete('/subtasks/{id}', $h(SubtaskController::class, 'delete'));
        $r->get('/tasks/{id}/comments', $h(CommentController::class, 'index'));
        $r->post('/tasks/{id}/comments', $h(CommentController::class, 'create'));
        $r->post('/tasks/{id}/attachments', $h(AttachmentController::class, 'create'));
        $r->delete('/attachments/{id}', $h(AttachmentController::class, 'delete'));

        // -- Tekrar serileri (stub) ---------------------------------------
        $r->get('/groups/{id}/series', $h(SeriesController::class, 'index'));
        $r->post('/groups/{id}/series', $h(SeriesController::class, 'create'));
        $r->patch('/series/{id}', $h(SeriesController::class, 'update'));
        $r->delete('/series/{id}', $h(SeriesController::class, 'delete'));

        // -- Alisveris (stub) ---------------------------------------------
        $r->get('/groups/{id}/shopping', $h(ShoppingController::class, 'index'));
        $r->post('/groups/{id}/shopping', $h(ShoppingController::class, 'create'));
        $r->patch('/shopping/{id}', $h(ShoppingController::class, 'update'));
        $r->post('/shopping/{id}/toggle', $h(ShoppingController::class, 'toggle'));
        $r->delete('/shopping/{id}', $h(ShoppingController::class, 'delete'));

        // -- Bildirim / push (stub) ---------------------------------------
        $r->post('/push/subscribe', $h(PushController::class, 'subscribe'));
        $r->post('/push/unsubscribe', $h(PushController::class, 'unsubscribe'));
        $r->get('/settings/notifications', $h(SettingsController::class, 'getNotifications'));
        $r->patch('/settings/notifications', $h(SettingsController::class, 'patchNotifications'));

        // -- Oyunlastirma / akis (stub) -----------------------------------
        $r->get('/groups/{id}/leaderboard', $h(LeaderboardController::class, 'index'));
        $r->get('/groups/{id}/badges', $h(BadgeController::class, 'index'));
        $r->get('/groups/{id}/activity', $h(ActivityController::class, 'index'));
    }
}
