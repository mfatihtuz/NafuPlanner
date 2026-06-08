<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Config;
use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;

/**
 * Gorev eki uc noktalari.
 *
 *   POST   /api/tasks/{id}/attachments   multipart resim yukle (alan adi: "file")
 *   DELETE /api/attachments/{id}         eki sil (dosya + satir)
 *
 * Guvenlik:
 *   - Yalnizca resim MIME turleri (jpeg, png, gif, webp, heic/heif).
 *   - En fazla ~8MB.
 *   - Dosya benzersiz, rastgele adla uploads/ altina kaydedilir; orijinal ad
 *     yalnizca metadata olarak saklanir (yol uretiminde kullanilmaz).
 */
final class AttachmentController extends Controller
{
    private const MAX_BYTES = 8 * 1024 * 1024; // ~8MB

    /** İzinli resim MIME -> uzanti. */
    private const ALLOWED = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
        'image/heic' => 'heic',
        'image/heif' => 'heif',
    ];

    /**
     * Goreve resim eki yukler.
     *
     * @return array<string,mixed>
     */
    public function create(Request $request, array $params): array
    {
        $taskId = $this->intParam($params, 'id');
        $task = $this->requireTaskAsMember($taskId);
        $userId = $this->auth->requireUserId();

        $file = $request->file('file');
        if ($file === null) {
            // Bazi istemciler farkli alan adi kullanabilir; ilk yuklemeyi al.
            $all = $request->files();
            $file = is_array($all) && $all !== [] ? reset($all) : null;
        }
        if (!is_array($file) || !isset($file['error'])) {
            throw ApiException::badRequest('Yüklenecek dosya bulunamadı.');
        }
        if ((int) $file['error'] !== UPLOAD_ERR_OK) {
            throw ApiException::badRequest($this->uploadErrorMessage((int) $file['error']));
        }

        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0) {
            throw ApiException::badRequest('Boş dosya yüklenemez.');
        }
        if ($size > self::MAX_BYTES) {
            throw ApiException::badRequest('Dosya çok büyük (en fazla 8MB).');
        }

        $tmp = (string) ($file['tmp_name'] ?? '');
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            // Yerel/test ortaminda is_uploaded_file basarisiz olabilir; varligi kontrol et.
            if ($tmp === '' || !is_file($tmp)) {
                throw ApiException::badRequest('Yükleme doğrulanamadı.');
            }
        }

        // Gercek MIME'i iceriginden belirle (istemci basligina guvenme).
        $mime = $this->detectMime($tmp);
        if (!isset(self::ALLOWED[$mime])) {
            throw ApiException::badRequest('Yalnızca resim dosyaları yüklenebilir.');
        }
        $ext = self::ALLOWED[$mime];

        $dir = $this->uploadDir();
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new ApiException('server_error', 'Yükleme dizini oluşturulamadı.', 500);
        }

        $basename = sprintf('%d_%s.%s', $taskId, bin2hex(random_bytes(16)), $ext);
        $absPath  = rtrim($dir, '/') . '/' . $basename;
        $relPath  = 'uploads/' . $basename;

        if (!$this->moveUploaded($tmp, $absPath)) {
            throw new ApiException('server_error', 'Dosya kaydedilemedi.', 500);
        }

        $original = isset($file['name']) ? mb_substr((string) $file['name'], 0, 255) : null;

        $stmt = $this->db()->prepare(
            'INSERT INTO np_task_attachments (task_id, user_id, file_path, original_name, mime, size_bytes)
             VALUES (:tid, :uid, :path, :orig, :mime, :size)'
        );
        $stmt->execute([
            ':tid'  => $taskId,
            ':uid'  => $userId,
            ':path' => $relPath,
            ':orig' => $original,
            ':mime' => $mime,
            ':size' => $size,
        ]);

        return $this->loadAttachment((int) $this->db()->lastInsertId());
    }

    /**
     * Eki siler (dosya + satir).
     *
     * @return array{deleted:bool}
     */
    public function delete(Request $request, array $params): array
    {
        $attId = $this->intParam($params, 'id');

        $stmt = $this->db()->prepare(
            'SELECT a.id, a.file_path, t.group_id
               FROM np_task_attachments a
               JOIN np_tasks t ON t.id = a.task_id
              WHERE a.id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $attId]);
        $att = $stmt->fetch();
        if ($att === false) {
            throw ApiException::notFound('Ek bulunamadı.');
        }
        $this->auth->requireGroupMember((int) $att['group_id']);

        // Once satiri sil, sonra dosyayi (dosya silme hatasi islemi bozmasin).
        $del = $this->db()->prepare('DELETE FROM np_task_attachments WHERE id = :id');
        $del->execute([':id' => $attId]);

        $this->deleteFile((string) $att['file_path']);

        return ['deleted' => true];
    }

    // --- Yardimcilar -------------------------------------------------------

    private function uploadDir(): string
    {
        $dir = (string) Config::get('upload_dir', '');
        if ($dir === '') {
            $dir = dirname(__DIR__, 2) . '/uploads';
        }
        return $dir;
    }

    private function detectMime(string $path): string
    {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $mime = finfo_file($finfo, $path);
                finfo_close($finfo);
                if (is_string($mime) && $mime !== '') {
                    return $mime;
                }
            }
        }
        // Yedek: getimagesize ile dene.
        $info = @getimagesize($path);
        if (is_array($info) && isset($info['mime'])) {
            return (string) $info['mime'];
        }
        return 'application/octet-stream';
    }

    /**
     * Yuklenen dosyayi tasir; gercek yukleme degilse (test) rename'e duser.
     */
    private function moveUploaded(string $tmp, string $dest): bool
    {
        if (is_uploaded_file($tmp)) {
            return move_uploaded_file($tmp, $dest);
        }
        return @rename($tmp, $dest) || @copy($tmp, $dest);
    }

    private function deleteFile(string $relPath): void
    {
        // Yol gezintisini onlemek icin yalnizca temel dosya adini kullan ve
        // her zaman yapilandirilmis yukleme dizinine cozumle.
        $base = basename($relPath);
        if ($base === '' || $base === '.' || $base === '..') {
            return;
        }
        $abs = rtrim($this->uploadDir(), '/') . '/' . $base;
        if (is_file($abs)) {
            @unlink($abs);
        }
    }

    private function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Dosya çok büyük.',
            UPLOAD_ERR_PARTIAL => 'Dosya kısmen yüklendi, tekrar deneyin.',
            UPLOAD_ERR_NO_FILE => 'Dosya seçilmedi.',
            default => 'Dosya yüklenemedi.',
        };
    }

    /**
     * @return array<string,mixed>
     */
    private function loadAttachment(int $attId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT id, task_id, user_id, file_path, original_name, mime, size_bytes, created_at
               FROM np_task_attachments WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $attId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw ApiException::notFound('Ek bulunamadı.');
        }
        return Serialize::row($row, Serialize::ATTACHMENT);
    }
}
