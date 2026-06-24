import './style.css';
import './app.css';

import { GetInstalledPackages, UninstallPackage, LaunchPackage, GetPackageDetails, GetPackageFiles, OpenPackageLocation } from '../wailsjs/go/main/App';
import { t, setLang, getLang } from './i18n';

let allPackages = [];
let currentFilter = "all";
let searchQuery = "";
let ctxTarget = null;

function getManagerClass(m) {
    return m === "flatpak" ? "flatpak" : "apt";
}

function renderIcon(pkg) {
    if (pkg.icon && pkg.icon.startsWith("data:")) {
        return `<img src="${pkg.icon}" alt="" onerror="this.parentElement.innerHTML='<div class=\\'package-icon-placeholder\\'>${pkg.name.charAt(0).toUpperCase()}</div>'"/>`;
    }
    return `<div class="package-icon-placeholder">${pkg.name.charAt(0).toUpperCase()}</div>`;
}

function updateAllTranslations() {
    document.getElementById("searchInput").placeholder = t("searchPlaceholder");
    document.querySelector('[data-filter="all"]').textContent = t("filterAll");
    document.querySelector('[data-filter="apt"]').textContent = t("filterApt");
    document.querySelector('[data-filter="flatpak"]').textContent = t("filterFlatpak");
    document.getElementById("loadingText").textContent = t("loading");
    document.getElementById("loadingLabel").textContent = t("loadingApps");
    document.getElementById("aboutBtn").title = t("tooltipAbout");
    document.getElementById("themeBtn").title = t("tooltipTheme");
    document.getElementById("refreshBtn").title = t("tooltipRefresh");
    document.getElementById("langBtn").textContent = getLang() === "ru" ? "EN" : "RU";
    document.getElementById("langBtn").title = getLang() === "ru" ? "English" : "Русский";
    document.getElementById("modalCancel").textContent = t("cancelBtn");
    document.getElementById("modalConfirm").textContent = t("deleteBtn");
    document.getElementById("passwordCancel").textContent = t("cancelBtn");
    document.getElementById("passwordConfirm").textContent = t("confirmBtn");
    document.getElementById("passwordInput").placeholder = t("passwordPlaceholder");

    const aboutTitle = document.querySelector(".about-title");
    if (aboutTitle) aboutTitle.textContent = t("aboutTitle");
    const aboutDesc = document.querySelector(".about-desc");
    if (aboutDesc) aboutDesc.textContent = t("aboutDesc");
    const aboutGithubSpan = document.querySelector(".about-link.github span");
    if (aboutGithubSpan) aboutGithubSpan.textContent = t("aboutGithub");
    const aboutTgSpan = document.querySelector(".about-link.telegram span");
    if (aboutTgSpan) aboutTgSpan.textContent = t("aboutTelegram");
    const aboutFooterP = document.querySelector(".about-footer p:first-child");
    if (aboutFooterP) aboutFooterP.textContent = t("aboutFooter");
}

function updateStatsBar() {
    let filtered = allPackages;
    if (currentFilter !== "all") {
        filtered = filtered.filter(p => p.manager === currentFilter);
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    }

    const totalBytes = filtered.reduce((sum, p) => sum + (p.sizeBytes || 0), 0);
    const sizeStr = totalBytes >= 1073741824
        ? (totalBytes / 1073741824).toFixed(1) + " ГБ"
        : totalBytes >= 1048576
            ? (totalBytes / 1048576).toFixed(1) + " МБ"
            : totalBytes >= 1024
                ? (totalBytes / 1024).toFixed(0) + " КБ"
                : "0 МБ";

    document.getElementById("statsApps").textContent = `${filtered.length} ${t("statsApps")}`;
    document.getElementById("statsSize").textContent = sizeStr;
}

function renderPackages() {
    const list = document.getElementById("packageList");
    const empty = document.getElementById("emptyState");
    const loading = document.getElementById("loadingOverlay");

    loading.style.display = "none";

    let filtered = allPackages;

    if (currentFilter !== "all") {
        filtered = filtered.filter(p => p.manager === currentFilter);
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    }

    document.getElementById("stats").innerHTML = `<span class="stat-value">${filtered.length}</span> ${t("statsFrom")} <span class="stat-value">${allPackages.length}</span> ${t("programs")}`;
    updateStatsBar();

    if (filtered.length === 0) {
        list.innerHTML = "";
        empty.style.display = "flex";
        return;
    }

    empty.style.display = "none";

    list.innerHTML = filtered.map(pkg => `
        <div class="package-item" data-name="${escapeHtml(pkg.name)}" data-manager="${pkg.manager}" onclick="window.openDetail('${escapeHtml(pkg.name)}', '${pkg.manager}')">
            <div class="package-icon">
                ${renderIcon(pkg)}
            </div>
            <div class="package-info">
                <div class="package-name">${escapeHtml(pkg.name)}</div>
                <div class="package-desc">${escapeHtml(pkg.description)}</div>
            </div>
            <div class="package-meta">
                <span class="package-version">${escapeHtml(pkg.version)}</span>
                <span class="package-size">${escapeHtml(pkg.size)}</span>
                <span class="package-manager ${getManagerClass(pkg.manager)}">${pkg.manager}</span>
            </div>
            <div class="package-actions">
                <button class="launch-btn" onclick="event.stopPropagation(); window.launchPackage('${escapeHtml(pkg.exec ? pkg.exec.replace(/'/g, "\\'") : '')}')" ${!pkg.exec ? `disabled title="${t("noExec")}"` : `title="${t("tooltipLaunch")}"`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                </button>
                <button class="delete-btn" onclick="event.stopPropagation(); window.confirmDelete('${escapeHtml(pkg.name)}', '${pkg.manager}')" title="${t("tooltipDelete")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    ${t("deleteBtn")}
                </button>
            </div>
        </div>
    `).join("");
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Launch package
window.launchPackage = async function(execCmd) {
    if (!execCmd) return;
    try {
        await LaunchPackage(execCmd);
        showToast(t("launched"), "success");
    } catch (err) {
        showToast(`${t("launchError")}: ${err.toString()}`, "error");
    }
};

// Detail panel
window.openDetail = async function(name, manager) {
    const overlay = document.getElementById("detailOverlay");
    const body = document.getElementById("detailBody");
    const pkg = allPackages.find(p => p.name === name && p.manager === manager);

    if (pkg) {
        document.getElementById("detailName").textContent = pkg.name;
        document.getElementById("detailVersion").textContent = `v${pkg.version}`;
        document.getElementById("detailIcon").innerHTML = renderIcon(pkg);
    }

    body.innerHTML = `<div class="detail-loading">${t("loading")}</div>`;
    overlay.style.display = "flex";

    try {
        const details = await GetPackageDetails(name, manager);
        if (!details) {
            body.innerHTML = `<div class="detail-loading">${t("detailNotFound")}</div>`;
            return;
        }

        let html = '';

        html += '<div class="detail-section">';
        html += `<div class="detail-section-title">${t("detailDescription")}</div>`;
        html += `<p style="margin:0;color:var(--text-secondary);font-size:13px">${escapeHtml(details.description || "—")}</p>`;
        html += '</div>';

        html += '<div class="detail-section">';
        html += `<div class="detail-section-title">${t("detailInfo")}</div>`;
        html += `<div class="detail-field"><span class="detail-field-label">${t("detailPackage")}</span><span class="detail-field-value">${escapeHtml(details.name)}</span></div>`;
        html += `<div class="detail-field"><span class="detail-field-label">${t("detailVersion")}</span><span class="detail-field-value">${escapeHtml(details.version || "—")}</span></div>`;
        html += `<div class="detail-field"><span class="detail-field-label">${t("detailSize")}</span><span class="detail-field-value">${escapeHtml(details.size || "—")}</span></div>`;
        if (details.section) {
            html += `<div class="detail-field"><span class="detail-field-label">${t("detailSection")}</span><span class="detail-field-value">${escapeHtml(details.section)}</span></div>`;
        }
        if (details.priority) {
            html += `<div class="detail-field"><span class="detail-field-label">${t("detailPriority")}</span><span class="detail-field-value">${escapeHtml(details.priority)}</span></div>`;
        }
        if (details.maintainer) {
            html += `<div class="detail-field"><span class="detail-field-label">${t("detailMaintainer")}</span><span class="detail-field-value">${escapeHtml(details.maintainer)}</span></div>`;
        }
        if (details.homepage) {
            html += `<div class="detail-field"><span class="detail-field-label">${t("detailHomepage")}</span><span class="detail-field-value"><a href="${escapeHtml(details.homepage)}" target="_blank">${escapeHtml(details.homepage)}</a></span></div>`;
        }
        html += `<div class="detail-field"><span class="detail-field-label">${t("detailManager")}</span><span class="detail-field-value">${escapeHtml(manager)}</span></div>`;
        html += '</div>';

        if (details.dependencies && details.dependencies.length > 0) {
            html += '<div class="detail-section">';
            html += `<div class="detail-section-title">${t("detailDependencies")} (${details.dependencies.length})</div>`;
            html += '<div class="detail-deps">';
            details.dependencies.forEach(dep => {
                html += `<span class="detail-dep-tag">${escapeHtml(dep)}</span>`;
            });
            html += '</div>';
            html += '</div>';
        }

        html += '<div class="detail-actions">';
        if (pkg && pkg.exec) {
            html += `<button class="detail-action-btn launch" onclick="window.launchPackage('${escapeHtml(pkg.exec.replace(/'/g, "\\'"))}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                ${t("detailLaunch")}
            </button>`;
        }
        html += `<button class="detail-action-btn delete" onclick="window.confirmDelete('${escapeHtml(name)}', '${manager}'); document.getElementById('detailOverlay').style.display='none';">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
            ${t("detailDelete")}
        </button>`;
        html += '</div>';

        body.innerHTML = html;
    } catch (err) {
        body.innerHTML = `<div class="detail-loading">${t("detailError")}: ${err.toString()}</div>`;
    }
};

document.getElementById("detailClose").onclick = function() {
    document.getElementById("detailOverlay").style.display = "none";
};

document.getElementById("detailOverlay").onclick = function(e) {
    if (e.target === this) {
        this.style.display = "none";
    }
};

// Toast notifications
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const iconSvg = type === "success"
        ? `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
               <polyline points="22 4 12 14.01 9 11.01"/>
           </svg>`
        : `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <circle cx="12" cy="12" r="10"/>
               <line x1="15" y1="9" x2="9" y2="15"/>
               <line x1="9" y1="9" x2="15" y2="15"/>
           </svg>`;

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Delete confirmation modal
let pendingDelete = null;

window.confirmDelete = function(name, manager) {
    pendingDelete = { name, manager };
    document.getElementById("modalMessage").textContent =
        t("deleteMessage").replace("{name}", name).replace("{manager}", manager);
    document.getElementById("modalOverlay").style.display = "flex";
};

document.getElementById("modalCancel").onclick = function() {
    document.getElementById("modalOverlay").style.display = "none";
    pendingDelete = null;
};

document.getElementById("modalConfirm").onclick = async function() {
    document.getElementById("modalOverlay").style.display = "none";
    if (!pendingDelete) return;

    const { name, manager } = pendingDelete;
    pendingDelete = null;

    try {
        await UninstallPackage(name, manager, "");
        allPackages = allPackages.filter(p => !(p.name === name && p.manager === manager));
        renderPackages();
        showToast(`"${name}" ${t("deleted")}`, "success");
    } catch (err) {
        const errMsg = err.toString();
        if (errMsg.includes("password") || errMsg.includes("sudo")) {
            showPasswordModal(name, manager);
        } else {
            showToast(`${t("deleteError")}: ${errMsg}`, "error");
        }
    }
};

document.getElementById("modalOverlay").onclick = function(e) {
    if (e.target === this) {
        this.style.display = "none";
        pendingDelete = null;
    }
};

// Password modal
let pendingPasswordDelete = null;

function showPasswordModal(name, manager) {
    pendingPasswordDelete = { name, manager };
    document.getElementById("passwordInput").value = "";
    document.getElementById("passwordModalOverlay").style.display = "flex";
    setTimeout(() => document.getElementById("passwordInput").focus(), 100);
}

document.getElementById("passwordCancel").onclick = function() {
    document.getElementById("passwordModalOverlay").style.display = "none";
    pendingPasswordDelete = null;
};

document.getElementById("passwordConfirm").onclick = async function() {
    const password = document.getElementById("passwordInput").value;
    if (!password) return;

    document.getElementById("passwordModalOverlay").style.display = "none";
    if (!pendingPasswordDelete) return;

    const { name, manager } = pendingPasswordDelete;
    pendingPasswordDelete = null;

    try {
        await UninstallPackage(name, manager, password);
        allPackages = allPackages.filter(p => !(p.name === name && p.manager === manager));
        renderPackages();
        showToast(`"${name}" ${t("deleted")}`, "success");
    } catch (err) {
        showToast(`${t("deleteError")}: ${err.toString()}`, "error");
    }
};

document.getElementById("passwordInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        document.getElementById("passwordConfirm").click();
    }
});

document.getElementById("passwordModalOverlay").onclick = function(e) {
    if (e.target === this) {
        this.style.display = "none";
        pendingPasswordDelete = null;
    }
};

// About panel
document.getElementById("aboutBtn").onclick = function() {
    document.getElementById("aboutOverlay").style.display = "flex";
};

document.getElementById("aboutClose").onclick = function() {
    document.getElementById("aboutOverlay").style.display = "none";
};

document.getElementById("aboutOverlay").onclick = function(e) {
    if (e.target === this) {
        this.style.display = "none";
    }
};

// Theme toggle
const themeBtn = document.getElementById("themeBtn");
let currentTheme = localStorage.getItem("theme") || "dark";

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    currentTheme = theme;
    localStorage.setItem("theme", theme);
}

applyTheme(currentTheme);

themeBtn.onclick = function() {
    applyTheme(currentTheme === "dark" ? "light" : "dark");
};

// Language toggle
document.getElementById("langBtn").onclick = function() {
    const newLang = getLang() === "ru" ? "en" : "ru";
    setLang(newLang);
    updateAllTranslations();
    if (allPackages.length > 0) {
        renderPackages();
    }
};

// Search
const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("input", function() {
    searchQuery = this.value.trim();
    renderPackages();
});

document.addEventListener("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInput.focus();
    }
    if (e.key === "Escape") {
        document.getElementById("modalOverlay").style.display = "none";
        document.getElementById("passwordModalOverlay").style.display = "none";
        document.getElementById("aboutOverlay").style.display = "none";
        document.getElementById("detailOverlay").style.display = "none";
        searchInput.blur();
    }
});

// Filters
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        currentFilter = this.dataset.filter;
        renderPackages();
    });
});

// Refresh
document.getElementById("refreshBtn").addEventListener("click", function() {
    this.classList.add("spinning");
    document.getElementById("loadingOverlay").style.display = "flex";
    document.getElementById("packageList").innerHTML = "";

    loadPackages().finally(() => {
        this.classList.remove("spinning");
    });
});

// Load packages
async function loadPackages() {
    const countEl = document.getElementById("loadingCount");
    let count = 0;
    countEl.textContent = "0";

    const progressInterval = setInterval(() => {
        if (count < 20) {
            count += Math.floor(Math.random() * 3) + 1;
        } else if (count < 50) {
            count += Math.floor(Math.random() * 2) + 1;
        } else if (count < 80) {
            count += 1;
        }
        countEl.textContent = count;
    }, 150);

    try {
        allPackages = await GetInstalledPackages();
        clearInterval(progressInterval);

        const target = allPackages.length;
        const step = Math.max(1, Math.floor((target - count) / 10));
        const finalInterval = setInterval(() => {
            count += step;
            if (count >= target) {
                count = target;
                clearInterval(finalInterval);
            }
            countEl.textContent = count;
        }, 50);

        setTimeout(() => renderPackages(), 400);
    } catch (err) {
        clearInterval(progressInterval);
        console.error("Failed to load packages:", err);
        showToast(t("loadError"), "error");
        document.getElementById("loadingOverlay").style.display = "none";
    }
}

// Context Menu
const ctxMenu = document.getElementById("contextMenu");

document.addEventListener("contextmenu", function(e) {
    const item = e.target.closest(".package-item");
    if (!item) {
        ctxMenu.style.display = "none";
        return;
    }

    e.preventDefault();
    const name = item.dataset.name;
    const manager = item.dataset.manager;
    ctxTarget = { name, manager };

    ctxMenu.style.display = "block";
    ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + "px";
    ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 160) + "px";
});

document.addEventListener("click", function() {
    ctxMenu.style.display = "none";
});

document.getElementById("ctxFiles").onclick = async function() {
    if (!ctxTarget) return;
    const { name, manager } = ctxTarget;
    ctxMenu.style.display = "none";

    try {
        await OpenPackageLocation(name, manager);
    } catch (err) {
        showToast(`${t("filesError")}: ${err.toString()}`, "error");
    }
};

document.getElementById("ctxDetails").onclick = function() {
    if (!ctxTarget) return;
    const { name, manager } = ctxTarget;
    ctxMenu.style.display = "none";
    window.openDetail(name, manager);
};

document.getElementById("ctxDelete").onclick = function() {
    if (!ctxTarget) return;
    const { name, manager } = ctxTarget;
    ctxMenu.style.display = "none";
    window.confirmDelete(name, manager);
};

// Init
updateAllTranslations();
loadPackages();
