# Dağıtım (Deploy)

Bu klasör, NafuPlanner'ı Hostinger'a yüklerken **neyin nereye gideceğini** netleştirir.
İki ayrı platform var: **FTP (dosyalar)** ve **phpMyAdmin (veritabanı)**.

## Paketi üret

```bash
bash deploy/build.sh
```

Bu komut şunları `deploy/output/` altına hazırlar:

| Çıktı | Hedef platform | Ne yapılır |
|-------|----------------|------------|
| `output/public_html/` | **FTP → `public_html`** | İçindeki **her şeyi** sunucudaki `public_html` dizinine yükle |
| `output/database/schema.sql` | **phpMyAdmin → Import** | Veritabanını seç, Import et (önce bu) |
| `output/database/seed.sql` | **phpMyAdmin → Import** | Sonra bunu Import et (rozet kataloğu) |
| `output/nafuplanner-public_html.zip` | kolaylık | `public_html` paketinin zip hâli |

> `build.sh` çalıştırmak istemezsen, hazır zip'i de kullanabilirsin: içindeki
> `public_html` klasörünün içeriğini FTP ile sunucuya yükle.

## FTP ile ne yüklenir

`output/public_html/` ağacı:

```
public_html/
├── index.html, assets/, sw.js, manifest.webmanifest, ikonlar   <- arayuz (PWA)
└── api/                                                          <- PHP REST API
    ├── index.php, .htaccess, src/, vendor/
    ├── config.example.php   <- bunu KOPYALAYIP config.php yap (sunucuda)
    └── uploads/             <- yazilabilir olmali (izin 755)
```

- FTP klasörü: **`public_html`** (Hostinger FTP panelinde "Folder to upload files").
- `config.php` **pakette yoktur**; sunucuda `config.example.php`'den oluşturulur ve
  veritabanı bilgisi, Google Client ID, gizli anahtarlar girilir. Sırlar git'e konmaz.

## phpMyAdmin ile ne yapılır

Veritabanı **dosya çalıştırarak değil, phpMyAdmin'in Import sekmesinden** kurulur:

1. hPanel > MySQL Databases: veritabanı + kullanıcı oluştur.
2. phpMyAdmin'i aç, bu veritabanını seç.
3. **Import** > `database/schema.sql` > Go (tabloları kurar).
4. **Import** > `database/seed.sql` > Go (rozetleri ekler).

## Sırlar ve güvenlik

- FTP şifresi, veritabanı şifresi, gizli anahtarlar **hiçbir git dosyasında tutulmaz**.
- Bu makinedeki yerel kimlik bilgileri (varsa) `deploy/credentials.txt` içindedir ve
  `.gitignore` ile dışlanmıştır; GitHub'a gitmez.
- `config.php`, `.env`, `vendor/`, `output/` zaten `.gitignore` kapsamındadır.

Ayrıntılı adım adım kurulum: [`../docs/SETUP.md`](../docs/SETUP.md).
