#!/usr/bin/env bash
#
# NafuPlanner dagitim paketi olusturucu.
# Arayuzu derler, sunucu bagimliliklarini kurar ve yuklemeye hazir bir
# "public_html" agaci ile veritabani dosyalarini deploy/output/ altina koyar.
#
# Kullanim:   bash deploy/build.sh
# Cikti:      deploy/output/public_html/   -> FTP ile sunucudaki public_html'e
#             deploy/output/database/      -> phpMyAdmin'de Import edilecek SQL
#             deploy/output/nafuplanner-public_html.zip
#
# NOT: config.php (sirlar) ASLA pakete konmaz; sunucuda elle olusturulur.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/deploy/output"
PUB="$OUT/public_html"

echo "==> Temizlik"
rm -rf "$OUT"
mkdir -p "$PUB/api" "$OUT/database"

echo "==> Arayuz derleniyor (web)"
cd "$ROOT/web"
[ -d node_modules ] || npm install
npm run build

echo "==> Sunucu bagimliliklari (api/vendor, sadece production)"
cd "$ROOT/api"
composer install --no-dev --optimize-autoloader --no-interaction \
  || composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs

echo "==> public_html agaci toplaniyor"
# Arayuz (derlenmis) -> kok
cp -r "$ROOT/web/dist/." "$PUB/"
# Sunucu -> /api  (config.php HARIC)
cp -r "$ROOT/api/index.php" "$ROOT/api/.htaccess" "$ROOT/api/router.php" \
      "$ROOT/api/config.example.php" "$ROOT/api/composer.json" "$ROOT/api/composer.lock" \
      "$ROOT/api/README.md" "$ROOT/api/src" "$ROOT/api/vendor" "$PUB/api/"
mkdir -p "$PUB/api/uploads"
touch "$PUB/api/uploads/.gitkeep"

echo "==> Veritabani dosyalari"
cp "$ROOT/db/schema.sql" "$ROOT/db/seed.sql" "$OUT/database/"

# Guvenlik dogrulamasi: pakete config.php / .env sizmadi mi
if find "$OUT" -name 'config.php' -o -name '.env' | grep -q .; then
  echo "HATA: pakete sir dosyasi sizdi!" >&2
  exit 1
fi

echo "==> Zip"
cd "$OUT"
zip -rq nafuplanner-public_html.zip public_html

echo ""
echo "TAMAM. Yuklenecekler:"
echo "  FTP -> public_html : deploy/output/public_html/  (icindeki her sey)"
echo "  phpMyAdmin Import  : deploy/output/database/schema.sql, sonra seed.sql"
echo "  Zip                : deploy/output/nafuplanner-public_html.zip"
