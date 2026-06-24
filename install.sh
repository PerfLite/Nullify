#!/bin/bash

set -e

INSTALL_DIR="$HOME/.local/bin"
APP_NAME="Nullify"
REPO_URL="https://github.com/bashakul/Nullify"

echo "╔══════════════════════════════════╗"
echo "║         Nullify Installer        ║"
echo "╚══════════════════════════════════╝"
echo ""

if [ ! -f "build/bin/Nullify" ]; then
    echo "⚠  Бинарник не найден. Сначала соберите проект:"
    echo "   wails build"
    exit 1
fi

echo "→ Создаю директорию $INSTALL_DIR ..."
mkdir -p "$INSTALL_DIR"

echo "→ Копирую Nullify в $INSTALL_DIR ..."
cp build/bin/Nullify "$INSTALL_DIR/Nullify"
chmod +x "$INSTALL_DIR/Nullify"

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo ""
    echo "⚠  Директория $INSTALL_DIR не добавлена в PATH"
    echo "   Добавьте в ~/.bashrc:"
    echo ""
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
fi

echo ""
echo "✓ Nullify установлен!"
echo ""
echo "  Запуск:"
echo "    $INSTALL_DIR/Nullify"
echo ""
echo "  Или через терминал:"
echo "    Nullify"
