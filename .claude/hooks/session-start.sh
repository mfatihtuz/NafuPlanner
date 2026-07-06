#!/bin/bash
set -euo pipefail

# Nafu Planlayıcı — SessionStart hook
# Claude Code on the web oturumları taze bir konteynerde başlar ve node_modules
# kayıttan hariçtir. Bu hook bağımlılıkları kurarak tip denetimi / lint / test
# komutlarının oturum başında hazır olmasını sağlar.

# Yalnızca uzak (web) ortamda çalış; yerel makineyi etkileme.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Idempotent: tekrar çalıştırmak güvenlidir. Konteyner önbelleğinden
# yararlanmak için `npm ci` yerine `npm install` tercih ediyoruz.
npm install --no-audit --no-fund
