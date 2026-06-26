<div align="center">

# Nullify

**App Uninstaller for Linux · Менеджер удаления программ для Linux**

[![Go](https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![Wails](https://img.shields.io/badge/Wails-v2-5DC2E7?logo=wails&logoColor=white)](https://wails.io)
</div>

---

## 🇬🇧 English

Nullify is a desktop application for Linux that helps you manage installed programs. Browse all GUI applications, search by name, launch and remove unwanted packages along with their configs and leftover files.

### Features

- **GUI app browser** — shows only applications with a graphical interface (APT and Flatpak)
- **Search** — instant filtering by name and description
- **Filters** — switch between APT, Flatpak, and all packages
- **App icons** — automatically loads icons from your system theme
- **Launch apps** — one button to start any program
- **Detailed info** — description, version, size, maintainer, homepage, dependencies
- **Open file location** — opens your file manager in the package's directory
- **Full removal** — removes the app along with configs and leftovers (`apt purge`)
- **Dark and light themes** — smooth animated switching
- **Multilanguage** — Russian and English interface
- **Scan progress** — shows the number of apps found during scanning

---

## 🇷🇺 Описание

Nullify — десктопное приложение для Linux, которое помогает управлять установленными программами. Просматривайте все GUI-приложения, ищите по имени, запускайте и удаляйте ненужные пакеты вместе с конфигами и остаточными файлами.

### Возможности

- **Просмотр всех GUI-приложений** — отображает только программы с графическим интерфейсом (APT и Flatpak)
- **Поиск** — мгновенная фильтрация по имени и описанию
- **Фильтры** — переключение между APT, Flatpak и всеми пакетами
- **Иконки приложений** — автоматически подтягивает иконки из темы
- **Запуск программ** — одна кнопка для запуска
- **Детальная информация** — описание, версия, размер, автор, сайт, зависимости
- **Просмотр расположения файлов** — открывает файловый менеджер в папке с файлами пакета
- **Полное удаление** — удаляет программу вместе с конфигами (`apt purge`)
- **Тёмная и светлая тема** — переключение с плавной анимацией
- **Мультиязычность** — русский и английский интерфейс
- **Прогресс сканирования** — показывает количество найденных приложений

---

## Installation / Установка

### Download / Скачать

Download the latest release from [Releases](https://github.com/bashakul/Nullify/releases) or build from source.

Скачайте последний релиз из [Releases](https://github.com/bashakul/Nullify/releases) или соберите из исходников.

```bash
chmod +x Nullify
./Nullify
```

### Build from source / Из исходников

```bash
# Clone / Клонировать
git clone https://github.com/bashakul/Nullify.git
cd Nullify

# Build / Собрать
wails build

# Install / Установить
./install.sh
```

### Run / Запуск

```bash
# Via install script / Через установочный скрипт
~/.local/bin/Nullify

# Or from project folder / Или из папки проекта
cd Nullify && wails dev
```

---

## Dependencies / Зависимости

- **Go** 1.23+
- **Wails** v2
- **Node.js** (for frontend build / для сборки фронтенда)
- **libwebkit2gtk-4.1-dev** (for Wails on Linux / для Wails на Linux)

### Install dependencies (Ubuntu/Linux Mint)

```bash
# Go
wget https://go.dev/dl/go1.23.4.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.23.4.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# WebKit (usually pre-installed / обычно уже установлен)
sudo apt install libwebkit2gtk-4.1-dev
```

---

## Project Structure / Структура проекта

```
Nullify/
├── main.go              # Entry point / Точка входа
├── app.go               # Backend / Бэкенд
├── wails.json           # Wails config
├── install.sh           # Install script / Скрипт установки
├── frontend/
│   ├── index.html       # UI markup
│   └── src/
│       ├── main.js      # Frontend logic
│       ├── style.css    # Base styles, themes
│       ├── app.css      # UI components
│       └── i18n.js      # Translations (RU/EN)
└── build/
    └── appicon.png      # App icon / Иконка приложения
```

---

## Tech Stack / Технологии

- **Go** — backend, system interaction
- **Wails v2** — desktop framework
- **Vanilla JS** — frameworkless frontend
- **CSS** — custom themes with CSS variables

---

## License / Лицензия

GPL-3.0

---

<div align="center">

Built with Go + Wails · Сделано с использованием Go + Wails

[Telegram](https://t.me/bashakul)

</div>
