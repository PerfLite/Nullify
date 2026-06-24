package main

import (
	"bufio"
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

type AppPackage struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Size        string `json:"size"`
	SizeBytes   int64  `json:"sizeBytes"`
	Manager     string `json:"manager"`
	Icon        string `json:"icon"`
	Exec        string `json:"exec"`
}

type PackageDetails struct {
	Name         string   `json:"name"`
	Version      string   `json:"version"`
	Description  string   `json:"description"`
	Size         string   `json:"size"`
	Section      string   `json:"section"`
	Priority     string   `json:"priority"`
	Homepage     string   `json:"homepage"`
	Maintainer   string   `json:"maintainer"`
	Dependencies []string `json:"dependencies"`
}

func (a *App) GetInstalledPackages() []AppPackage {
	var packages []AppPackage
	seen := make(map[string]bool)

	packages = append(packages, a.getAptPackages(seen)...)
	packages = append(packages, a.getFlatpakPackages(seen)...)

	return packages
}

func (a *App) getAptPackages(seen map[string]bool) []AppPackage {
	var packages []AppPackage

	dirs := []string{
		"/usr/share/applications",
		filepath.Join(os.Getenv("HOME"), ".local/share/applications"),
	}

	for _, dir := range dirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".desktop") {
				continue
			}

			desktopPath := filepath.Join(dir, entry.Name())
			pkgName := a.getPackageForDesktop(desktopPath)
			if pkgName == "" {
				continue
			}

			if seen[pkgName] {
				continue
			}
			seen[pkgName] = true

			pkgInfo := a.getPackageInfo(pkgName)
			if pkgInfo == nil {
				continue
			}

			iconName, execCmd := a.extractDesktopInfo(desktopPath)
			pkgInfo.Icon = a.findIconData(iconName)
			pkgInfo.Exec = execCmd
			pkgInfo.Manager = "apt"

			packages = append(packages, *pkgInfo)
		}
	}

	return packages
}

func (a *App) getPackageForDesktop(desktopPath string) string {
	cmd := exec.Command("dpkg", "-S", desktopPath)
	out, err := cmd.Output()
	if err != nil {
		return ""
	}

	line := strings.TrimSpace(string(out))
	parts := strings.SplitN(line, ":", 2)
	if len(parts) < 2 {
		return ""
	}

	return strings.TrimSpace(parts[0])
}

func (a *App) getPackageInfo(pkgName string) *AppPackage {
	cmd := exec.Command("dpkg-query", "-W", "-f", "${Package}\t${Version}\t${Description}\t${Installed-Size}\t${Priority}\n", pkgName)
	out, err := cmd.Output()
	if err != nil {
		return nil
	}

	line := strings.TrimSpace(string(out))
	parts := strings.SplitN(line, "\t", 5)
	if len(parts) < 3 {
		return nil
	}

	priority := ""
	if len(parts) >= 5 {
		priority = strings.TrimSpace(parts[4])
	}
	switch priority {
	case "required", "important", "essential":
		return nil
	}

	size := "—"
	var sizeBytes int64
	if len(parts) >= 4 && parts[3] != "" {
		sizeKB := parts[3]
		var kb float64
		fmt.Sscanf(sizeKB, "%f", &kb)
		sizeBytes = int64(kb * 1024)
		mb := kb / 1024.0
		if mb >= 1 {
			size = fmt.Sprintf("%.1f МБ", mb)
		} else {
			size = sizeKB + " КБ"
		}
	}

	return &AppPackage{
		Name:        parts[0],
		Version:     parts[1],
		Description: parts[2],
		Size:        size,
		SizeBytes:   sizeBytes,
	}
}

func (a *App) getFlatpakPackages(seen map[string]bool) []AppPackage {
	var packages []AppPackage

	cmd := exec.Command("flatpak", "list", "--columns=application,version,description")
	out, err := cmd.Output()
	if err != nil {
		return packages
	}

	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, "\t", 3)
		if len(parts) < 2 {
			continue
		}

		appID := parts[0]
		if seen[appID] {
			continue
		}

		version := parts[1]
		desc := ""
		if len(parts) >= 3 {
			desc = parts[2]
		}

		iconName, execCmd := a.findFlatpakDesktopInfo(appID)
		if execCmd == "" {
			continue
		}

		seen[appID] = true
		icon := a.findIconData(iconName)

		packages = append(packages, AppPackage{
			Name:        appID,
			Version:     version,
			Description: desc,
			Size:        "—",
			Manager:     "flatpak",
			Icon:        icon,
			Exec:        execCmd,
		})
	}

	return packages
}

func (a *App) findFlatpakDesktopInfo(appID string) (string, string) {
	dirs := []string{
		"/var/lib/flatpak/exports/share/applications",
		filepath.Join(os.Getenv("HOME"), ".local/share/flatpak/exports/share/applications"),
	}

	for _, dir := range dirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}

		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".desktop") {
				continue
			}

			withoutDesktop := strings.TrimSuffix(entry.Name(), ".desktop")
			if strings.EqualFold(withoutDesktop, appID) {
				return a.extractDesktopInfo(filepath.Join(dir, entry.Name()))
			}
		}
	}

	return "", ""
}

func (a *App) extractDesktopInfo(desktopPath string) (string, string) {
	iconName := ""
	execCmd := ""

	file, err := os.Open(desktopPath)
	if err != nil {
		return "", ""
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "Icon=") {
			icon := strings.TrimPrefix(line, "Icon=")
			icon = strings.TrimSpace(icon)
			for _, ext := range []string{".png", ".svg", ".xpm", ".svgz"} {
				icon = strings.TrimSuffix(icon, ext)
			}
			iconName = icon
		}
		if strings.HasPrefix(line, "Exec=") {
			exec := strings.TrimPrefix(line, "Exec=")
			exec = strings.TrimSpace(exec)
			execCmd = exec
		}
	}

	return iconName, execCmd
}

func (a *App) findIconData(iconName string) string {
	if iconName == "" {
		return ""
	}

	iconPath := a.resolveIconPath(iconName)
	if iconPath == "" {
		return ""
	}

	data, err := os.ReadFile(iconPath)
	if err != nil {
		return ""
	}

	ext := strings.ToLower(filepath.Ext(iconPath))
	mimeType := "image/png"
	switch ext {
	case ".svg", ".svgz":
		mimeType = "image/svg+xml"
	case ".xpm":
		mimeType = "image/x-xpixmap"
	}

	encoded := base64.StdEncoding.EncodeToString(data)
	return "data:" + mimeType + ";base64," + encoded
}

func (a *App) resolveIconPath(iconName string) string {
	themeDirs := []string{
		"/usr/share/icons/hicolor",
		filepath.Join(os.Getenv("HOME"), ".icons/hicolor"),
		filepath.Join(os.Getenv("HOME"), ".local/share/icons/hicolor"),
	}

	sizes := []string{"48x48", "64x64", "32x32", "256x256", "128x128", "96x96", "scalable"}
	subdirs := []string{"apps"}

	for _, size := range sizes {
		for _, subdir := range subdirs {
			for _, themeDir := range themeDirs {
				for _, ext := range []string{".png", ".svg", ".svgz"} {
					path := filepath.Join(themeDir, size, subdir, iconName+ext)
					if _, err := os.Stat(path); err == nil {
						return path
					}
				}
			}
		}
	}

	pixmapsDirs := []string{"/usr/share/pixmaps", filepath.Join(os.Getenv("HOME"), ".local/share/pixmaps")}
	for _, dir := range pixmapsDirs {
		for _, ext := range []string{".png", ".svg", ".xpm"} {
			path := filepath.Join(dir, iconName+ext)
			if _, err := os.Stat(path); err == nil {
				return path
			}
		}
	}

	return ""
}

func (a *App) extractIconFromDesktop(desktopPath string) string {
	iconName, _ := a.extractDesktopInfo(desktopPath)
	return iconName
}

func (a *App) findFlatpakIconName(appID string) string {
	iconName, _ := a.findFlatpakDesktopInfo(appID)
	return iconName
}

func (a *App) UninstallPackage(name string, manager string, password string) error {
	var cmd *exec.Cmd

	switch manager {
	case "flatpak":
		cmd = exec.Command("flatpak", "uninstall", "-y", name)
	default:
		cmd = exec.Command("sh", "-c", fmt.Sprintf("echo '%s' | sudo -S apt purge -y %s", password, name))
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %s", err.Error(), string(output))
	}

	return nil
}

func (a *App) GetPackageFiles(name string, manager string) []string {
	if manager == "flatpak" {
		return a.getFlatpakFiles(name)
	}
	return a.getAptFiles(name)
}

func (a *App) OpenPackageLocation(name string, manager string) error {
	var cmd *exec.Cmd

	if manager == "flatpak" {
		cmd = exec.Command("flatpak", "info", "--show-location", name)
	} else {
		cmd = exec.Command("dpkg", "-L", name)
	}

	out, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("не удалось найти файлы пакета: %s", err.Error())
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")

	dirs := make(map[string]bool)
	var lastFile string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if manager != "flatpak" {
			lastFile = line
		}
		if info, err := os.Stat(line); err == nil && info.IsDir() {
			dirs[line] = true
		}
	}

	if manager == "flatpak" && len(lines) > 0 {
		dir := lines[0]
		if info, err := os.Stat(dir); err == nil {
			if info.IsDir() {
				cmd = exec.Command("xdg-open", dir)
				return cmd.Start()
			}
		}
	}

	if len(dirs) > 0 {
		bestDir := ""
		for d := range dirs {
			if bestDir == "" || len(d) > len(bestDir) {
				bestDir = d
			}
		}
		if bestDir != "" {
			cmd = exec.Command("xdg-open", bestDir)
			return cmd.Start()
		}
	}

	if lastFile != "" {
		dir := filepath.Dir(lastFile)
		cmd = exec.Command("xdg-open", dir)
		return cmd.Start()
	}

	return fmt.Errorf("не удалось определить расположение файлов")
}

func (a *App) getAptFiles(name string) []string {
	cmd := exec.Command("dpkg", "-L", name)
	out, err := cmd.Output()
	if err != nil {
		return nil
	}

	var files []string
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" {
			files = append(files, line)
		}
	}
	return files
}

func (a *App) getFlatpakFiles(appID string) []string {
	cmd := exec.Command("flatpak", "info", "--show-location", appID)
	out, err := cmd.Output()
	if err != nil {
		return nil
	}

	location := strings.TrimSpace(string(out))
	var files []string

	filepath.Walk(location, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		files = append(files, path)
		if len(files) > 200 {
			return filepath.SkipDir
		}
		return nil
	})

	return files
}

func (a *App) LaunchPackage(execCmd string) error {
	cmd := exec.Command("sh", "-c", execCmd)
	cmd.Stdout = nil
	cmd.Stderr = nil
	return cmd.Start()
}

func (a *App) GetPackageDetails(name string, manager string) *PackageDetails {
	if manager == "flatpak" {
		return a.getFlatpakDetails(name)
	}
	return a.getAptDetails(name)
}

func (a *App) getAptDetails(name string) *PackageDetails {
	cmd := exec.Command("dpkg-query", "-W", "-f", "${Package}\t${Version}\t${Description}\t${Installed-Size}\t${Section}\t${Priority}\t${Homepage}\t${Maintainer}\t${Depends}\n", name)
	out, err := cmd.Output()
	if err != nil {
		return nil
	}

	line := strings.TrimSpace(string(out))
	parts := strings.SplitN(line, "\t", 9)
	if len(parts) < 3 {
		return nil
	}

	size := "—"
	if len(parts) >= 4 && parts[3] != "" {
		var kb float64
		fmt.Sscanf(parts[3], "%f", &kb)
		mb := kb / 1024.0
		if mb >= 1 {
			size = fmt.Sprintf("%.1f МБ", mb)
		} else {
			size = parts[3] + " КБ"
		}
	}

	section := ""
	if len(parts) >= 5 {
		section = parts[4]
	}
	priority := ""
	if len(parts) >= 6 {
		priority = parts[5]
	}
	homepage := ""
	if len(parts) >= 7 {
		homepage = parts[6]
	}
	maintainer := ""
	if len(parts) >= 8 {
		maintainer = parts[7]
	}
	var deps []string
	if len(parts) >= 9 && parts[8] != "" {
		for _, d := range strings.Split(parts[8], ", ") {
			d = strings.TrimSpace(d)
			if d != "" {
				deps = append(deps, d)
			}
		}
	}

	return &PackageDetails{
		Name:         parts[0],
		Version:      parts[1],
		Description:  parts[2],
		Size:         size,
		Section:      section,
		Priority:     priority,
		Homepage:     homepage,
		Maintainer:   maintainer,
		Dependencies: deps,
	}
}

func (a *App) getFlatpakDetails(name string) *PackageDetails {
	cmd := exec.Command("flatpak", "info", name)
	out, err := cmd.Output()
	if err != nil {
		return nil
	}

	details := &PackageDetails{Name: name}
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "Version:") {
			details.Version = strings.TrimSpace(strings.TrimPrefix(line, "Version:"))
		} else if strings.HasPrefix(line, "Name:") {
			details.Description = strings.TrimSpace(strings.TrimPrefix(line, "Name:"))
		} else if strings.HasPrefix(line, "Origin:") {
			details.Section = strings.TrimSpace(strings.TrimPrefix(line, "Origin:"))
		} else if strings.HasPrefix(line, "Homepage:") {
			details.Homepage = strings.TrimSpace(strings.TrimPrefix(line, "Homepage:"))
		} else if strings.HasPrefix(line, "Ref:") {
			details.Section = strings.TrimSpace(strings.TrimPrefix(line, "Ref:"))
		}
	}

	return details
}
