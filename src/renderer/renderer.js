/**
 * Windows 清理大师 - 渲染进程 (文件列表版)
 */

const state = {
    junkScanResult: null,
    selectedJunkCategories: new Set(),
    selectedJunkFiles: new Set(),
    largeFilesScanResult: null,
    selectedFiles: new Set(),
    emptyFoldersScanResult: null,
    selectedEmptyFolders: new Set(),
    duplicatesScanResult: null,
    selectedDuplicateGroups: [],
    isScanning: false,
    settings: null,
    diskInfo: null,
    systemInfo: null,
    viewMode: 'category', // 'category' or 'files'
    platform: '',
    // AI 助手状态
    aiConfig: null,
    aiProviders: [],
    aiSelectedFiles: [],
    aiCategorizeResult: null,
    aiRenameResult: null,
    currentAITab: 'categorize',
    // 卸载器状态
    installedApps: [],
    selectedApp: null,
    appRelatedFiles: [],
    selectedRelatedFiles: new Set(),
    // 可视化状态
    treemapData: null
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();
    initNavigationHandlers();
    initWindowControls();
    initAIAssistantListeners();
    loadInitialData();
    loadAIConfig();

    // 默认显示微信支付二维码
    showQRCode('wechat');

    // 初始化 SVG 图标
    setTimeout(() => {
        if (window.Icons) {
            const iconMap = {
                'icon-trash': 'trash',
                'icon-file-chart': 'fileChart',
                'icon-folder': 'folder',
                'icon-copy': 'copy',
                'icon-brain': 'brain',
                'icon-hard-drive': 'hardDrive',
                'icon-monitor': 'monitor',
                'icon-clock': 'clock',
                'icon-shield': 'shield',
                'icon-settings': 'settings'
            };

            Object.entries(iconMap).forEach(([id, iconName]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.innerHTML = window.Icons[iconName];
                }
            });
        }
    }, 100);

    // 强制初始化页面显示
    switchPage('junk-cleaner');
});

function initElements() {
    elements.navItems = document.querySelectorAll('.nav-item');
    elements.btnScanJunk = document.getElementById('btn-scan-junk');
    elements.btnCleanJunk = document.getElementById('btn-clean-junk');
    elements.junkProgress = document.getElementById('junk-progress');
    elements.junkResults = document.getElementById('junk-results');
    elements.junkCategoryGroups = document.getElementById('junk-category-groups');
    elements.headerJunkSize = document.getElementById('header-junk-size');
    elements.headerJunkCount = document.getElementById('header-junk-count');
    elements.btnScanLarge = document.getElementById('btn-scan-large');
    elements.btnStopScan = document.getElementById('btn-stop-scan');
    elements.btnDeleteSelected = document.getElementById('btn-delete-selected');
    elements.targetDrive = document.getElementById('target-drive');
    elements.minFileSize = document.getElementById('min-file-size');
    elements.fileTypeFilter = document.getElementById('file-type-filter');
    elements.largeProgress = document.getElementById('large-progress');
    elements.typeChartContainer = document.getElementById('type-chart-container');
    elements.typeChart = document.getElementById('type-chart');
    elements.typeLegend = document.getElementById('type-legend');
    elements.largeFileList = document.getElementById('large-file-list');
    elements.fileList = document.getElementById('file-list');
    elements.selectedCount = document.getElementById('selected-count');
    elements.sortBy = document.getElementById('sort-by');
    elements.emptyFolderPath = document.getElementById('empty-folder-path');
    elements.btnScanEmpty = document.getElementById('btn-scan-empty');
    elements.btnDeleteEmpty = document.getElementById('btn-delete-empty');
    elements.emptyProgress = document.getElementById('empty-progress');
    elements.emptyFolderList = document.getElementById('empty-folder-list');
    elements.emptyList = document.getElementById('empty-list');
    elements.emptySelectedCount = document.getElementById('empty-selected-count');
    elements.duplicatePath = document.getElementById('duplicate-path');
    elements.duplicateMinSize = document.getElementById('duplicate-min-size');
    elements.btnScanDuplicates = document.getElementById('btn-scan-duplicates');
    elements.btnDeleteDuplicates = document.getElementById('btn-delete-duplicates');
    elements.duplicateProgress = document.getElementById('duplicate-progress');
    elements.duplicateResults = document.getElementById('duplicate-results');
    elements.duplicateList = document.getElementById('duplicate-list');
    elements.diskCards = document.getElementById('disk-cards');
    elements.storageMiniText = document.getElementById('storage-mini-text');
    elements.storageMiniFile = document.getElementById('storage-mini-fill');
    elements.historyList = document.getElementById('history-list');
    elements.whitelistList = document.getElementById('whitelist-list');
    elements.whitelistInput = document.getElementById('whitelist-input');
    elements.toastContainer = document.getElementById('toast-container');
    elements.confirmModal = document.getElementById('confirm-modal');
}

async function loadInitialData() {
    loadSettings();
    loadDiskInfo();
    await loadSystemInfo();
    // 显示平台徽章
    if (state.systemInfo) {
        const badge = document.getElementById('platform-badge');
        if (badge) {
            badge.textContent = `${state.systemInfo.platformIcon} ${state.systemInfo.platform}`;
        }
    }
}

function initEventListeners() {
    elements.btnScanJunk.addEventListener('click', scanJunkFiles);
    elements.btnCleanJunk.addEventListener('click', cleanJunkFiles);
    document.getElementById('btn-select-all-junk').addEventListener('click', selectAllJunkCategories);
    document.getElementById('btn-deselect-all-junk').addEventListener('click', deselectAllJunkCategories);
    document.getElementById('btn-view-category')?.addEventListener('click', () => setViewMode('category'));
    document.getElementById('btn-view-files')?.addEventListener('click', () => setViewMode('files'));
    elements.btnScanLarge.addEventListener('click', scanLargeFiles);
    elements.btnStopScan.addEventListener('click', stopScan);
    elements.btnDeleteSelected.addEventListener('click', deleteSelectedFiles);
    elements.sortBy.addEventListener('change', sortFiles);
    document.getElementById('btn-select-all').addEventListener('click', selectAllFiles);
    document.getElementById('btn-deselect-all').addEventListener('click', deselectAllFiles);
    document.getElementById('btn-browse-empty')?.addEventListener('click', async () => {
        const r = await window.electronAPI.selectFolder();
        if (r.success) elements.emptyFolderPath.value = r.path;
    });
    elements.btnScanEmpty?.addEventListener('click', scanEmptyFolders);
    elements.btnDeleteEmpty?.addEventListener('click', deleteEmptyFolders);
    document.getElementById('btn-select-all-empty')?.addEventListener('click', selectAllEmptyFolders);
    document.getElementById('btn-deselect-all-empty')?.addEventListener('click', deselectAllEmptyFolders);
    document.getElementById('btn-browse-duplicate')?.addEventListener('click', async () => {
        const r = await window.electronAPI.selectFolder();
        if (r.success) elements.duplicatePath.value = r.path;
    });
    elements.btnScanDuplicates?.addEventListener('click', scanDuplicateFiles);
    elements.btnDeleteDuplicates?.addEventListener('click', deleteDuplicateFiles);
    document.getElementById('btn-export-report')?.addEventListener('click', exportReport);
    document.getElementById('btn-clear-history')?.addEventListener('click', clearHistory);
    document.getElementById('btn-browse-whitelist')?.addEventListener('click', async () => {
        const r = await window.electronAPI.selectFolder();
        if (r.success) elements.whitelistInput.value = r.path;
    });
    document.getElementById('btn-add-whitelist')?.addEventListener('click', addWhitelistPath);
    document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);
    // 应用卸载器
    document.getElementById('btn-refresh-apps')?.addEventListener('click', scanInstalledApps);
    document.getElementById('btn-do-uninstall')?.addEventListener('click', performUninstall);
    // 可视化
    document.getElementById('btn-visualize-browse')?.addEventListener('click', async () => {
        const r = await window.electronAPI.selectFolder();
        if (r.success) document.getElementById('visualizer-path').value = r.path;
    });
    document.getElementById('btn-start-visualize')?.addEventListener('click', startVisualizer);
    // 打赏二维码
    document.getElementById('btn-show-alipay')?.addEventListener('click', () => showQRCode('alipay'));
    document.getElementById('btn-show-wechat')?.addEventListener('click', () => showQRCode('wechat'));
    window.electronAPI.onScanProgress(handleJunkScanProgress);
    window.electronAPI.onCleanProgress(handleCleanProgress);
    window.electronAPI.onScanLargeProgress(handleLargeScanProgress);
    window.electronAPI.onScanEmptyProgress?.(handleEmptyScanProgress);
    window.electronAPI.onScanDuplicateProgress?.(handleDuplicateScanProgress);
}

function initNavigationHandlers() {
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => switchPage(item.dataset.page));
    });
}

function switchPage(pageId) {
    elements.navItems.forEach(item => {
        const isActive = item.dataset.page === pageId;
        item.classList.toggle('bg-gradient-to-r', isActive);
        item.classList.toggle('from-blue-600', isActive);
        item.classList.toggle('to-cyan-500', isActive);
        item.classList.toggle('text-white', isActive);
        item.classList.toggle('shadow-lg', isActive);
        item.classList.toggle('text-slate-400', !isActive);
        item.classList.toggle('hover:bg-slate-800', !isActive);
    });

    console.log('[页面] 切换:', pageId);

    // 定义所有页面 ID，确保不会漏掉任何页面，不再依赖 class 选择器
    const allPageIds = [
        'junk-cleaner',
        'large-files',
        'empty-folders',
        'duplicates',
        'disk-info',
        'ai-assistant',
        'uninstaller',
        'visualizer',
        'history',
        'whitelist',
        'settings'
    ];

    allPageIds.forEach(id => {
        const el = document.getElementById(`page-${id}`);
        if (el) {
            // 如果请求的是 system-info，显示 junk-cleaner (仪表盘)
            const target = (pageId === 'system-info') ? 'junk-cleaner' : pageId;
            const shouldShow = id === target;

            if (shouldShow) {
                el.style.display = 'block';
                el.classList.remove('hidden');

                // 重置并触发淡入动画
                el.classList.remove('animate-fade-in');
                void el.offsetWidth; // 触发重绘
                el.classList.add('animate-fade-in');

                console.log(`[页面] 显示并播放动画: ${id}`);
            } else {
                el.style.display = 'none';
            }
        } else {
            console.warn(`[页面] 未找到页面元素: page-${id}`);
        }
    });
    if (pageId === 'junk-cleaner') {
        loadSystemInfo();
        loadDevCleanerData();
    }
    if (pageId === 'disk-info' && !state.diskInfo) loadDiskInfo();
    if (pageId === 'history') loadHistory();
    if (pageId === 'whitelist') loadWhitelist();
    if (pageId === 'settings') loadSettingsUI();
    if (pageId === 'uninstaller') scanInstalledApps();
}

// --- 应用卸载逻辑 ---
async function scanInstalledApps() {
    const btn = document.getElementById('btn-refresh-apps');
    const container = document.getElementById('app-list-container');
    if (state.isScanning) return;

    state.isScanning = true;
    btn.disabled = true;
    container.innerHTML = '<div class="p-12 text-center"><div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><span class="text-sm text-slate-400">正在检索已安装的应用...</span></div>';

    try {
        const r = await window.electronAPI.getInstalledApps();
        if (r.success) {
            const apps = r.data || [];
            state.installedApps = apps;
            renderAppList(apps);
            showToast('success', `找到 ${apps.length} 个应用`);
        } else {
            showToast('error', '获取应用列表失败');
        }
    } catch (e) {
        showToast('error', '扫描出错');
    } finally {
        state.isScanning = false;
        btn.disabled = false;
    }
}

function renderAppList(apps) {
    const container = document.getElementById('app-list-container');
    if (apps.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-500">未发现可卸载的应用</div>';
        return;
    }

    container.innerHTML = apps.map(app => `
        <div class="app-item flex items-center gap-3 px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors" data-path="${app.path.replace(/"/g, '&quot;')}">
            <div class="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xl overflow-hidden">
                ${app.icon ? `<img src="${app.icon}" class="w-full h-full object-contain" />` : '📦'}
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-white truncate">${app.name}</div>
                <div class="text-[10px] text-slate-500 truncate">${app.path}</div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.app-item').forEach(el => {
        el.addEventListener('click', () => selectAppForUninstall(el.dataset.path, el));
    });
}

async function selectAppForUninstall(appPath, el) {
    // UI 反馈
    document.querySelectorAll('.app-item').forEach(item => item.classList.remove('bg-blue-600/20', 'border-blue-500/50'));
    el.classList.add('bg-blue-600/20', 'border-blue-500/50');

    const fileContainer = document.getElementById('app-related-files');
    const actionsTray = document.getElementById('uninstall-actions');

    fileContainer.innerHTML = '<div class="p-12 text-center"><div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div><span class="text-xs text-slate-500">正在搜索关联文件...</span></div>';
    actionsTray.classList.add('hidden');

    try {
        const app = state.installedApps.find(a => a.path === appPath);
        const r = await window.electronAPI.findAppRelatedFiles(appPath, app?.bundleId);
        if (r.success) {
            state.selectedApp = app;
            state.appRelatedFiles = r.data || [];
            state.selectedRelatedFiles = new Set(state.appRelatedFiles.map(f => f.path));
            renderRelatedFiles(state.appRelatedFiles);
            actionsTray.classList.remove('hidden');
            updateUninstallSummary();
        }
    } catch (e) {
        showToast('error', '搜索关联文件失败');
    }
}

function renderRelatedFiles(files) {
    const container = document.getElementById('app-related-files');
    if (files.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-500 text-xs">未找到额外关联文件</div>';
        return;
    }

    container.innerHTML = files.map(file => `
        <div class="file-item flex items-center gap-3 px-4 py-2 hover:bg-slate-800/50 cursor-pointer" data-path="${file.path.replace(/"/g, '&quot;')}">
            <div class="w-4 h-4 border border-slate-600 rounded flex items-center justify-center flex-shrink-0 checkbox bg-blue-500 border-blue-500">
                <span class="text-white text-[10px]">✓</span>
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-[11px] text-slate-300 truncate">${file.name}</div>
                <div class="text-[9px] text-slate-500 truncate">${file.type}</div>
            </div>
            <div class="text-[10px] text-amber-500 font-mono">${formatSize(file.size)}</div>
        </div>
    `).join('');

    container.querySelectorAll('.file-item').forEach(el => {
        el.addEventListener('click', () => {
            const path = el.dataset.path;
            const cb = el.querySelector('.checkbox');
            if (state.selectedRelatedFiles.has(path)) {
                state.selectedRelatedFiles.delete(path);
                cb.classList.remove('bg-blue-500', 'border-blue-500');
                cb.innerHTML = '';
            } else {
                state.selectedRelatedFiles.add(path);
                cb.classList.add('bg-blue-500', 'border-blue-500');
                cb.innerHTML = '<span class="text-white text-[10px]">✓</span>';
            }
            updateUninstallSummary();
        });
    });
}

function updateUninstallSummary() {
    let total = 0;
    state.appRelatedFiles.forEach(f => {
        if (state.selectedRelatedFiles.has(f.path)) total += f.size;
    });
    document.getElementById('uninstall-freed-size').textContent = formatSize(total);
}

async function performUninstall() {
    if (!state.selectedApp) return;

    // 转换为服务需要的对象格式
    const selectedFiles = state.appRelatedFiles.filter(f => state.selectedRelatedFiles.has(f.path));

    const confirmed = await showConfirmDialog(`确定要卸载 "${state.selectedApp.name}" 及其选中的关联文件吗？\n此操作不可撤销。`);
    if (!confirmed) return;

    const btn = document.getElementById('btn-do-uninstall');
    btn.disabled = true;
    btn.textContent = '正在卸载...';

    try {
        const r = await window.electronAPI.uninstallApp(state.selectedApp.path, selectedFiles);
        if (r.success) {
            showToast('success', '应用已彻底卸载');
            // 重置 UI
            document.getElementById('app-related-files').innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">选择应用以查看关联文件</div>';
            document.getElementById('uninstall-actions').classList.add('hidden');
            state.selectedApp = null;
            scanInstalledApps(); // 刷新列表
        } else {
            showToast('error', r.error || '卸载失败');
        }
    } catch (e) {
        showToast('error', '操作出错');
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 彻底卸载并清理';
    }
}

// --- 磁盘大地图逻辑 ---
async function startVisualizer() {
    const path = document.getElementById('visualizer-path').value;
    const loading = document.getElementById('visualizer-loading');

    loading.classList.remove('hidden');
    try {
        const r = await window.electronAPI.getFolderTreeMap(path);
        if (r.success) {
            renderTreeMap(r.data);
        } else {
            showToast('error', '分析目录失败');
        }
    } catch (e) {
        showToast('error', '可视化渲染出错');
    } finally {
        loading.classList.add('hidden');
    }
}

function renderTreeMap(data) {
    const canvas = document.getElementById('treemap-canvas');
    canvas.innerHTML = ''; // 清空

    if (!data || !data.children || data.children.length === 0) {
        canvas.innerHTML = '<div class="flex items-center justify-center h-full text-slate-500">文件夹为空或无法访问</div>';
        return;
    }

    // 绘制 Treemap (简单 HTML 实现)
    const container = document.createElement('div');
    container.className = 'flex w-full h-full gap-1 p-1';

    // 按大小排序
    const children = [...data.children].sort((a, b) => b.size - a.size);
    const total = data.size;

    // 简单的 Flexbox 分块布局 (递归更好，这里做一层演示)
    children.forEach(item => {
        const ratio = (item.size / total) * 100;
        if (ratio < 1) return; // 忽略太小的

        const block = document.createElement('div');
        block.className = 'relative group rounded overflow-hidden flex flex-col items-center justify-center transition-all hover:scale-[1.01] hover:z-10 cursor-pointer shadow-sm';
        block.style.width = `${ratio}%`;
        block.style.backgroundColor = getFolderColor(item.name);

        block.innerHTML = `
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
            <div class="text-[10px] font-bold text-white px-1 truncate w-full text-center">${item.name}</div>
            <div class="text-[9px] text-white/70">${formatSize(item.size)}</div>
            <div class="hidden group-hover:block absolute bottom-1 right-1 bg-black/50 text-[8px] text-white px-1 rounded">${Math.round(ratio)}%</div>
        `;

        block.onclick = () => {
            document.getElementById('visualizer-path').value = item.path;
            startVisualizer();
        };

        container.appendChild(block);
    });

    canvas.appendChild(container);
}

function getFolderColor(name) {
    const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function initWindowControls() {
    // 防止重复初始化
    if (window._themeInitialized) {
        console.log('[主题] 已经初始化过，跳过');
        return;
    }
    window._themeInitialized = true;

    // 窗口控制按钮
    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');

    if (btnMinimize) btnMinimize.addEventListener('click', () => window.electronAPI.minimizeWindow());
    if (btnMaximize) btnMaximize.addEventListener('click', () => window.electronAPI.maximizeWindow());
    if (btnClose) btnClose.addEventListener('click', () => window.electronAPI.closeWindow());

    // 主题切换 - 使用更可靠的方式
    setTimeout(() => {
        const themeBtn = document.getElementById('btn-toggle-theme');
        console.log('[主题] 查找主题切换按钮:', themeBtn);

        if (themeBtn) {
            // 移除可能存在的旧监听器
            const newBtn = themeBtn.cloneNode(true);
            themeBtn.parentNode.replaceChild(newBtn, themeBtn);

            // 添加新的监听器
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[主题] 按钮被点击');
                toggleTheme();
            });

            console.log('[主题] 事件监听器已绑定');
        } else {
            console.error('[主题] 找不到主题切换按钮！');
        }

        // 加载保存的主题
        loadTheme();
    }, 100);
}

// 主题管理
function loadTheme() {
    try {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        console.log('[主题] 加载保存的主题:', savedTheme);
        applyTheme(savedTheme);
    } catch (error) {
        console.error('[主题] 加载主题失败:', error);
        applyTheme('dark');
    }
}

function toggleTheme() {
    try {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        console.log('[主题] 切换主题:', currentTheme, '->', newTheme);

        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        console.log('[主题] 主题已保存到 localStorage');
    } catch (error) {
        console.error('[主题] 切换主题失败:', error);
    }
}

function applyTheme(theme) {
    try {
        console.log('[主题] 开始应用主题:', theme);

        // 设置 data-theme 属性
        document.documentElement.setAttribute('data-theme', theme);

        // 设置 dark 类 (Tailwind 需要)
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        console.log('[主题] data-theme 属性已设置, dark 类已更新');

        // 更新图标和文本
        const sunIcon = document.getElementById('theme-icon-sun');
        const moonIcon = document.getElementById('theme-icon-moon');
        const themeText = document.getElementById('theme-text');

        console.log('[主题] 找到的元素:', {
            sunIcon: !!sunIcon,
            moonIcon: !!moonIcon,
            themeText: !!themeText
        });

        if (theme === 'light') {
            // 亮色主题
            if (sunIcon) sunIcon.classList.add('hidden');
            if (moonIcon) moonIcon.classList.remove('hidden');
            if (themeText) themeText.textContent = '亮色';
            console.log('[主题] 已切换到亮色主题');
        } else {
            // 暗色主题
            if (sunIcon) sunIcon.classList.remove('hidden');
            if (moonIcon) moonIcon.classList.add('hidden');
            if (themeText) themeText.textContent = '暗色';
            console.log('[主题] 已切换到暗色主题');
        }

        console.log('[主题] 主题应用完成');
    } catch (error) {
        console.error('[主题] 应用主题失败:', error);
    }
}

// 设置功能
async function loadSettings() { try { const r = await window.electronAPI.getSettings(); if (r.success) state.settings = r.data; } catch (e) { } }
function loadSettingsUI() { if (!state.settings) return; document.getElementById('setting-confirm-clean').checked = state.settings.confirmBeforeClean; document.getElementById('setting-show-report').checked = state.settings.showReportAfterClean; document.getElementById('setting-history-days').value = state.settings.historyRetentionDays; document.getElementById('setting-default-drive').value = state.settings.defaultDrive; document.getElementById('setting-min-size').value = state.settings.defaultMinFileSize; }
async function saveSettings() { const s = { confirmBeforeClean: document.getElementById('setting-confirm-clean').checked, showReportAfterClean: document.getElementById('setting-show-report').checked, historyRetentionDays: parseInt(document.getElementById('setting-history-days').value), defaultDrive: document.getElementById('setting-default-drive').value, defaultMinFileSize: parseInt(document.getElementById('setting-min-size').value) }; const r = await window.electronAPI.updateSettings(s); if (r.success) { state.settings = { ...state.settings, ...s }; showToast('success', '设置已保存'); } }

// 白名单功能
async function loadWhitelist() { const r = await window.electronAPI.getExcludePaths(); if (r.success) renderWhitelist(r.data); }
function renderWhitelist(paths) { if (paths.length === 0) { elements.whitelistList.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">暂无白名单路径</div>'; return; } elements.whitelistList.innerHTML = paths.map(p => `<div class="flex items-center justify-between px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50"><div class="flex items-center gap-3"><span class="text-lg">📁</span><span class="text-sm text-white">${p}</span></div><button class="px-2 py-1 text-xs rounded border border-red-500/50 text-red-400 hover:bg-red-500/10" onclick="removeWhitelistPath('${p.replace(/\\/g, '\\\\')}')">移除</button></div>`).join(''); }
async function addWhitelistPath() { const p = elements.whitelistInput.value.trim(); if (!p) return showToast('warning', '请输入路径'); const r = await window.electronAPI.addExcludePath(p); if (r.success) { elements.whitelistInput.value = ''; loadWhitelist(); showToast('success', '已添加'); } }
window.removeWhitelistPath = async function (p) { const r = await window.electronAPI.removeExcludePath(p); if (r.success) { loadWhitelist(); showToast('success', '已移除'); } };

// 历史记录
async function loadHistory() { const [h, s] = await Promise.all([window.electronAPI.getHistory(50), window.electronAPI.getStatistics()]); if (s.success) { document.getElementById('stat-total-cleaned').textContent = s.data.totalCleanedFormatted; document.getElementById('stat-total-files').textContent = s.data.totalFiles.toLocaleString(); document.getElementById('stat-clean-count').textContent = s.data.cleanCount; } if (h.success) renderHistory(h.data); }
// 渲染历史记录
function renderHistory(records) {
    if (records.length === 0) {
        elements.historyList.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">暂无清理记录</div>';
        return;
    }

    const n = { junk: '垃圾清理', 'large-files': '大文件', 'empty-folders': '空文件夹', duplicates: '重复文件', 'ai-categorize': 'AI 智能整理' };
    const i = { junk: '🗑️', 'large-files': '📊', 'empty-folders': '📂', duplicates: '🔄', 'ai-categorize': '🤖' };

    elements.historyList.innerHTML = records.map(r => `
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50">
            <div class="flex items-center gap-3">
                <span class="text-lg">${i[r.type] || '📋'}</span>
                <div>
                    <div class="text-sm font-medium text-white">${n[r.type] || r.type}</div>
                    <div class="text-xs text-slate-500">${new Date(r.timestamp).toLocaleString()}</div>
                    ${r.details ? `<div class="text-xs text-slate-600 mt-0.5">${r.details}</div>` : ''}
                </div>
            </div>
            <div class="text-right">
                <div class="text-sm font-semibold text-amber-400">${r.freedSizeFormatted || '-'}</div>
                <div class="text-xs text-slate-500">${r.deletedCount > 0 ? r.deletedCount + ' 个文件' : ''}</div>
                ${r.canUndo ? `<button class="btn-undo mt-1 px-2 py-0.5 text-xs bg-slate-700 text-blue-400 rounded hover:bg-slate-600 transition-colors border border-slate-600" data-id="${r.id}">↩️ 撤销</button>` : ''}
                ${r.undone ? `<div class="text-xs text-red-400 mt-1">已撤销</div>` : ''}
            </div>
        </div>
    `).join('');

    // 绑定撤销按钮事件（如果之前没绑定过）不必每次绑定，但这里是重新渲染innerHTML，所以原来的元素没了。
    // 使用事件委托绑定一次到 container 更好，但这里我可以临时加个 hack：
    // 更好的方式是在 renderer.js 底部加一个统一的委托监听。
}
async function exportReport() { const r = await window.electronAPI.exportReport('txt'); if (r.success) showToast('success', '报告已导出'); }
async function clearHistory() { if (!await showConfirmDialog('确定清空所有历史记录吗？')) return; const r = await window.electronAPI.clearHistory(); if (r.success) { loadHistory(); showToast('success', '已清空'); } }

// 视图模式切换
function setViewMode(mode) {
    state.viewMode = mode;
    document.getElementById('btn-view-category')?.classList.toggle('bg-blue-500', mode === 'category');
    document.getElementById('btn-view-files')?.classList.toggle('bg-blue-500', mode === 'files');
    if (state.junkScanResult) renderJunkResults(state.junkScanResult);
}

// 垃圾清理
async function scanJunkFiles() {
    if (state.isScanning) return;
    state.isScanning = true;
    elements.btnScanJunk.disabled = true;
    elements.btnCleanJunk.disabled = true;
    elements.junkResults.classList.add('hidden');
    elements.junkProgress.classList.remove('hidden');
    updateProgress(elements.junkProgress, 0, '准备扫描...');
    try {
        const r = await window.electronAPI.scanJunkFiles();
        if (r.success) { state.junkScanResult = r.data; renderJunkResults(r.data); showToast('success', '扫描完成！'); }
        else showToast('error', '扫描失败');
    } catch (e) { showToast('error', '扫描出错'); }
    finally { state.isScanning = false; elements.btnScanJunk.disabled = false; elements.junkProgress.classList.add('hidden'); }
}

function handleJunkScanProgress(p) { updateProgress(elements.junkProgress, p.percentage, `正在扫描: ${p.category}`); document.getElementById('progress-scanned').textContent = p.totalScanned || 0; document.getElementById('progress-found').textContent = p.totalSize || '0 B'; }

function renderJunkResults(data) {
    const groups = {};
    let totalSize = 0, totalFiles = 0;
    state.selectedJunkCategories.clear();
    state.selectedJunkFiles.clear();

    for (const [key, cat] of Object.entries(data)) {
        if (cat.fileCount > 0) {
            const gk = cat.group || 'other';
            if (!groups[gk]) groups[gk] = { name: cat.groupName || '其他', icon: getGroupIcon(gk), items: [], totalSize: 0, fileCount: 0 };
            groups[gk].items.push({ key, ...cat });
            groups[gk].totalSize += cat.totalSize;
            groups[gk].fileCount += cat.fileCount;
            totalSize += cat.totalSize;
            totalFiles += cat.fileCount;
            if (cat.safeToClean) state.selectedJunkCategories.add(key);
        }
    }

    elements.headerJunkSize.textContent = formatSize(totalSize);
    elements.headerJunkCount.textContent = totalFiles.toLocaleString();
    elements.junkCategoryGroups.innerHTML = '';

    const order = ['system', 'browser', 'social', 'development', 'gaming', 'creative', 'office', 'optional'];
    for (const g of order) if (groups[g]) elements.junkCategoryGroups.appendChild(createCategoryGroup({ key: g, ...groups[g] }));

    elements.junkResults.classList.remove('hidden');
    updateCleanButton();
}

function createCategoryGroup(group) {
    const el = document.createElement('div');
    el.className = 'bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden mb-3';
    el.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors group-header">
      <div class="flex items-center gap-2"><span class="text-lg">${group.icon}</span><span class="text-sm font-semibold text-white">${group.name}</span></div>
      <div class="flex items-center gap-3"><span class="text-sm font-bold text-amber-400">${formatSize(group.totalSize)}</span><span class="text-xs text-slate-500">${group.fileCount} 文件</span><span class="text-xs text-slate-500 group-toggle">▼</span></div>
    </div>
    <div class="p-1.5 group-items"></div>
  `;
    const header = el.querySelector('.group-header'), items = el.querySelector('.group-items'), toggle = el.querySelector('.group-toggle');
    header.addEventListener('click', (e) => { if (!e.target.closest('.category-item')) { items.classList.toggle('hidden'); toggle.style.transform = items.classList.contains('hidden') ? 'rotate(-90deg)' : ''; } });
    for (const item of group.items) items.appendChild(createCategoryItem(item));
    return el;
}

function createCategoryItem(cat) {
    const isSelected = state.selectedJunkCategories.has(cat.key);
    const el = document.createElement('div');
    el.className = 'category-item rounded-lg overflow-hidden mb-1';
    el.dataset.key = cat.key;
    el.innerHTML = `
    <div class="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all ${isSelected ? 'bg-blue-500/15' : 'hover:bg-slate-800'} category-header">
      <div class="w-4 h-4 border-2 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'} rounded flex items-center justify-center flex-shrink-0 checkbox">${isSelected ? '<span class="text-white text-[10px] font-bold">✓</span>' : ''}</div>
      <span class="text-xl">${cat.icon}</span>
      <div class="flex-1 min-w-0"><div class="text-sm font-medium text-white">${cat.name}</div><div class="text-xs text-slate-500 truncate">${cat.description || ''}</div></div>
      <div class="text-right flex-shrink-0"><div class="text-xs font-semibold text-amber-400">${formatSize(cat.totalSize)}</div><div class="text-[10px] text-slate-500">${cat.fileCount} 文件</div></div>
      <button class="px-2 py-1 text-[10px] rounded border border-slate-600 text-slate-400 hover:bg-slate-700 expand-btn" title="展开文件列表">📋</button>
    </div>
    <div class="file-detail hidden bg-slate-950 border-t border-slate-800 max-h-60 overflow-y-auto"></div>
  `;
    el.querySelector('.category-header').addEventListener('click', (e) => { if (!e.target.closest('.expand-btn')) toggleJunkCategory(cat.key, el); });
    el.querySelector('.expand-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleFileDetail(cat, el); });
    return el;
}

function toggleFileDetail(cat, el) {
    const detail = el.querySelector('.file-detail');
    if (detail.classList.contains('hidden')) {
        // 按目录分组
        const byDir = {};
        for (const f of cat.files || []) {
            const dir = f.path.substring(0, f.path.lastIndexOf('\\')) || f.path;
            if (!byDir[dir]) byDir[dir] = [];
            byDir[dir].push(f);
        }
        detail.innerHTML = Object.entries(byDir).map(([dir, files]) => `
      <div class="border-b border-slate-800 last:border-b-0">
        <div class="px-3 py-2 bg-slate-900/50 text-xs text-slate-400 font-medium truncate cursor-pointer hover:bg-slate-800 dir-header" title="${dir}">📁 ${dir.length > 60 ? '...' + dir.slice(-57) : dir} <span class="text-slate-500">(${files.length})</span></div>
        <div class="dir-files hidden">
          ${files.slice(0, 50).map(f => `
            <div class="flex items-center gap-2 px-4 py-1.5 hover:bg-slate-800/50 cursor-pointer file-item" data-path="${f.path.replace(/"/g, '&quot;')}">
              <div class="w-3 h-3 border border-slate-600 rounded flex items-center justify-center flex-shrink-0 file-cb"></div>
              <span class="text-xs text-slate-300 truncate flex-1">${f.name}</span>
              <span class="text-[10px] text-slate-500">${formatSize(f.size)}</span>
            </div>
          `).join('')}
          ${files.length > 50 ? `<div class="px-4 py-1 text-xs text-slate-500">... 还有 ${files.length - 50} 个文件</div>` : ''}
        </div>
      </div>
    `).join('');
        // 目录折叠事件
        detail.querySelectorAll('.dir-header').forEach(h => h.addEventListener('click', () => h.nextElementSibling.classList.toggle('hidden')));
        // 文件选择事件
        detail.querySelectorAll('.file-item').forEach(fi => fi.addEventListener('click', () => toggleFileItem(fi)));
        detail.classList.remove('hidden');
    } else {
        detail.classList.add('hidden');
    }
}

function toggleFileItem(el) {
    const path = el.dataset.path;
    const cb = el.querySelector('.file-cb');
    if (state.selectedJunkFiles.has(path)) {
        state.selectedJunkFiles.delete(path);
        cb.classList.remove('bg-blue-500', 'border-blue-500');
        cb.classList.add('border-slate-600');
        cb.innerHTML = '';
    } else {
        state.selectedJunkFiles.add(path);
        cb.classList.add('bg-blue-500', 'border-blue-500');
        cb.classList.remove('border-slate-600');
        cb.innerHTML = '<span class="text-white text-[8px]">✓</span>';
    }
    updateCleanButton();
}

function getGroupIcon(key) { return { system: '🖥️', browser: '🌐', social: '💬', development: '👨‍💻', gaming: '🎮', creative: '🎨', office: '📊', optional: '⚙️' }[key] || '📁'; }

function toggleJunkCategory(key, el) {
    const cb = el.querySelector('.checkbox');
    const header = el.querySelector('.category-header');
    if (state.selectedJunkCategories.has(key)) {
        state.selectedJunkCategories.delete(key);
        header.classList.remove('bg-blue-500/15'); header.classList.add('hover:bg-slate-800');
        cb.classList.remove('bg-blue-500', 'border-blue-500'); cb.classList.add('border-slate-600'); cb.innerHTML = '';
    } else {
        state.selectedJunkCategories.add(key);
        header.classList.add('bg-blue-500/15'); header.classList.remove('hover:bg-slate-800');
        cb.classList.add('bg-blue-500', 'border-blue-500'); cb.classList.remove('border-slate-600');
        cb.innerHTML = '<span class="text-white text-[10px] font-bold">✓</span>';
    }
    updateCleanButton();
}

function selectAllJunkCategories() { document.querySelectorAll('.category-item').forEach(el => { if (!state.selectedJunkCategories.has(el.dataset.key)) toggleJunkCategory(el.dataset.key, el); }); }
function deselectAllJunkCategories() { document.querySelectorAll('.category-item').forEach(el => { if (state.selectedJunkCategories.has(el.dataset.key)) toggleJunkCategory(el.dataset.key, el); }); }

function updateCleanButton() {
    let size = 0;
    for (const key of state.selectedJunkCategories) if (state.junkScanResult?.[key]) size += state.junkScanResult[key].totalSize;
    // 加上单独选中的文件
    for (const path of state.selectedJunkFiles) {
        for (const cat of Object.values(state.junkScanResult || {})) {
            const f = cat.files?.find(f => f.path === path);
            if (f) size += f.size;
        }
    }
    elements.btnCleanJunk.disabled = state.selectedJunkCategories.size === 0 && state.selectedJunkFiles.size === 0;
    elements.headerJunkSize.textContent = formatSize(size);
}

async function cleanJunkFiles() {
    // 优先清理单独选中的文件
    if (state.selectedJunkFiles.size > 0) {
        const paths = Array.from(state.selectedJunkFiles);
        if (state.settings?.confirmBeforeClean && !await showConfirmDialog(`确定要清理选中的 ${paths.length} 个文件吗？`)) return;
        elements.btnCleanJunk.disabled = true;
        elements.junkProgress.classList.remove('hidden');
        try {
            const r = await window.electronAPI.cleanSelectedFiles(paths);
            if (r.success) { showToast('success', `已删除 ${r.data.deletedCount} 个文件，释放 ${r.data.freedSizeFormatted}`); await scanJunkFiles(); }
        } catch (e) { showToast('error', '清理出错'); }
        finally { elements.junkProgress.classList.add('hidden'); }
        return;
    }
    // 按分类清理
    if (state.selectedJunkCategories.size === 0) return;
    const size = Array.from(state.selectedJunkCategories).reduce((s, k) => s + (state.junkScanResult[k]?.totalSize || 0), 0);
    if (state.settings?.confirmBeforeClean && !await showConfirmDialog(`确定要清理选中的 ${state.selectedJunkCategories.size} 个分类吗？\n预计释放: ${formatSize(size)}`)) return;
    elements.btnCleanJunk.disabled = true;
    elements.junkProgress.classList.remove('hidden');
    try {
        const r = await window.electronAPI.cleanJunkFiles(Array.from(state.selectedJunkCategories));
        if (r.success) { showToast('success', `已删除 ${r.data.deletedCount} 个文件，释放 ${r.data.freedSizeFormatted}`); await scanJunkFiles(); }
    } catch (e) { showToast('error', '清理出错'); }
    finally { elements.junkProgress.classList.add('hidden'); }
}

function handleCleanProgress(p) { updateProgress(elements.junkProgress, p.percentage, `正在删除: ${p.file}`); }

// 大文件管理
async function scanLargeFiles() { if (state.isScanning) return; state.isScanning = true; elements.btnScanLarge.disabled = true; elements.btnStopScan.classList.remove('hidden'); elements.btnDeleteSelected.disabled = true; elements.typeChartContainer.classList.add('hidden'); elements.largeFileList.classList.add('hidden'); elements.largeProgress.classList.remove('hidden'); try { const r = await window.electronAPI.scanLargeFiles({ targetDrive: elements.targetDrive.value, minSize: parseInt(elements.minFileSize.value), fileTypeFilter: elements.fileTypeFilter.value || null }); if (r.success) { state.largeFilesScanResult = r.data; renderLargeFilesResults(r.data); showToast('success', `发现 ${r.data.fileCount} 个大文件`); } } catch (e) { showToast('error', '扫描出错'); } finally { state.isScanning = false; elements.btnScanLarge.disabled = false; elements.btnStopScan.classList.add('hidden'); elements.largeProgress.classList.add('hidden'); } }
async function stopScan() { await window.electronAPI.stopScan(); showToast('info', '扫描已停止'); }
function handleLargeScanProgress(p) { document.getElementById('large-scan-info').textContent = `已扫描 ${p.scannedFiles?.toLocaleString() || 0} 个文件`; document.getElementById('large-scan-path').textContent = p.currentPath || ''; }
function renderLargeFilesResults(data) { renderTypeChart(data.typeStats, data.totalSize); document.getElementById('large-file-count').textContent = data.fileCount; document.getElementById('large-total-size').textContent = data.totalSizeFormatted; document.getElementById('chart-total-size').textContent = data.totalSizeFormatted; document.getElementById('chart-total-count').textContent = data.fileCount; elements.fileList.innerHTML = ''; state.selectedFiles.clear(); for (const f of data.files) elements.fileList.appendChild(createFileItem(f)); elements.typeChartContainer.classList.remove('hidden'); elements.largeFileList.classList.remove('hidden'); updateSelectedCount(); }
function renderTypeChart(stats, total) { elements.typeChart.innerHTML = ''; elements.typeLegend.innerHTML = ''; const sorted = Object.entries(stats || {}).filter(([_, d]) => d.count > 0).sort((a, b) => b[1].totalSize - a[1].totalSize); for (const [t, d] of sorted) { const pct = total > 0 ? (d.totalSize / total) * 100 : 0; if (pct < 0.5) continue; const seg = document.createElement('div'); seg.className = 'h-full transition-all hover:brightness-110'; seg.style.width = `${pct}%`; seg.style.backgroundColor = d.color; seg.title = `${d.name}: ${d.totalSizeFormatted}`; elements.typeChart.appendChild(seg); } for (const [t, d] of sorted) { if (d.count === 0) continue; const item = document.createElement('div'); item.className = 'flex items-center gap-2 text-xs text-slate-400 cursor-pointer px-2 py-1 rounded hover:bg-slate-800'; item.innerHTML = `<span class="w-2.5 h-2.5 rounded" style="background-color:${d.color}"></span><span class="text-slate-100">${d.icon} ${d.name}</span><span>${d.totalSizeFormatted}</span>`; item.onclick = () => { elements.fileTypeFilter.value = t; scanLargeFiles(); }; elements.typeLegend.appendChild(item); } }
function createFileItem(file) { const item = document.createElement('div'); item.className = 'flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50'; item.dataset.path = file.path; const ti = file.typeInfo || { icon: '📁', name: '其他' }; item.innerHTML = `<div class="w-4 h-4 border-2 border-slate-600 rounded flex items-center justify-center flex-shrink-0 file-checkbox"></div><span class="text-xl flex-shrink-0">${ti.icon}</span><div class="flex-1 min-w-0"><div class="text-sm font-medium text-slate-100 truncate">${file.name}</div><div class="flex gap-2 text-[10px] text-slate-500"><span class="px-1 py-0.5 bg-slate-800 rounded">${ti.name}</span><span>${file.modifiedFormatted}</span></div></div><div class="text-sm font-semibold text-amber-400 flex-shrink-0">${file.sizeFormatted}</div><button class="p-1.5 border border-slate-700 rounded text-slate-400 hover:bg-slate-700 text-sm" data-action="open">📂</button>`; item.onclick = e => { if (!e.target.closest('[data-action]')) toggleFileSelection(file.path, item); }; item.querySelector('[data-action="open"]').onclick = e => { e.stopPropagation(); window.electronAPI.openFileLocation(file.path); }; return item; }
function toggleFileSelection(path, el) { const cb = el.querySelector('.file-checkbox'); if (state.selectedFiles.has(path)) { state.selectedFiles.delete(path); el.classList.remove('bg-blue-500/10'); cb.classList.remove('bg-blue-500', 'border-blue-500'); cb.classList.add('border-slate-600'); cb.innerHTML = ''; } else { state.selectedFiles.add(path); el.classList.add('bg-blue-500/10'); cb.classList.add('bg-blue-500', 'border-blue-500'); cb.classList.remove('border-slate-600'); cb.innerHTML = '<span class="text-white text-[10px] font-bold">✓</span>'; } updateSelectedCount(); }
function selectAllFiles() { document.querySelectorAll('#file-list > div').forEach(el => { if (!state.selectedFiles.has(el.dataset.path)) toggleFileSelection(el.dataset.path, el); }); }
function deselectAllFiles() { document.querySelectorAll('#file-list > div').forEach(el => { if (state.selectedFiles.has(el.dataset.path)) toggleFileSelection(el.dataset.path, el); }); }
function updateSelectedCount() { elements.selectedCount.textContent = state.selectedFiles.size; elements.btnDeleteSelected.disabled = state.selectedFiles.size === 0; }
function sortFiles() { if (!state.largeFilesScanResult) return; const files = [...state.largeFilesScanResult.files]; const by = elements.sortBy.value; if (by === 'size') files.sort((a, b) => b.size - a.size); else if (by === 'date') files.sort((a, b) => new Date(b.modified) - new Date(a.modified)); else if (by === 'name') files.sort((a, b) => a.name.localeCompare(b.name)); elements.fileList.innerHTML = ''; for (const f of files) { const el = createFileItem(f); if (state.selectedFiles.has(f.path)) toggleFileSelection(f.path, el); elements.fileList.appendChild(el); } }
async function deleteSelectedFiles() { if (state.selectedFiles.size === 0) return; if (!await showConfirmDialog(`确定要将 ${state.selectedFiles.size} 个文件移至回收站吗？`)) return; elements.btnDeleteSelected.disabled = true; try { const r = await window.electronAPI.moveToTrash(Array.from(state.selectedFiles)); if (r.success) { showToast('success', `已移至回收站，释放 ${r.data.freedSizeFormatted}`); await scanLargeFiles(); } } catch (e) { showToast('error', '删除出错'); } }

// 空文件夹
async function scanEmptyFolders() { if (state.isScanning) return; state.isScanning = true; elements.btnScanEmpty.disabled = true; elements.btnDeleteEmpty.disabled = true; elements.emptyFolderList.classList.add('hidden'); elements.emptyProgress.classList.remove('hidden'); try { const r = await window.electronAPI.scanEmptyFolders(elements.emptyFolderPath.value); if (r.success) { state.emptyFoldersScanResult = r.data; renderEmptyFolders(r.data); showToast('success', `发现 ${r.data.count} 个空文件夹`); } } catch (e) { showToast('error', '扫描出错'); } finally { state.isScanning = false; elements.btnScanEmpty.disabled = false; elements.emptyProgress.classList.add('hidden'); } }
function handleEmptyScanProgress(p) { document.getElementById('empty-scan-info').textContent = `已扫描 ${p.scannedDirs} 个目录`; document.getElementById('empty-scan-path').textContent = p.currentPath || ''; }
function renderEmptyFolders(data) { document.getElementById('empty-folder-count').textContent = data.count; elements.emptyList.innerHTML = ''; state.selectedEmptyFolders.clear(); for (const f of data.folders) { const el = document.createElement('div'); el.className = 'flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50'; el.dataset.path = f.path; el.innerHTML = `<div class="w-4 h-4 border-2 border-slate-600 rounded flex items-center justify-center flex-shrink-0 empty-checkbox"></div><span class="text-lg">📂</span><div class="flex-1 min-w-0"><div class="text-sm text-slate-100 truncate">${f.name}</div><div class="text-[10px] text-slate-500 truncate">${f.parent}</div></div>`; el.onclick = () => toggleEmptyFolderSelection(f.path, el); elements.emptyList.appendChild(el); } elements.emptyFolderList.classList.remove('hidden'); updateEmptySelectedCount(); }
function toggleEmptyFolderSelection(path, el) { const cb = el.querySelector('.empty-checkbox'); if (state.selectedEmptyFolders.has(path)) { state.selectedEmptyFolders.delete(path); el.classList.remove('bg-blue-500/10'); cb.classList.remove('bg-blue-500', 'border-blue-500'); cb.classList.add('border-slate-600'); cb.innerHTML = ''; } else { state.selectedEmptyFolders.add(path); el.classList.add('bg-blue-500/10'); cb.classList.add('bg-blue-500', 'border-blue-500'); cb.classList.remove('border-slate-600'); cb.innerHTML = '<span class="text-white text-[10px] font-bold">✓</span>'; } updateEmptySelectedCount(); }
function selectAllEmptyFolders() { document.querySelectorAll('#empty-list > div').forEach(el => { if (!state.selectedEmptyFolders.has(el.dataset.path)) toggleEmptyFolderSelection(el.dataset.path, el); }); }
function deselectAllEmptyFolders() { document.querySelectorAll('#empty-list > div').forEach(el => { if (state.selectedEmptyFolders.has(el.dataset.path)) toggleEmptyFolderSelection(el.dataset.path, el); }); }
function updateEmptySelectedCount() { elements.emptySelectedCount.textContent = state.selectedEmptyFolders.size; elements.btnDeleteEmpty.disabled = state.selectedEmptyFolders.size === 0; }
async function deleteEmptyFolders() { if (state.selectedEmptyFolders.size === 0) return; if (!await showConfirmDialog(`确定要删除 ${state.selectedEmptyFolders.size} 个空文件夹吗？`)) return; elements.btnDeleteEmpty.disabled = true; try { const r = await window.electronAPI.deleteEmptyFolders(Array.from(state.selectedEmptyFolders)); if (r.success) { showToast('success', `已删除 ${r.data.deletedCount} 个空文件夹`); await scanEmptyFolders(); } } catch (e) { showToast('error', '删除出错'); } }

// 重复文件
async function scanDuplicateFiles() { if (state.isScanning) return; state.isScanning = true; elements.btnScanDuplicates.disabled = true; elements.btnDeleteDuplicates.disabled = true; elements.duplicateResults.classList.add('hidden'); elements.duplicateProgress.classList.remove('hidden'); try { const r = await window.electronAPI.scanDuplicateFiles({ targetPath: elements.duplicatePath.value, minSize: parseInt(elements.duplicateMinSize.value) }); if (r.success) { state.duplicatesScanResult = r.data; renderDuplicates(r.data); showToast('success', `发现 ${r.data.totalGroups} 组重复文件`); } } catch (e) { showToast('error', '扫描出错'); } finally { state.isScanning = false; elements.btnScanDuplicates.disabled = false; elements.duplicateProgress.classList.add('hidden'); } }
function handleDuplicateScanProgress(p) { document.getElementById('duplicate-scan-info').textContent = `已扫描 ${p.scannedFiles?.toLocaleString() || 0} 个文件`; document.getElementById('duplicate-scan-path').textContent = p.currentPath || ''; }
function renderDuplicates(data) { document.getElementById('duplicate-group-count').textContent = data.totalGroups; document.getElementById('duplicate-total-wasted').textContent = data.totalWastedSizeFormatted; document.getElementById('duplicate-wasted').textContent = data.totalWastedSizeFormatted; elements.duplicateList.innerHTML = ''; state.selectedDuplicateGroups = [...data.groups]; for (const g of data.groups.slice(0, 50)) { const el = document.createElement('div'); el.className = 'bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden mb-3'; el.innerHTML = `<div class="px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 flex justify-between items-center"><div class="text-sm text-slate-100 font-medium">${g.files[0].name}</div><div class="text-xs text-amber-400 font-semibold">可释放 ${g.wastedSizeFormatted}</div></div><div class="p-2">${g.files.map((f, i) => `<div class="flex items-center gap-2 px-3 py-2 text-xs ${i === 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : ''} rounded mb-1"><span>${i === 0 ? '✅' : '📄'}</span><span class="text-slate-400 truncate flex-1" title="${f.path}">${f.directory}</span><span class="text-slate-500">${f.sizeFormatted}</span>${i === 0 ? '<span class="text-[10px] text-emerald-400 font-semibold">保留</span>' : '<span class="text-[10px] text-red-400 font-semibold">删除</span>'}</div>`).join('')}</div>`; elements.duplicateList.appendChild(el); } elements.duplicateResults.classList.remove('hidden'); elements.btnDeleteDuplicates.disabled = data.groups.length === 0; }
async function deleteDuplicateFiles() { if (state.selectedDuplicateGroups.length === 0) return; if (!await showConfirmDialog(`确定要删除重复文件吗？\n每组只保留第一个文件，可释放 ${state.duplicatesScanResult.totalWastedSizeFormatted}`)) return; elements.btnDeleteDuplicates.disabled = true; try { const r = await window.electronAPI.deleteDuplicateFiles(state.selectedDuplicateGroups); if (r.success) { showToast('success', `已删除 ${r.data.deletedCount} 个文件，释放 ${r.data.freedSizeFormatted}`); await scanDuplicateFiles(); } } catch (e) { showToast('error', '删除出错'); } }

// 磁盘和系统
async function loadDiskInfo() { try { const r = await window.electronAPI.getDiskInfo(); if (r.success) { state.diskInfo = r.data; renderDiskInfo(r.data); } } catch (e) { } }
function renderDiskInfo(drives) {
    elements.diskCards.innerHTML = drives.map(d => {
        let fc = 'from-emerald-500 to-cyan-500';
        if (d.usedPercentage > 90) fc = 'from-red-500 to-orange-500';
        else if (d.usedPercentage > 75) fc = 'from-amber-500 to-orange-500';

        const diskName = d.name || (d.letter === 'C' ? '系统盘' : d.letter === '/' ? 'Macintosh HD' : '本地磁盘');
        const diskIcon = d.letter === 'C' || d.letter === '/' ? '💿' : '📀';

        return `<div class="bg-slate-900/80 border border-slate-700/50 rounded-xl flex gap-4 p-5 hover:border-blue-500/50"><span class="text-4xl">${diskIcon}</span><div class="flex-1"><div class="text-base font-semibold text-slate-100 mb-0.5">${d.letter}: ${diskName}</div><div class="text-[10px] text-slate-500 mb-2">${d.path}</div><div class="h-2 bg-slate-800 rounded-full overflow-hidden mb-2"><div class="h-full bg-gradient-to-r ${fc} rounded-full" style="width:${d.usedPercentage}%"></div></div><div class="flex justify-between text-[10px]"><span><span class="font-semibold text-slate-100">${d.usedFormatted}</span> 已用</span><span><span class="font-semibold text-emerald-400">${d.freeFormatted}</span> 可用</span><span><span class="font-semibold text-slate-100">${d.totalFormatted}</span> 总计</span></div></div></div>`;
    }).join('');

    // 更新侧边栏迷你状态
    const mainDrive = drives.find(d => d.letter === 'C' || d.letter === '/');
    if (mainDrive) {
        if (elements.storageMiniFile) elements.storageMiniFile.style.width = `${mainDrive.usedPercentage}%`;
        if (elements.storageMiniText) elements.storageMiniText.textContent = `${mainDrive.letter === '/' ? '主磁盘' : 'C盘'}: ${mainDrive.freeFormatted} 可用`;

        // 更新首页磁盘概览
        const homeDiskInfo = document.getElementById('home-disk-info');
        if (homeDiskInfo) {
            homeDiskInfo.innerHTML = `
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-xl">💾</span>
                  <h3 class="text-sm font-semibold text-slate-100">磁盘状态</h3>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    ${drives.map(d => {
                let colorClass = 'from-emerald-500 to-cyan-500';
                if (d.usedPercentage > 90) colorClass = 'from-red-500 to-orange-500';
                else if (d.usedPercentage > 75) colorClass = 'from-amber-500 to-orange-500';
                else colorClass = 'from-blue-500 to-cyan-500';

                return `
                        <div class="bg-slate-800/50 p-2.5 rounded-lg border border-slate-800/50 hover:bg-slate-800/80 transition-colors">
                            <div class="flex justify-between items-center mb-1.5">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-base">${d.letter === 'C' || d.letter === '/' ? '💿' : '📀'}</span>
                                    <div>
                                        <div class="text-xs font-bold text-slate-200">${d.letter}</div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-[10px] text-slate-400">剩余 ${d.freeFormatted}</div>
                                </div>
                            </div>
                            <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1.5">
                                <div class="h-full bg-gradient-to-r ${colorClass} rounded-full" style="width: ${d.usedPercentage}%"></div>
                            </div>
                            <div class="flex justify-between text-[10px] text-slate-500">
                                <span class="truncate max-w-[80px]" title="${d.name || '本地磁盘'}">${d.name || '本地磁盘'}</span>
                                <span>${d.usedPercentage}%</span>
                            </div>
                        </div>
                        `;
            }).join('')}
                </div>
            `;
        }
    }

    // 更新扫描页面的磁盘选择下拉框
    if (elements.targetDrive) {
        const currentVal = elements.targetDrive.value;
        elements.targetDrive.innerHTML = drives.map(d =>
            `<option value="${d.path}">${d.letter}: ${d.name || (d.letter === 'C' ? '系统盘' : d.letter === '/' ? 'Macintosh HD' : '本地磁盘')} (${d.freeFormatted} 可用)</option>`
        ).join('');
        // 尝试保持之前选中的值
        if (currentVal && Array.from(elements.targetDrive.options).some(o => o.value === currentVal)) {
            elements.targetDrive.value = currentVal;
        }
    }
}
async function loadSystemInfo() { try { const r = await window.electronAPI.getSystemInfo(); if (r.success) { state.systemInfo = r.data; renderSystemInfo(r.data); } } catch (e) { } }
function renderSystemInfo(info) {
    // 渲染首页系统信息卡片
    const osCard = document.getElementById('dash-os');
    const cpuCard = document.getElementById('dash-cpu');
    const memCard = document.getElementById('dash-mem');

    // 1. 系统信息
    if (osCard) {
        osCard.className = "bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 min-h-[140px] flex flex-col justify-between hover:border-blue-500/30 transition-colors group";
        osCard.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <span class="text-2xl group-hover:scale-110 transition-transform duration-300">🪟</span>
                <span class="text-base font-bold text-white">系统</span>
            </div>
            
            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium">OS</span>
                    <span class="text-slate-300 font-semibold">${info.platform}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium">Ver</span>
                    <span class="text-slate-300 font-mono tracking-tight" title="${info.release}">${info.release}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium">Host</span>
                    <span class="text-blue-400 font-bold max-w-[100px] truncate" title="${info.hostname}">${info.hostname}</span>
                </div>
            </div>
        `;
    }

    // 2. CPU 信息
    if (cpuCard) {
        cpuCard.className = "bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 min-h-[140px] flex flex-col justify-between hover:border-yellow-500/30 transition-colors group";
        cpuCard.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <span class="text-2xl group-hover:scale-110 transition-transform duration-300">⚡</span>
                <span class="text-base font-bold text-white">CPU</span>
            </div>
            
            <div class="space-y-2">
                 <div class="text-xs text-slate-300 font-medium truncate leading-relaxed" title="${info.cpuModel}">
                    ${info.cpuModel?.split(' ').slice(0, 3).join(' ')}...
                </div>
                <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-800/50">
                    <span class="text-slate-500 font-medium">核心数</span>
                    <span class="text-yellow-500 font-bold">${info.cpuCores} Cores</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium">运行</span>
                    <span class="text-slate-300">${info.uptime}</span>
                </div>
            </div>
        `;
    }

    // 3. 内存信息
    if (memCard) {
        memCard.className = "bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 min-h-[140px] flex flex-col justify-between hover:border-emerald-500/30 transition-colors group";
        const totalNum = parseFloat(info.totalMemory);
        const freeNum = parseFloat(info.freeMemory);
        const usedPercent = Math.round(((totalNum - freeNum) / totalNum) * 100);

        memCard.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <span class="text-2xl group-hover:scale-110 transition-transform duration-300">🧠</span>
                <span class="text-base font-bold text-white">内存</span>
            </div>
            
            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium">总计</span>
                    <span class="text-slate-300 font-bold">${info.totalMemory}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium">可用</span>
                    <span class="text-emerald-400 font-bold">${info.freeMemory}</span>
                </div>
                
                <div class="mt-2 text-[10px] text-slate-600 flex justify-between items-center">
                    <span>使用率</span>
                    <span class="${usedPercent > 80 ? 'text-red-400' : 'text-slate-400'}">${usedPercent}%</span>
                </div>
            </div>
            
             <div class="absolute bottom-0 left-0 w-full h-1 bg-slate-800 rounded-b-xl overflow-hidden">
                <div class="h-full ${usedPercent > 80 ? 'bg-red-500' : 'bg-emerald-500'} transition-all duration-1000" style="width: ${usedPercent}%"></div>
            </div>
        `;
    }
}

// 工具函数
function formatSize(bytes) { if (bytes === 0) return '0 B'; const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; }
function updateProgress(c, pct, detail) { const pe = c.querySelector('.progress-percent'); const fe = c.querySelector('.progress-fill'); const de = c.querySelector('.progress-detail'); if (pe) pe.textContent = pct + '%'; if (fe) fe.style.width = pct + '%'; if (de) de.textContent = detail; }
function showToast(type, msg) { const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }; const colors = { success: 'border-l-emerald-500', error: 'border-l-red-500', warning: 'border-l-amber-500', info: 'border-l-blue-500' }; const t = document.createElement('div'); t.className = `flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-800 border-l-4 ${colors[type]} rounded-lg shadow-xl animate-slide-in min-w-[280px]`; t.innerHTML = `<span class="text-lg">${icons[type]}</span><span class="text-sm text-white flex-1">${msg}</span>`; elements.toastContainer.appendChild(t); setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, 4000); }
function showConfirmDialog(msg) { return new Promise(r => { const m = elements.confirmModal; document.getElementById('modal-message').textContent = msg; m.classList.remove('hidden'); const confirm = () => { cleanup(); r(true); }; const cancel = () => { cleanup(); r(false); }; const cleanup = () => { m.classList.add('hidden'); document.getElementById('modal-confirm').removeEventListener('click', confirm); document.getElementById('modal-cancel').removeEventListener('click', cancel); }; document.getElementById('modal-confirm').addEventListener('click', confirm); document.getElementById('modal-cancel').addEventListener('click', cancel); }); }

// ==================== AI 智能分析功能 ====================

// 初始化 AI 功能
document.getElementById('btn-refresh-suggestions')?.addEventListener('click', refreshAISuggestions);

async function refreshAISuggestions() {
    const btn = document.getElementById('btn-refresh-suggestions');
    const list = document.getElementById('ai-suggestions-list');

    btn.disabled = true;
    btn.innerHTML = '⏳ 分析中...';
    list.innerHTML = '<div class="text-center py-4"><div class="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div><div class="text-xs text-slate-500 mt-2">AI 正在分析您的系统...</div></div>';

    try {
        // 先进行垃圾扫描获取数据
        const scanResult = await window.electronAPI.scanJunkFiles();
        const diskPrediction = await window.electronAPI.getDiskPrediction();

        // 获取 AI 建议
        const result = await window.electronAPI.getAISuggestions(scanResult.success ? scanResult.data : null);

        if (result.success) {
            renderAISuggestions(result.data);
        } else {
            list.innerHTML = '<div class="text-center text-red-400 text-sm py-4">分析失败，请稍后重试</div>';
        }

        // 渲染磁盘预测
        if (diskPrediction.success && diskPrediction.data) {
            renderDiskPrediction(diskPrediction.data);
        }
    } catch (e) {
        list.innerHTML = '<div class="text-center text-red-400 text-sm py-4">分析出错</div>';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔄 刷新建议';
    }
}

function renderAISuggestions(data) {
    const list = document.getElementById('ai-suggestions-list');

    if (!data.suggestions || data.suggestions.length === 0) {
        list.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">🎉 您的系统状态良好，暂无清理建议</div>';
        return;
    }

    const priorityColors = {
        critical: 'border-red-500/50 bg-red-500/10',
        high: 'border-orange-500/50 bg-orange-500/10',
        medium: 'border-yellow-500/50 bg-yellow-500/10',
        low: 'border-blue-500/50 bg-blue-500/10'
    };

    const priorityLabels = {
        critical: '<span class="text-[10px] font-bold px-1.5 py-0.5 bg-red-500 text-white rounded">紧急</span>',
        high: '<span class="text-[10px] font-bold px-1.5 py-0.5 bg-orange-500 text-white rounded">重要</span>',
        medium: '<span class="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-500 text-slate-900 rounded">一般</span>',
        low: '<span class="text-[10px] font-bold px-1.5 py-0.5 bg-blue-500 text-white rounded">提示</span>'
    };

    list.innerHTML = data.suggestions.map(s => `
        <div class="flex items-start gap-3 p-3 border ${priorityColors[s.priority]} rounded-lg cursor-pointer hover:brightness-110 transition-all" onclick="handleSuggestionClick('${s.action}', '${s.category || ''}', '${s.drive || ''}')">
            <span class="text-xl">${s.icon}</span>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-semibold text-white">${s.title}</span>
                    ${priorityLabels[s.priority]}
                </div>
                <div class="text-xs text-slate-400">${s.description}</div>
                ${s.savings > 0 ? `<div class="text-xs text-emerald-400 mt-1">💾 可释放 ${data.totalSavingsFormatted}</div>` : ''}
            </div>
            <span class="text-slate-500 text-xs">→</span>
        </div>
    `).join('');

    // 添加总结
    if (data.totalSavings > 0) {
        list.innerHTML += `
            <div class="mt-4 p-3 bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 rounded-lg text-center">
                <div class="text-sm text-white">💡 执行以上建议可释放约 <strong class="text-emerald-400">${data.totalSavingsFormatted}</strong> 空间</div>
            </div>
        `;
    }
}

function renderDiskPrediction(data) {
    const container = document.getElementById('disk-prediction');

    if (!data || data.trend === 'stable') {
        container.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">磁盘使用趋势稳定</div>';
        return;
    }

    const trendIcon = data.trend === 'increasing' ? '📈' : '📉';
    const trendText = data.trend === 'increasing' ? '增长中' : '下降中';

    container.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-800/50 rounded-lg p-3 text-center">
                <div class="text-lg">${trendIcon}</div>
                <div class="text-xs text-slate-400">趋势</div>
                <div class="text-sm font-semibold text-white">${trendText}</div>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-3 text-center">
                <div class="text-lg">📊</div>
                <div class="text-xs text-slate-400">日均增长</div>
                <div class="text-sm font-semibold text-amber-400">${data.dailyGrowthFormatted || '0 B'}</div>
            </div>
        </div>
        ${data.daysUntilFull ? `
            <div class="mt-4 p-3 ${data.daysUntilFull < 30 ? 'bg-red-500/10 border border-red-500/30' : 'bg-slate-800/50'} rounded-lg">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${data.daysUntilFull < 30 ? '⚠️' : '🔮'}</span>
                    <div>
                        <div class="text-sm font-semibold text-white">预计磁盘空间耗尽时间</div>
                        <div class="text-xs ${data.daysUntilFull < 30 ? 'text-red-400' : 'text-slate-400'}">约 ${Math.round(data.daysUntilFull)} 天后</div>
                    </div>
                </div>
            </div>
        ` : ''}
        <div class="mt-3 text-[10px] text-slate-500 text-center">* 预测基于最近30天的使用趋势</div>
    `;
}

// 处理建议点击
window.handleSuggestionClick = function (action, category, drive) {
    switch (action) {
        case 'clean_junk':
            document.querySelector('[data-page="junk-cleaner"]')?.click();
            break;
        case 'scan_junk':
            document.querySelector('[data-page="junk-cleaner"]')?.click();
            setTimeout(() => document.getElementById('btn-scan-junk')?.click(), 300);
            break;
        case 'scan_large':
            document.querySelector('[data-page="large-files"]')?.click();
            if (drive) setTimeout(() => { document.getElementById('target-drive').value = drive + ':'; }, 300);
            break;
        case 'view_prediction':
            // 已在当前页面
            break;
    }
};

// ==================== AI 对话式清理助手 ====================

const aiChatState = {
    chatHistory: [],
    isLoading: false,
    currentMessageId: null,
    currentContent: ''
};

// 绑定聊天事件
function initChatEvents() {
    document.getElementById('btn-send-chat')?.addEventListener('click', sendAIChatMessage);
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAIChatMessage();
    });

    // 绑定抽屉控制事件
    document.getElementById('btn-open-chat-drawer')?.addEventListener('click', openChatDrawer);
    document.getElementById('btn-open-chat-drawer-tab')?.addEventListener('click', openChatDrawer);
    document.getElementById('btn-close-chat-drawer')?.addEventListener('click', closeChatDrawer);
    document.getElementById('chat-drawer-overlay')?.addEventListener('click', closeChatDrawer);

    // 绑定流式响应事件
    window.electronAPI.onAIChatChunk(({ chunk }) => {
        if (aiChatState.currentMessageId) {
            const messageEl = document.querySelector(`#${aiChatState.currentMessageId} .content-text`);
            if (messageEl) {
                aiChatState.currentContent += chunk;
                messageEl.innerHTML = formatAIResponse(aiChatState.currentContent);
                const messagesEl = document.getElementById('chat-history');
                if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
            }
        }
    });
}

// 打开聊天抽屉
function openChatDrawer() {
    const drawer = document.getElementById('chat-drawer');
    const overlay = document.getElementById('chat-drawer-overlay');
    if (drawer && overlay) {
        overlay.classList.remove('hidden');
        drawer.classList.remove('translate-x-full');
        // 延迟添加不透明度，确保过渡效果
        setTimeout(() => overlay.classList.add('opacity-100'), 10);
    }
}

// 关闭聊天抽屉
function closeChatDrawer() {
    const drawer = document.getElementById('chat-drawer');
    const overlay = document.getElementById('chat-drawer-overlay');
    if (drawer && overlay) {
        overlay.classList.remove('opacity-100');
        drawer.classList.add('translate-x-full');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

// 发送 AI 聊天消息
window.sendAIChatMessage = async function () {
    const input = document.getElementById('chat-input');
    const message = input?.value?.trim();

    if (!message) return;
    if (aiChatState.isLoading) return;

    if (!state.aiConfig) {
        showToast('warning', '请先配置 AI 模型并确保已保存');
        return;
    }

    const provider = state.aiProviders.find(p => p.key === state.aiConfig.provider);
    const hasApiKey = state.aiConfig.apiKey || provider?.isLocal;
    const hasModel = state.aiConfig.model || state.aiConfig.customModels;

    if (!hasApiKey || !hasModel) {
        showToast('warning', '请先配置 AI 模型并确保已保存');
        return;
    }

    aiChatState.isLoading = true;
    aiChatState.currentContent = '';
    input.value = '';

    // 添加用户消息
    addChatMessage('user', message);

    // 添加 AI 消息占位
    aiChatState.currentMessageId = addChatMessage('ai', '<div class="flex items-center gap-2"><div class="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div><span class="text-slate-400">思考中...</span></div>');

    try {
        const result = await window.electronAPI.sendAIMessage(message, aiChatState.chatHistory);

        if (result.success) {
            const response = result.data;

            // 确保流式输出完整，如果流没更新完，最后强制更新一次
            const messageEl = document.querySelector(`#${aiChatState.currentMessageId} .content-text`);
            if (messageEl) {
                messageEl.innerHTML = formatAIResponse(response.content);
            }

            // 保存历史
            aiChatState.chatHistory.push({ role: 'user', content: message });
            aiChatState.chatHistory.push({ role: 'assistant', content: response.content });

            // 如果有操作指令，显示操作按钮
            if (response.action) {
                handleAIAction(response.action);
            }
        } else {
            const messageEl = document.querySelector(`#${aiChatState.currentMessageId} .content-text`);
            if (messageEl) {
                messageEl.innerHTML = `<span class="text-red-400">❌ 请求失败: ${result.error}</span>`;
            }
        }
    } catch (e) {
        const messageEl = document.querySelector(`#${aiChatState.currentMessageId} .content-text`);
        if (messageEl) {
            messageEl.innerHTML = `<span class="text-red-400">❌ 出错: ${e.message}</span>`;
        }
    } finally {
        aiChatState.isLoading = false;
        aiChatState.currentMessageId = null;
    }
};

// 添加聊天消息
function addChatMessage(role, content, isLoading = false) {
    const messagesEl = document.getElementById('chat-history');
    if (!messagesEl) return;
    const msgId = 'msg-' + Date.now();

    const div = document.createElement('div');
    div.className = 'flex items-start gap-3';
    div.id = msgId;

    if (role === 'user') {
        div.innerHTML = `
            <div class="flex-1"></div>
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 text-sm text-white max-w-[80%] break-words">${escapeHtml(content)}</div>
            <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm flex-shrink-0">👤</div>
        `;
    } else {
        div.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">🤖</div>
            <div class="flex-1 bg-slate-800/80 rounded-lg rounded-tl-none p-3 text-sm text-slate-200 max-w-[80%] break-words content-text">${content}</div>
        `;
    }

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    return msgId;
}

// 移除聊天消息
function removeChatMessage(msgId) {
    document.getElementById(msgId)?.remove();
}

// 格式化 AI 回复
function formatAIResponse(content) {
    // 先转义 HTML
    content = escapeHtml(content);

    // 移除 JSON 代码块（AI 的操作指令）
    content = content.replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, '');

    // 优化 <think> 标签显示 (兼容流式未闭合的情况)
    if (content.includes('&lt;think&gt;')) {
        if (content.includes('&lt;/think&gt;')) {
            content = content.replace(/&lt;think&gt;([\s\S]*?)&lt;\/think&gt;/g, (match, thinkContent) => {
                return renderThinkBlock(thinkContent);
            });
        } else {
            // 处理未闭合的 <think>，用于流式显示
            content = content.replace(/&lt;think&gt;([\s\S]*)/g, (match, thinkContent) => {
                return renderThinkBlock(thinkContent, true);
            });
        }
    }

    function renderThinkBlock(thinkContent, isStreaming = false) {
        return `
            <div class="bg-slate-900/50 border-l-2 border-purple-500/50 my-2 rounded overflow-hidden">
                <details class="group" open>
                    <summary class="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 cursor-pointer hover:bg-slate-700/30 transition-colors list-none">
                        <span class="transition-transform group-open:rotate-90">▶</span>
                        <span>思考过程 ${isStreaming ? '<span class="animate-pulse">...</span>' : ''}</span>
                    </summary>
                    <div class="px-3 pb-3 text-xs text-slate-500 italic border-t border-slate-800/50 pt-2 leading-relaxed">
                        ${thinkContent.trim().replace(/\n/g, '<br>')}
                    </div>
                </details>
            </div>
        `;
    }

    // 转换 Markdown 格式
    // 粗体
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    // 斜体
    content = content.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    // 代码
    content = content.replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

    // 列表项（数字列表）
    content = content.replace(/^\d+\.\s+(.+)$/gm, '<div class="ml-4">• $1</div>');

    // 换行
    content = content.replace(/\n/g, '<br>');

    // 清理多余的空白
    content = content.replace(/<br>\s*<br>\s*<br>/g, '<br><br>');

    return content;
}

// 转义 HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 处理 AI 操作指令
async function handleAIAction(action) {
    if (!action || !action.action) return;

    // 添加执行提示
    const executingMsg = addChatMessage('ai', `
        <div class="flex items-center gap-2 text-blue-400">
            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>正在执行：${getActionName(action.action)}...</span>
        </div>
    `);

    try {
        let result;
        switch (action.action) {
            case 'scan_junk':
                result = await window.electronAPI.scanJunkFiles();
                if (result.success) {
                    displayScanResults('垃圾文件扫描', result.data);
                }
                break;

            case 'scan_large':
                const defaultScanPath = state.platform === 'darwin' ? '/' : 'C:';
                const targetPath = action.path || defaultScanPath;
                result = await window.electronAPI.scanLargeFiles({
                    targetPath: targetPath,
                    minSize: 100 * 1024 * 1024, // 100MB
                    fileTypes: []
                });
                if (result.success) {
                    displayLargeFilesResults(result.data, targetPath);
                }
                break;

            case 'clean_junk':
                // 需要用户确认
                addChatMessage('ai', `
                    <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <div class="font-semibold text-amber-400 mb-2">⚠️ 清理确认</div>
                        <div class="text-sm mb-3">清理操作将删除文件，请先扫描查看详情。</div>
                        <button onclick="executeScanJunk()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                            先扫描查看
                        </button>
                    </div>
                `);
                break;

            case 'organize_files':
                // 整理文件 - 直接在对话中完成
                try {
                    // 1. 选择文件夹
                    const folderResult = await window.electronAPI.selectFolder();
                    if (!folderResult || !folderResult.success) {
                        addChatMessage('ai', `
                            <div class="text-amber-400">
                                ⚠️ 用户取消了选择。
                            </div>
                        `);
                        break;
                    }

                    const selectedPath = folderResult.path;
                    const defaultPath = state.platform === 'darwin' ? '/Users' : 'C:\\Users';

                    // 2. 扫描文件夹获取所有文件
                    addChatMessage('ai', `
                        <div class="flex items-center gap-2 text-blue-400">
                            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>正在扫描 ${selectedPath}...</span>
                        </div>
                    `);

                    const scanResult = await window.electronAPI.scanLargeFiles({
                        targetPath: selectedPath,
                        minSize: 0, // 获取所有文件，不限制大小
                        fileTypes: []
                    });

                    if (!scanResult || !scanResult.success || !scanResult.data || !scanResult.data.files || scanResult.data.files.length === 0) {
                        addChatMessage('ai', `
                            <div class="text-amber-400">
                                ⚠️ 该目录下没有找到文件。
                            </div>
                        `);
                        break;
                    }

                    const files = scanResult.data.files;

                    // 3. 调用 AI 分类（传入目录路径以提供上下文）
                    addChatMessage('ai', `
                        <div class="flex items-center gap-2 text-blue-400">
                            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>AI 正在分析 ${files.length} 个文件...</span>
                        </div>
                    `);

                    const categorizeResult = await window.electronAPI.aiCategorizeFiles({
                        files: files,
                        directoryPath: selectedPath
                    });

                    if (categorizeResult.success) {
                        displayOrganizeResults(categorizeResult.data, selectedPath);
                    } else {
                        addChatMessage('ai', `
                            <div class="text-red-400">
                                ❌ 分类失败：${categorizeResult.error || '未知错误'}
                            </div>
                        `);
                    }
                } catch (error) {
                    addChatMessage('ai', `
                        <div class="text-red-400">
                            ❌ 整理失败：${error.message}
                        </div>
                    `);
                }
                break;

            default:
                addChatMessage('ai', `<div class="text-amber-400">⚠️ 未知操作：${action.action}</div>`);
        }
    } catch (error) {
        addChatMessage('ai', `<div class="text-red-400">❌ 执行失败：${error.message}</div>`);
    } finally {
        // 移除执行提示
        removeChatMessage(executingMsg);
    }
}

// 获取操作名称
function getActionName(action) {
    const names = {
        scan_junk: '扫描垃圾文件',
        scan_large: '扫描大文件',
        clean_junk: '清理垃圾',
        scan_duplicates: '扫描重复文件',
        organize_files: '智能整理文件'
    };
    return names[action] || action;
}

// 显示扫描结果
function displayScanResults(title, data) {
    const totalSize = Object.values(data.categories || {}).reduce((sum, cat) => sum + cat.totalSize, 0);
    const totalFiles = Object.values(data.categories || {}).reduce((sum, cat) => sum + cat.files.length, 0);

    let html = `
        <div class="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-700 pb-2">
                <div class="font-semibold text-white">${title} 结果</div>
                <div class="text-xs text-slate-400">${new Date().toLocaleTimeString()}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-800/50 rounded p-2">
                    <div class="text-xs text-slate-400">文件数量</div>
                    <div class="text-lg font-semibold text-blue-400">${totalFiles}</div>
                </div>
                <div class="bg-slate-800/50 rounded p-2">
                    <div class="text-xs text-slate-400">占用空间</div>
                    <div class="text-lg font-semibold text-emerald-400">${formatSize(totalSize)}</div>
                </div>
            </div>

            <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
    `;

    for (const [category, info] of Object.entries(data.categories || {})) {
        html += `
            <div class="bg-slate-800/30 rounded p-2">
                <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-300">${category}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-400">${info.files.length} 个文件</span>
                        <span class="text-xs font-semibold text-emerald-400">${formatSize(info.totalSize)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    html += `
            </div>
            <button onclick="expandResults('${title}')" class="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors">
                📊 查看详细信息
            </button>
        </div>
    `;

    addChatMessage('ai', html);
}

// 显示大文件扫描结果
function displayLargeFilesResults(data, path) {
    const files = data.files || [];
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    let html = `
        <div class="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-700 pb-2">
                <div class="font-semibold text-white">大文件扫描结果</div>
                <div class="text-xs text-slate-400">${path}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-800/50 rounded p-2">
                    <div class="text-xs text-slate-400">大文件数量</div>
                    <div class="text-lg font-semibold text-blue-400">${files.length}</div>
                </div>
                <div class="bg-slate-800/50 rounded p-2">
                    <div class="text-xs text-slate-400">总大小</div>
                    <div class="text-lg font-semibold text-emerald-400">${formatSize(totalSize)}</div>
                </div>
            </div>

            <div class="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
    `;

    files.slice(0, 10).forEach(file => {
        const fileName = file.path.split('\\').pop();
        html += `
            <div class="bg-slate-800/30 rounded p-2 text-xs">
                <div class="flex items-center justify-between">
                    <span class="text-slate-300 truncate flex-1">${fileName}</span>
                    <span class="text-emerald-400 font-semibold ml-2">${formatSize(file.size)}</span>
                </div>
            </div>
        `;
    });

    if (files.length > 10) {
        html += `<div class="text-center text-xs text-slate-500 py-2">还有 ${files.length - 10} 个文件...</div>`;
    }

    html += `
            </div>
            <button onclick="expandResults('大文件')" class="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors">
                📊 在主界面查看全部
            </button>
        </div>
    `;

    addChatMessage('ai', html);
}

// 显示文件整理结果
function displayOrganizeResults(categories, path) {
    const totalFiles = Object.values(categories).reduce((sum, files) => sum + files.length, 0);
    const categoryCount = Object.keys(categories).length;

    let html = `
        <div class="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-700 pb-2">
                <div class="font-semibold text-white">📂 智能分类结果</div>
                <div class="text-xs text-slate-400">${path}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-800/50 rounded p-2">
                    <div class="text-xs text-slate-400">文件总数</div>
                    <div class="text-lg font-semibold text-blue-400">${totalFiles}</div>
                </div>
                <div class="bg-slate-800/50 rounded p-2">
                    <div class="text-xs text-slate-400">分类数量</div>
                    <div class="text-lg font-semibold text-emerald-400">${categoryCount} 个</div>
                </div>
            </div>

            <div class="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
    `;

    for (const [category, files] of Object.entries(categories)) {
        html += `
            <div class="bg-slate-800/30 rounded p-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-blue-400">📁 ${category}</span>
                    <span class="text-xs text-slate-400">${files.length} 个文件</span>
                </div>
                <div class="space-y-1">
        `;

        files.slice(0, 5).forEach(file => {
            const fileName = file.name || (file.path ? file.path.split('\\').pop() : '未知文件');
            html += `
                <div class="text-xs text-slate-300 truncate pl-2">• ${fileName}</div>
            `;
        });

        if (files.length > 5) {
            html += `<div class="text-xs text-slate-500 pl-2">还有 ${files.length - 5} 个文件...</div>`;
        }

        html += `
                </div>
            </div>
        `;
    }

    html += `
            </div>
            <div class="flex gap-2">
                <button onclick="applyOrganization('${path}')" class="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors font-semibold">
                    ✅ 应用分类
                </button>
                <button onclick="closeChatDrawer()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors">
                    取消
                </button>
            </div>
        </div>
    `;

    addChatMessage('ai', html);
}

// 展开查看完整结果
window.expandResults = function (type) {
    if (type.includes('垃圾')) {
        document.querySelector('[data-page="junk-cleaner"]')?.click();
    } else if (type.includes('大文件')) {
        document.querySelector('[data-page="large-files"]')?.click();
    }
    closeChatDrawer();
};

// 执行垃圾扫描
window.executeScanJunk = async function () {
    handleAIAction({ action: 'scan_junk' });
};

// 应用文件整理
window.applyOrganization = function (path) {
    addChatMessage('ai', `
        <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div class="font-semibold text-blue-400 mb-2">✅ 正在应用分类...</div>
            <div class="text-sm text-slate-300">文件将被移动到对应的分类文件夹中</div>
        </div>
    `);

    // 跳转到 AI 助手页面执行分类
    setTimeout(() => {
        document.querySelector('[data-page="ai-assistant"]')?.click();
        setTimeout(() => {
            document.querySelector('[data-tab="categorize"]')?.click();
            // 触发应用分类按钮
            setTimeout(() => {
                document.getElementById('btn-apply-categorize')?.click();
            }, 300);
        }, 300);
        closeChatDrawer();
    }, 500);
};

// 快捷指令
window.quickCommand = function (command) {
    document.getElementById('chat-input').value = command;
    sendAIChatMessage();
};

// 打开聊天抽屉
function openChatDrawer() {
    const drawer = document.getElementById('chat-drawer');
    const overlay = document.getElementById('chat-drawer-overlay');

    // 显示遮罩层
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);

    // 滑入抽屉
    setTimeout(() => drawer.classList.remove('translate-x-full'), 10);

    // 聚焦输入框
    setTimeout(() => {
        document.getElementById('chat-input')?.focus();
    }, 350);
}

// 关闭聊天抽屉
function closeChatDrawer() {
    const drawer = document.getElementById('chat-drawer');
    const overlay = document.getElementById('chat-drawer-overlay');

    // 滑出抽屉
    drawer.classList.add('translate-x-full');

    // 隐藏遮罩层
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initAIChat, 500);
});


// ==================== AI 智能助手 ====================

// 加载 AI 配置
async function loadAIConfig() {
    // 先获取供应商列表
    const providersResult = await window.electronAPI.getAIProviders();
    if (providersResult.success) {
        state.aiProviders = providersResult.data;
    }

    const r = await window.electronAPI.getAIConfig();
    if (r.success && r.data) {
        state.aiConfig = r.data;
        updateAIStatus();
    }

    // 获取平台信息
    const sysInfo = await window.electronAPI.getSystemInfo();
    if (sysInfo.success) {
        state.platform = sysInfo.data.platform;
    }
}

// 更新 AI 状态显示
function updateAIStatus() {
    const statusText = document.getElementById('ai-status-text');
    const provider = state.aiProviders.find(p => p.key === state.aiConfig?.provider);
    const isConfigured = state.aiConfig && state.aiConfig.provider && (state.aiConfig.apiKey || provider?.isLocal) && state.aiConfig.model;

    if (isConfigured) {
        const providerName = provider?.name || state.aiConfig.provider;
        const model = state.aiConfig.model || '未选择';
        statusText.textContent = `已配置: ${providerName} - ${model} `;
        statusText.classList.remove('text-slate-400');
        statusText.classList.add('text-green-400');
    } else {
        statusText.textContent = '未配置 AI 服务';
        statusText.classList.remove('text-green-400');
        statusText.classList.add('text-slate-400');
    }
}

// 打开 AI 配置对话框
async function openAIConfigModal() {
    const modal = document.getElementById('ai-config-modal');
    modal.classList.remove('hidden');

    // 加载供应商列表
    const r = await window.electronAPI.getAIProviders();
    if (r.success) {
        const select = document.getElementById('ai-provider-select');
        select.innerHTML = '<option value="">请选择...</option>' +
            r.data.map(p => `<option value="${p.key}">${p.name}</option>`).join('');

        // 添加供应商变更事件
        select.onchange = function () {
            const provider = r.data.find(p => p.key === this.value);
            if (provider) {
                // 自动填充 API 地址
                document.getElementById('ai-base-url').value = provider.baseUrl || '';

                // 根据是否为本地服务显示/隐藏 API 密钥提示
                const apiKeyContainer = document.getElementById('api-key-container');
                const apiKeyHint = document.getElementById('api-key-hint');
                const apiKeyInput = document.getElementById('ai-api-key');

                if (provider.isLocal) {
                    apiKeyHint.textContent = '(本地服务无需密钥)';
                    apiKeyHint.classList.remove('text-red-400');
                    apiKeyHint.classList.add('text-green-400');
                    apiKeyInput.placeholder = '本地服务无需填写';
                } else {
                    apiKeyHint.textContent = '(必填)';
                    apiKeyHint.classList.remove('text-green-400');
                    apiKeyHint.classList.add('text-slate-500');
                    apiKeyInput.placeholder = '输入 API 密钥';
                }
            }
        };

        // 如果已有配置，填充表单
        if (state.aiConfig) {
            select.value = state.aiConfig.provider || '';
            select.onchange(); // 触发变更事件
            document.getElementById('ai-api-key').value = state.aiConfig.apiKey || '';
            document.getElementById('ai-base-url').value = state.aiConfig.baseUrl || '';
            document.getElementById('ai-model-select').value = state.aiConfig.model || '';
        }
    }
}

// 关闭 AI 配置对话框
function closeAIConfigModal() {
    document.getElementById('ai-config-modal').classList.add('hidden');
}

// 获取模型列表
async function fetchAIModels() {
    const provider = document.getElementById('ai-provider-select').value;
    const apiKey = document.getElementById('ai-api-key').value;
    const baseUrl = document.getElementById('ai-base-url').value;

    if (!provider) {
        showToast('warning', '请先选择 AI 供应商');
        return;
    }

    const providerObj = state.aiProviders.find(p => p.key === provider);
    if (!apiKey && !providerObj?.isLocal) {
        showToast('warning', '请先输入 API 密钥');
        return;
    }

    const btn = document.getElementById('btn-fetch-models');
    btn.disabled = true;
    btn.textContent = '🔄 获取中...';

    try {
        const r = await window.electronAPI.fetchAIModels(provider, apiKey, baseUrl);
        if (r.success && r.data.length > 0) {
            const select = document.getElementById('ai-model-select');
            select.innerHTML = r.data.map(m => `<option value="${m}">${m}</option>`).join('');
            showToast('success', `获取到 ${r.data.length} 个模型`);
        } else {
            showToast('error', '未获取到模型列表');
        }
    } catch (e) {
        showToast('error', '获取模型失败');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 获取可用模型';
    }
}

// 测试 AI 连接
async function testAIConnection() {
    const provider = document.getElementById('ai-provider-select').value;
    const apiKey = document.getElementById('ai-api-key').value;
    const baseUrl = document.getElementById('ai-base-url').value;
    const model = document.getElementById('ai-model-select').value;

    if (!provider || !model) {
        showToast('warning', '请完整填写配置信息');
        return;
    }

    // 临时保存配置
    await window.electronAPI.saveAIConfig({ provider, apiKey, baseUrl, model });

    const btn = document.getElementById('btn-test-connection');
    const result = document.getElementById('test-result');
    btn.disabled = true;
    btn.textContent = '🔌 测试中...';
    result.classList.add('hidden');

    try {
        const r = await window.electronAPI.testAIConnection();
        result.classList.remove('hidden');
        if (r.success) {
            result.textContent = '✅ 连接成功: ' + r.message;
            result.classList.remove('text-red-400');
            result.classList.add('text-green-400');
        } else {
            result.textContent = '❌ 连接失败: ' + r.message;
            result.classList.remove('text-green-400');
            result.classList.add('text-red-400');
        }
    } catch (e) {
        result.classList.remove('hidden');
        result.textContent = '❌ 测试出错';
        result.classList.add('text-red-400');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔌 测试连接';
    }
}

// 保存 AI 配置
async function saveAIConfig() {
    const config = {
        provider: document.getElementById('ai-provider-select').value,
        apiKey: document.getElementById('ai-api-key').value,
        baseUrl: document.getElementById('ai-base-url').value,
        model: document.getElementById('ai-model-select').value
    };

    const provider = state.aiProviders.find(p => p.key === config.provider);
    if (!config.provider) {
        showToast('warning', '请选择供应商');
        return;
    }

    if (!config.apiKey && !provider?.isLocal) {
        showToast('warning', '请输入 API 密钥');
        return;
    }

    if (!config.model) {
        showToast('warning', '请选择模型');
        return;
    }

    const r = await window.electronAPI.saveAIConfig(config);
    if (r.success) {
        state.aiConfig = config;
        updateAIStatus();
        closeAIConfigModal();
        showToast('success', 'AI 配置已保存');
    } else {
        showToast('error', '保存失败');
    }
}

// AI 标签页切换
function switchAITab(tabName) {
    state.currentAITab = tabName;

    // 更新标签按钮
    document.querySelectorAll('.ai-tab').forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        // 移除所有可能的状态类
        btn.classList.remove('text-purple-600', 'dark:text-purple-400', 'border-purple-500', 'bg-purple-500/10', 'text-slate-100', 'text-slate-400', 'border-transparent', 'hover:bg-slate-800');

        if (isActive) {
            btn.classList.add('text-purple-600', 'dark:text-purple-400', 'border-purple-500', 'bg-purple-500/10');
        } else {
            btn.classList.add('text-slate-400', 'border-transparent', 'hover:bg-slate-800');
        }
    });

    // 更新内容
    document.querySelectorAll('.ai-tab-content').forEach(content => {
        content.classList.toggle('hidden', content.id !== `tab - ${tabName} `);
    });
}

// 选择文件夹进行分类
async function selectFolderForCategorize() {
    const r = await window.electronAPI.selectFolder();
    if (r.success) {
        showToast('info', '正在扫描文件夹...');
        // 扫描文件夹中的文件
        try {
            const result = await window.electronAPI.listFiles(r.path);
            if (result.success) {
                const files = result.data;
                state.aiSelectedFiles = files;
                document.getElementById('categorize-file-count').textContent = `已选择 ${files.length} 个文件`;
                document.getElementById('btn-start-categorize').disabled = files.length === 0;

                if (files.length > 0) {
                    showToast('success', `已选择 ${files.length} 个文件`);
                } else {
                    showToast('warning', '文件夹中没有文件');
                }
            } else {
                showToast('error', '扫描文件夹失败: ' + result.error);
            }
        } catch (e) {
            showToast('error', '扫描文件夹出错');
            console.error(e);
        }
    }
}


// 选择多个文件进行分类
async function selectFilesForCategorize() {
    try {
        const result = await window.electronAPI.selectFiles();
        if (result.success && result.paths && result.paths.length > 0) {
            state.aiSelectedFiles = result.paths.map(p => ({ path: p, name: p.split(/[\\/]/).pop() }));
            document.getElementById('categorize-file-count').textContent = `已选择 ${result.paths.length} 个文件`;
            document.getElementById('btn-start-categorize').disabled = false;
            showToast('success', `已选择 ${result.paths.length} 个文件`);
        }
    } catch (e) {
        showToast('error', '文件选择失败');
    }
}

// 选择多个文件进行重命名
async function selectFilesForRename() {
    try {
        const result = await window.electronAPI.selectFiles();
        if (result.success && result.paths && result.paths.length > 0) {
            state.aiSelectedFiles = result.paths.map(p => ({ path: p, name: p.split(/[\\/]/).pop() }));
            document.getElementById('rename-file-count').textContent = `已选择 ${result.paths.length} 个文件`;
            document.getElementById('btn-start-rename').disabled = false;
            showToast('success', `已选择 ${result.paths.length} 个文件`);
        }
    } catch (e) {
        showToast('error', '文件选择失败');
    }
}

// 选择单个文件进行分析
async function selectFileForAnalyze() {
    try {
        const result = await window.electronAPI.selectFile();
        if (result.success && result.path) {
            const fileName = result.path.split(/[\\/]/).pop();
            state.aiSelectedFiles = [{ path: result.path, name: fileName }];
            showToast('success', `已选择: ${fileName}`);
            // 自动开始分析
            analyzeSelectedFile(result.path);
        }
    } catch (e) {
        showToast('error', '文件选择失败');
    }
}

// 分析选中的文件
async function analyzeSelectedFile(filePath) {
    const resultsDiv = document.getElementById('analyze-results');
    const contentDiv = document.getElementById('analyze-content');

    if (!state.aiConfig || !state.aiConfig.apiKey) {
        showToast('warning', '请先配置 AI 服务');
        openAIConfigModal();
        return;
    }

    resultsDiv.classList.remove('hidden');
    contentDiv.innerHTML = '<div class="text-center text-slate-400"><div class="animate-spin inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mb-2"></div><div>AI 正在分析文件...</div></div>';

    try {
        const result = await window.electronAPI.aiAnalyzeFile(filePath);
        if (result.success) {
            contentDiv.innerHTML = `
                <div class="text-xs text-slate-300 whitespace-pre-wrap">${result.data.analysis || result.data}</div>
            `;
        } else {
            contentDiv.innerHTML = `<div class="text-red-400">分析失败: ${result.error}</div>`;
        }
    } catch (e) {
        contentDiv.innerHTML = `<div class="text-red-400">分析出错: ${e.message}</div>`;
    }
}

// 开始智能分类
async function startAICategorize() {
    if (!state.aiConfig || !state.aiConfig.apiKey) {
        showToast('warning', '请先配置 AI 服务');
        openAIConfigModal();
        return;
    }

    if (state.aiSelectedFiles.length === 0) {
        showToast('warning', '请先选择文件');
        return;
    }

    const progress = document.getElementById('ai-progress');
    progress.classList.remove('hidden');
    document.getElementById('ai-progress-text').textContent = 'AI 正在分析文件...';

    try {
        const r = await window.electronAPI.aiCategorizeFiles(state.aiSelectedFiles);
        if (r.success) {
            state.aiCategorizeResult = r.data;
            renderCategorizeResults(r.data);
            showToast('success', '分类完成！');
        } else {
            showToast('error', '分类失败: ' + r.error);
        }
    } catch (e) {
        showToast('error', '分类出错');
    } finally {
        const progress = document.getElementById('ai-progress');
        if (progress) progress.classList.add('hidden');
    }
}

// AI 调整分类指令处理
async function handleAdjustCategorization() {
    const input = document.getElementById('ai-adjust-input');
    if (!input || !input.value.trim()) {
        showToast('warning', '请输入调整指令');
        return;
    }

    const btn = document.getElementById('btn-adjust-categorize');
    const originalText = btn.innerHTML;
    btn.innerHTML = '🤖 思考中...';
    btn.disabled = true;

    try {
        const result = await window.electronAPI.aiAdjustCategorization(
            state.aiSelectedFiles,
            state.aiCategorizeResult,
            input.value.trim()
        );

        if (result.success) {
            state.aiCategorizeResult = result.data;
            renderCategorizeResults(result.data);
            showToast('success', '分类已更新');
            input.value = '';
        } else {
            showToast('error', '调整失败: ' + result.error);
        }
    } catch (e) {
        console.error(e);
        showToast('error', '调整出错');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 渲染分类结果（树形结构 + 对比）
function renderCategorizeResults(categories) {
    const container = document.getElementById('categorize-list');
    const originalList = document.getElementById('original-file-list');
    const resultsDiv = document.getElementById('categorize-results');

    // 渲染左侧：原始文件
    if (originalList && state.aiSelectedFiles) {
        originalList.innerHTML = state.aiSelectedFiles.map(f => `
            <div class="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/30 text-slate-400 text-xs truncate transition-colors border-b border-transparent hover:border-slate-800">
                <span class="opacity-50 text-slate-500">📄</span> 
                <span title="${f.path}">${f.name}</span>
            </div>
        `).join('');
    }

    // 渲染右侧：AI 结果树
    container.innerHTML = '';

    // 创建树形容器
    const treeRoot = document.createElement('div');
    treeRoot.className = 'select-none';

    Object.entries(categories).forEach(([category, files]) => {
        // 分类文件夹
        const folderDiv = document.createElement('div');
        folderDiv.className = 'group mb-2';

        // 文件夹头部
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'flex items-center gap-2 p-2 rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 transition-colors border border-slate-800/50 hover:border-purple-500/30 group-hover:shadow-md';
        summaryDiv.innerHTML = `
            <span class="text-amber-400 text-lg transition-transform duration-200 group-hover:scale-110">📂</span>
            <span class="font-semibold text-white flex-1 text-sm tracking-wide">${category}</span>
            <span class="text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700 min-w-[20px] text-center">${files.length}</span>
            <span class="transform transition-transform duration-200 text-slate-500 text-xs">▼</span>
        `;

        // 文件列表
        const fileListDiv = document.createElement('div');
        fileListDiv.className = 'pl-4 border-l-2 border-slate-800/30 ml-3.5 mt-1 space-y-0.5 transition-all duration-300 overflow-hidden';

        files.forEach(file => {
            const fileName = file.name || (typeof file === 'string' ? file : 'Unknown File');
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/30 text-slate-300 text-xs truncate transition-colors';
            fileItem.innerHTML = `<span class="text-purple-400/70 text-sm">↳</span> <span class="opacity-70">📄</span> <span>${fileName}</span>`;
            fileListDiv.appendChild(fileItem);
        });

        // 展开/折叠逻辑
        let isExpanded = true;
        summaryDiv.onclick = () => {
            isExpanded = !isExpanded;
            fileListDiv.style.display = isExpanded ? 'block' : 'none';
            summaryDiv.lastElementChild.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
        };

        folderDiv.appendChild(summaryDiv);
        folderDiv.appendChild(fileListDiv);
        treeRoot.appendChild(folderDiv);
    });

    container.appendChild(treeRoot);
    resultsDiv.classList.remove('hidden');

    // 平滑滚动到结果区域
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // 绑定调整按钮和输入框
    const adjustBtn = document.getElementById('btn-adjust-categorize');
    if (adjustBtn) adjustBtn.onclick = handleAdjustCategorization;

    const adjustInput = document.getElementById('ai-adjust-input');
    if (adjustInput) {
        adjustInput.onkeydown = (e) => {
            if (e.key === 'Enter') handleAdjustCategorization();
        };
    }
}

// 应用分类
async function applyCategorize() {
    if (!state.aiCategorizeResult) return;
    if (!state.aiSelectedFiles || state.aiSelectedFiles.length === 0) return;

    const r = await showConfirmDialog('确定要应用此分类方案吗？\n文件将被移动到对应的分类文件夹。');
    if (!r) return;

    const progress = document.getElementById('ai-progress');
    const progressText = document.getElementById('ai-progress-text');

    if (progress) {
        progress.classList.remove('hidden');
        if (progressText) progressText.textContent = '正在整理文件...';
    }

    try {
        // 获取基础路径（假定所有文件在同一目录下，取第一个文件的目录）
        const firstFilePath = state.aiSelectedFiles[0].path;
        // 简单处理路径分隔符，兼容 Windows
        const sep = firstFilePath.includes('\\') ? '\\' : '/';
        const basePath = firstFilePath.substring(0, firstFilePath.lastIndexOf(sep));

        const result = await window.electronAPI.aiMoveToCategories(basePath, state.aiCategorizeResult);

        if (result.success) {
            showToast('success', '✅ 文件整理完成！');
            // 隐藏结果区域，清空选择
            document.getElementById('categorize-results').classList.add('hidden');
            document.getElementById('categorize-file-count').textContent = '未选择文件';
            document.getElementById('btn-start-categorize').disabled = true;
            state.aiSelectedFiles = [];
            state.aiCategorizeResult = null;
        } else {
            showToast('error', '整理失败: ' + result.error);
        }
    } catch (e) {
        showToast('error', '执行出错');
        console.error(e);
    } finally {
        if (progress) progress.classList.add('hidden');
    }
}

// 开始智能重命名
async function startAIRename() {
    if (!state.aiConfig || !state.aiConfig.apiKey) {
        showToast('warning', '请先配置 AI 服务');
        openAIConfigModal();
        return;
    }

    if (state.aiSelectedFiles.length === 0) {
        showToast('warning', '请先选择文件');
        return;
    }

    const progress = document.getElementById('ai-progress');
    progress.classList.remove('hidden');
    document.getElementById('ai-progress-text').textContent = 'AI 正在生成重命名建议...';

    try {
        const r = await window.electronAPI.aiSuggestBatchRename(state.aiSelectedFiles);
        if (r.success) {
            state.aiRenameResult = r.data;
            renderRenameResults(r.data);
            showToast('success', '重命名建议已生成！');
        } else {
            showToast('error', '生成失败: ' + r.error);
        }
    } catch (e) {
        showToast('error', '生成出错');
    } finally {
        progress.classList.add('hidden');
    }
}

// 渲染重命名结果
function renderRenameResults(suggestions) {
    const container = document.getElementById('rename-list');
    const resultsDiv = document.getElementById('rename-results');

    container.innerHTML = suggestions.map((s, i) => `
            <div class="bg-slate-800 border border-slate-800/50 rounded-lg p-3">
            <div class="flex items-center gap-2 text-xs mb-1">
                <span class="text-slate-500">原名称:</span>
                <span class="text-slate-300">${s.original}</span>
            </div>
            <div class="flex items-center gap-2 text-xs mb-1">
                <span class="text-slate-500">新名称:</span>
                <span class="text-emerald-600 dark:text-emerald-400">${s.suggested}</span>
            </div>
            <div class="text-[10px] text-slate-500">${s.reason}</div>
        </div >
            `).join('');

    resultsDiv.classList.remove('hidden');
}

// 应用重命名
async function applyRename() {
    if (!state.aiRenameResult) return;

    const r = await showConfirmDialog(`确定要重命名 ${state.aiRenameResult.length} 个文件吗？`);
    if (!r) return;

    // 这里应该调用重命名的 API
    showToast('success', '重命名已应用（演示模式）');
}

// AI 标签页切换
function switchAITab(tabId) {
    // 更新标签按钮状态
    document.querySelectorAll('.ai-tab').forEach(tab => {
        const isActive = tab.dataset.tab === tabId;
        if (isActive) {
            tab.classList.add('text-white', 'border-b-2', 'border-purple-500');
            tab.classList.remove('text-slate-400');
        } else {
            tab.classList.remove('text-white', 'border-b-2', 'border-purple-500');
            tab.classList.add('text-slate-400');
        }
    });

    // 显示对应的标签内容
    document.querySelectorAll('.ai-tab-content').forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

// 初始化 AI 助手事件监听
function initAIAssistantListeners() {
    // 配置按钮
    document.getElementById('btn-config-ai')?.addEventListener('click', openAIConfigModal);
    document.getElementById('ai-config-close')?.addEventListener('click', closeAIConfigModal);
    document.getElementById('ai-config-cancel')?.addEventListener('click', closeAIConfigModal);
    document.getElementById('ai-config-save')?.addEventListener('click', saveAIConfig);
    document.getElementById('btn-fetch-models')?.addEventListener('click', fetchAIModels);
    document.getElementById('btn-test-connection')?.addEventListener('click', testAIConnection);

    // 标签页切换
    document.querySelectorAll('.ai-tab').forEach(btn => {
        btn.addEventListener('click', () => switchAITab(btn.dataset.tab));
    });

    // 初始化第一个标签页
    switchAITab('categorize');

    // 初始化聊天事件
    initChatEvents();

    // 智能分类 - 文件选择
    document.getElementById('btn-select-folder-categorize')?.addEventListener('click', selectFolderForCategorize);
    document.getElementById('btn-select-files-categorize')?.addEventListener('click', selectFilesForCategorize);
    document.getElementById('btn-start-categorize')?.addEventListener('click', startAICategorize);
    document.getElementById('btn-apply-categorize')?.addEventListener('click', applyCategorize);

    // 智能重命名 - 文件选择
    document.getElementById('btn-select-files-rename')?.addEventListener('click', selectFilesForRename);
    document.getElementById('btn-start-rename')?.addEventListener('click', startAIRename);
    document.getElementById('btn-apply-rename')?.addEventListener('click', applyRename);

    // 文件分析 - 文件选择
    document.getElementById('btn-select-file-analyze')?.addEventListener('click', selectFileForAnalyze);

    // 进度监听
    window.electronAPI.onAIAnalyzeProgress?.((p) => {
        document.getElementById('ai-progress-detail').textContent = `${p.current} / ${p.total}`;
        document.getElementById('ai-progress-bar').style.width = `${p.percentage}%`;
    });

    window.electronAPI.onAIRenameProgress?.((p) => {
        document.getElementById('ai-progress-detail').textContent = `${p.current} / ${p.total}`;
        document.getElementById('ai-progress-bar').style.width = `${p.percentage}%`;
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();
    initNavigationHandlers();
    initWindowControls();
    initAIAssistantListeners();
    loadInitialData();
});

// 监听历史记录撤销按钮
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-undo')) {
        const id = parseInt(e.target.dataset.id);
        if (confirm('确定要撤销此操作吗？文件将会尝试还原回原位置。\n(如果原位置已有同名文件，将无法还原)')) {
            e.target.textContent = '还原中...';
            e.target.disabled = true;

            try {
                const result = await window.electronAPI.undoHistoryRecord(id);
                if (result.success) {
                    showToast('success', `还原成功: ${result.recovered} 个文件` + (result.failed > 0 ? ` (${result.failed} 个失败)` : ''));
                    loadHistory();
                } else {
                    showToast('error', '还原失败: ' + result.error);
                    e.target.textContent = '↩️ 撤销';
                    e.target.disabled = false;
                }
            } catch (err) {
                showToast('error', '执行出错');
                console.error(err);
                e.target.textContent = '↩️ 撤销';
                e.target.disabled = false;
            }
        }
    }
});
loadAIConfig();

// 初始化 SVG 图标
setTimeout(() => {
    if (window.Icons) {
        const iconMap = {
            'icon-trash': 'trash',
            'icon-file-chart': 'fileChart',
            'icon-folder': 'folder',
            'icon-copy': 'copy',
            'icon-brain': 'brain',
            'icon-hard-drive': 'hardDrive',
            'icon-monitor': 'monitor',
            'icon-clock': 'clock',
            'icon-shield': 'shield',
            'icon-settings': 'settings'
        };

        Object.entries(iconMap).forEach(([id, iconName]) => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = window.Icons[iconName];
            }
        });
    }
}, 100);


// 显示打赏二维码
function showQRCode(type) {
    const container = document.getElementById('qrcode-container');
    const alipayBtn = document.getElementById('btn-show-alipay');
    const wechatBtn = document.getElementById('btn-show-wechat');

    // 更新按钮状态
    if (type === 'alipay') {
        alipayBtn.classList.add('bg-blue-500/10', 'border-blue-500', 'text-blue-400');
        alipayBtn.classList.remove('text-slate-400', 'border-slate-600');
        wechatBtn.classList.remove('bg-green-500/10', 'border-green-500', 'text-green-400');
        wechatBtn.classList.add('text-slate-400', 'border-slate-600');
    } else {
        wechatBtn.classList.add('bg-green-500/10', 'border-green-500', 'text-green-400');
        wechatBtn.classList.remove('text-slate-400', 'border-slate-600');
        alipayBtn.classList.remove('bg-blue-500/10', 'border-blue-500', 'text-blue-400');
        alipayBtn.classList.add('text-slate-400', 'border-slate-600');
    }

    // 显示二维码 - 修正路径为相对于 index.html 的路径
    const imagePath = type === 'alipay' ? '../../assets/alipay.png' : '../../assets/weipay.png';
    const title = type === 'alipay' ? '支付宝扫码打赏' : '微信扫码打赏';

    container.innerHTML = `
        <div class="text-center">
            <div class="text-sm font-semibold text-slate-100 mb-3">${title}</div>
            <div class="bg-white p-2 rounded-lg shadow-inner inline-block mx-auto mb-3">
                <img src="${imagePath}" alt="${title}" class="w-64 h-64 rounded border border-slate-200" 
                     onerror="this.parentElement.parentElement.innerHTML='<div class=\\'text-slate-500 text-sm\\'>二维码图片加载失败<br>尝试路径: ${imagePath}</div>'">
            </div>
            <div class="text-xs text-slate-500">使用${type === 'alipay' ? '支付宝' : '微信'}扫描二维码</div>
        </div>
    `;
}

// --- 开发者清理逻辑 ---
async function loadDevCleanerData() {
    try {
        const r = await window.electronAPI.getDevCleanerInfo();
        if (r.success) {
            renderDevCleanerInfo(r.data);
        }
    } catch (e) {
        console.error('Failed to load dev cleaner data:', e);
    }
}

function renderDevCleanerInfo(data) {
    const container = document.getElementById('dev-cleaner-info');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<div class="text-xs text-slate-500">未检测到开发者缓存</div>';
        return;
    }

    container.innerHTML = `
        <div class="mt-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 class="text-sm font-bold text-white mb-3">👨‍💻 开发者清理选项</h4>
            <div class="space-y-3">
                ${data.map(item => `
                    <div class="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <div class="flex items-center gap-3">
                            <span class="text-xl">${item.icon}</span>
                            <div>
                                <div class="text-xs font-semibold text-white">${item.name}</div>
                                <div class="text-[10px] text-slate-500">${item.description}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs font-bold text-amber-500">${item.sizeFormatted}</div>
                            <button class="mt-1 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] rounded border border-blue-500/30 transition-colors" 
                                    onclick="cleanDevCategory('${item.key}')">立即清理</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.cleanDevCategory = async function (key) {
    if (!await showConfirmDialog('确定要清理选中的开发者缓存吗？')) return;
    showToast('info', '正在清理开发者缓存...');
    try {
        const r = await window.electronAPI.cleanJunkFiles([key]);
        if (r.success) {
            showToast('success', `已清理 ${r.data.freedSizeFormatted}`);
            loadDevCleanerData();
        }
    } catch (e) {
        showToast('error', '清理失败');
    }
};
