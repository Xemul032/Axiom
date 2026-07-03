#!/usr/bin/env bash
# ============================================================
#  LinkShop — Установка и запуск (Linux / macOS)
#  Использование: bash setup.sh
# ============================================================

set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
NC="\033[0m"  # No Color

cd "$(dirname "$0")"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║           LinkShop — Подготовка сервера              ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── [1/4] Проверка Node.js ─────────────────────────────────────────────────
echo -e "${CYAN}[1/4] Проверка Node.js...${NC}"

if ! command -v node &>/dev/null; then
  echo -e "${RED}  ❌ Node.js не найден!${NC}"
  echo "     Установите Node.js 18 LTS или новее:"
  echo "       Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash - && sudo apt install -y nodejs"
  echo "       macOS:         brew install node"
  echo "       Или скачайте с https://nodejs.org/"
  exit 1
fi

NODE_VER=$(node --version)
echo -e "     ${GREEN}✅ Node.js $NODE_VER найден${NC}"

# ── [2/4] Установка зависимостей ──────────────────────────────────────────
echo ""
echo -e "${CYAN}[2/4] Установка зависимостей (npm install)...${NC}"
echo "     Это может занять 1-2 минуты..."
echo ""

npm install --ignore-scripts
echo -e "     ${GREEN}✅ npm-зависимости установлены${NC}"

# ── [3/4] Установка better-sqlite3 ────────────────────────────────────────
echo ""
echo -e "${CYAN}[3/4] Установка бинарного модуля better-sqlite3...${NC}"

NODE_ABI=$(node -e "console.log(process.versions.modules)")
PLATFORM=$(node -e "console.log(process.platform)")
ARCH=$(node -e "console.log(process.arch)")
BS3_VER=$(node -e "const p=require('./package.json');console.log(p.dependencies['better-sqlite3'].replace(/[\\^~]/g,''))")

BS3_DIR="node_modules/better-sqlite3/lib/binding/node-v${NODE_ABI}-${PLATFORM}-${ARCH}"
BS3_BIN="${BS3_DIR}/better_sqlite3.node"

if [ -f "$BS3_BIN" ]; then
  echo -e "     ${GREEN}✅ Бинарный модуль уже установлен${NC}"
else
  # Попробуем собрать через node-gyp если есть компилятор
  if command -v python3 &>/dev/null && command -v make &>/dev/null; then
    echo "     Сборка из исходников (node-gyp)..."
    cd node_modules/better-sqlite3
    npx node-gyp rebuild --release 2>&1 || true
    cd ../..
  fi

  # Если не собрали — скачиваем prebuilt
  if [ ! -f "$BS3_BIN" ]; then
    PREBUILT_URL="https://github.com/WiseLibs/better-sqlite3/releases/download/v${BS3_VER}/better-sqlite3-v${BS3_VER}-node-v${NODE_ABI}-${PLATFORM}-${ARCH}.tar.gz"
    echo "     Скачиваем prebuilt для Node ABI ${NODE_ABI} (${PLATFORM}/${ARCH})..."
    
    mkdir -p "$BS3_DIR"
    TMP_TAR="/tmp/bs3_prebuilt.tar.gz"

    if command -v curl &>/dev/null; then
      curl -sL "$PREBUILT_URL" -o "$TMP_TAR" 2>&1
    elif command -v wget &>/dev/null; then
      wget -q "$PREBUILT_URL" -O "$TMP_TAR"
    else
      echo -e "     ${RED}❌ Нужен curl или wget для загрузки${NC}"
      exit 1
    fi

    tar -xzf "$TMP_TAR" -C "$BS3_DIR" 2>/dev/null || true
    rm -f "$TMP_TAR"

    # Если бинарник попал в build/Release — копируем наружу
    if [ ! -f "$BS3_BIN" ] && [ -f "${BS3_DIR}/build/Release/better_sqlite3.node" ]; then
      cp "${BS3_DIR}/build/Release/better_sqlite3.node" "$BS3_BIN"
    fi
  fi

  if [ -f "$BS3_BIN" ]; then
    echo -e "     ${GREEN}✅ Бинарный модуль установлен${NC}"
  else
    echo -e "     ${YELLOW}⚠️  Не удалось установить prebuilt.${NC}"
    echo "     Попробуйте установить build tools:"
    echo "       Ubuntu: sudo apt install -y build-essential python3"
    echo "       macOS:  xcode-select --install"
    echo "     Затем запустите: cd node_modules/better-sqlite3 && npx node-gyp rebuild"
    exit 1
  fi
fi

# ── [4/4] Инициализация БД ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[4/4] Инициализация базы данных...${NC}"
node -e "require('./server/db'); console.log('OK')" 2>&1
echo -e "     ${GREEN}✅ База данных готова${NC}"

# ── Запуск ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║  ✅ Установка завершена! Запускаем сервер...         ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}Для остановки нажмите Ctrl+C${NC}"
echo ""

node server/index.js
