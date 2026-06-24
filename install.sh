#!/bin/bash

set -e

INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons"
APP_NAME="Nullify"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔══════════════════════════════════╗"
echo "║         Nullify Installer        ║"
echo "╚══════════════════════════════════╝"
echo ""

mkdir -p "$INSTALL_DIR" "$DESKTOP_DIR" "$ICON_DIR/hicolor/256x256/apps"

echo "→ Устанавливаю $APP_NAME..."
cp "$SCRIPT_DIR/Nullify" "$INSTALL_DIR/Nullify"
chmod +x "$INSTALL_DIR/Nullify"

echo "→ Копирую иконку..."
cp "$SCRIPT_DIR/appicon.png" "$ICON_DIR/hicolor/256x256/apps/nullify.png" 2>/dev/null || true

echo "→ Создаю ярлык в меню приложений..."
cat > "$DESKTOP_DIR/nullify.desktop" << EOF
[Desktop Entry]
Name=Nullify
Comment=App uninstaller for Linux
Exec=$INSTALL_DIR/Nullify
Icon=$ICON_DIR/hicolor/256x256/apps/nullify.png
Type=Application
Categories=Utility;System;
Terminal=false
StartupWMClass=Nullify
EOF

update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
gtk-update-icon-cache "$ICON_DIR/hicolor/" 2>/dev/null || true

echo ""
echo "✓ Nullify установлен!"
echo ""
echo "  Запуск:"
echo "    • Через меню приложений: поиск \"Nullify\""
echo "    • Из терминала: Nullify"
echo "    • Полный путь: $INSTALL_DIR/Nullify"
