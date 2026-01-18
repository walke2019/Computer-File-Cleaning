const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { CleanerService } = require('./src/services/cleaner');
const { FileScannerService } = require('./src/services/fileScanner');
const { SettingsService } = require('./src/services/settings');
const { AdvancedCleanerService } = require('./src/services/advancedCleaner');
const { AIAnalysisService } = require('./src/services/aiAnalysis');
const { AIChatService } = require('./src/services/aiChat');
const { AIFileAssistantService } = require('./src/services/aiFileAssistant');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        backgroundColor: '#0f172a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('src/renderer/index.html');

    // 开发时打开开发者工具
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 窗口控制
ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('window-close', () => {
    mainWindow.close();
});

// 服务实例
const cleanerService = new CleanerService();
const fileScannerService = new FileScannerService();
const settingsService = new SettingsService();
const advancedCleanerService = new AdvancedCleanerService();
const aiAnalysisService = new AIAnalysisService();
const aiChatService = new AIChatService();
const aiFileAssistant = new AIFileAssistantService(aiChatService);

// ==================== 设置 API ====================

// 获取设置
ipcMain.handle('get-settings', async () => {
    return { success: true, data: settingsService.getSettings() };
});

// 更新设置
ipcMain.handle('update-settings', async (event, newSettings) => {
    const result = settingsService.updateSettings(newSettings);
    return { success: result };
});

// 获取白名单
ipcMain.handle('get-exclude-paths', async () => {
    return { success: true, data: settingsService.getExcludePaths() };
});

// 添加白名单路径
ipcMain.handle('add-exclude-path', async (event, pathToExclude) => {
    const result = settingsService.addExcludePath(pathToExclude);
    return { success: result };
});

// 移除白名单路径
ipcMain.handle('remove-exclude-path', async (event, pathToRemove) => {
    const result = settingsService.removeExcludePath(pathToRemove);
    return { success: result };
});

// ==================== 历史记录 API ====================

// 获取历史记录
ipcMain.handle('get-history', async (event, limit) => {
    return { success: true, data: settingsService.getHistory(limit) };
});

// 获取统计数据
ipcMain.handle('get-statistics', async () => {
    return { success: true, data: settingsService.getStatistics() };
});

// 清空历史记录
ipcMain.handle('clear-history', async () => {
    const result = settingsService.clearHistory();
    return { success: result };
});

// 导出报告
ipcMain.handle('export-report', async (event, format) => {
    try {
        const report = settingsService.exportReport(format);
        if (report) {
            const { filePath } = await dialog.showSaveDialog(mainWindow, {
                title: '导出清理报告',
                defaultPath: report.filename,
                filters: [
                    { name: '文本文件', extensions: ['txt'] }
                ]
            });

            if (filePath) {
                fs.writeFileSync(filePath, report.content, 'utf-8');
                return { success: true, path: filePath };
            }
        }
        return { success: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== 垃圾清理 API ====================

// 扫描垃圾文件
ipcMain.handle('scan-junk-files', async (event) => {
    try {
        const result = await cleanerService.scanJunkFiles((progress) => {
            mainWindow.webContents.send('scan-progress', progress);
        });
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 清理垃圾文件
ipcMain.handle('clean-junk-files', async (event, categories) => {
    try {
        const result = await cleanerService.cleanJunkFiles(categories, (progress) => {
            mainWindow.webContents.send('clean-progress', progress);
        });

        // 记录到历史
        settingsService.addCleanRecord({
            type: 'junk',
            deletedCount: result.deletedCount,
            freedSize: result.freedSize,
            categories: categories,
            errors: result.errors
        });

        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 清理选中的文件（按文件路径）
ipcMain.handle('clean-selected-files', async (event, filePaths) => {
    try {
        const result = await cleanerService.cleanSelectedFiles(filePaths, (progress) => {
            mainWindow.webContents.send('clean-progress', progress);
        });

        // 记录到历史
        settingsService.addCleanRecord({
            type: 'junk',
            deletedCount: result.deletedCount,
            freedSize: result.freedSize,
            errors: result.errors
        });

        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== 大文件扫描 API ====================

// 获取文件类型定义
ipcMain.handle('get-file-types', async () => {
    return fileScannerService.getFileTypes();
});

// 扫描大文件
ipcMain.handle('scan-large-files', async (event, options) => {
    try {
        // 添加白名单到排除路径
        const excludePaths = settingsService.getExcludePaths();
        options.excludePaths = [...(options.excludePaths || []), ...excludePaths];

        const result = await fileScannerService.scanLargeFiles(options, (progress) => {
            mainWindow.webContents.send('scan-large-progress', progress);
        });
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 停止扫描
ipcMain.handle('stop-scan', async () => {
    fileScannerService.stopScan();
    advancedCleanerService.stopScan();
    return { success: true };
});

// 删除文件
ipcMain.handle('delete-files', async (event, filePaths) => {
    try {
        const result = await fileScannerService.deleteFiles(filePaths, (progress) => {
            mainWindow.webContents.send('delete-progress', progress);
        });

        // 记录到历史
        settingsService.addCleanRecord({
            type: 'large-files',
            deletedCount: result.deletedCount,
            freedSize: result.freedSize,
            errors: result.errors
        });

        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 打开文件所在位置
ipcMain.handle('open-file-location', async (event, filePath) => {
    shell.showItemInFolder(filePath);
    return { success: true };
});

// 移动文件到回收站
ipcMain.handle('move-to-trash', async (event, filePaths) => {
    try {
        let deletedCount = 0;
        let freedSize = 0;
        const errors = [];

        for (const filePath of filePaths) {
            try {
                const stats = fs.statSync(filePath);
                await shell.trashItem(filePath);
                deletedCount++;
                freedSize += stats.size;
            } catch (e) {
                errors.push({ path: filePath, error: e.message });
            }
        }

        // 记录到历史
        settingsService.addCleanRecord({
            type: 'large-files',
            deletedCount: deletedCount,
            freedSize: freedSize,
            errors: errors
        });

        return {
            success: true,
            data: {
                deletedCount,
                freedSize,
                freedSizeFormatted: fileScannerService.formatSize(freedSize),
                errors
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== 空文件夹清理 API ====================

// 扫描空文件夹
ipcMain.handle('scan-empty-folders', async (event, targetPath) => {
    try {
        const result = await advancedCleanerService.scanEmptyFolders(targetPath, (progress) => {
            mainWindow.webContents.send('scan-empty-progress', progress);
        });
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 删除空文件夹
ipcMain.handle('delete-empty-folders', async (event, folderPaths) => {
    try {
        const result = await advancedCleanerService.deleteEmptyFolders(folderPaths, (progress) => {
            mainWindow.webContents.send('delete-empty-progress', progress);
        });

        // 记录到历史
        settingsService.addCleanRecord({
            type: 'empty-folders',
            deletedCount: result.deletedCount,
            freedSize: 0,
            errors: result.errors
        });

        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== 重复文件查找 API ====================

// 扫描重复文件
ipcMain.handle('scan-duplicate-files', async (event, options) => {
    try {
        const result = await advancedCleanerService.scanDuplicateFiles(options, (progress) => {
            mainWindow.webContents.send('scan-duplicate-progress', progress);
        });
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 删除重复文件
ipcMain.handle('delete-duplicate-files', async (event, groups) => {
    try {
        const result = await advancedCleanerService.deleteDuplicateFiles(groups, true, (progress) => {
            mainWindow.webContents.send('delete-duplicate-progress', progress);
        });

        // 记录到历史
        settingsService.addCleanRecord({
            type: 'duplicates',
            deletedCount: result.deletedCount,
            freedSize: result.freedSize,
            errors: result.errors
        });

        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== 磁盘信息 API ====================

// 获取磁盘信息
ipcMain.handle('get-disk-info', async () => {
    try {
        const drives = await fileScannerService.getDiskInfo();
        return { success: true, data: drives };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== 系统信息 API ====================

// 获取系统信息
ipcMain.handle('get-system-info', async () => {
    const os = require('os');
    const { PlatformAdapter } = require('./src/services/platformAdapter');
    const platform = new PlatformAdapter();

    return {
        success: true,
        data: {
            platform: platform.getPlatformName(),
            platformIcon: platform.getPlatformIcon(),
            isWindows: platform.isWindows,
            isMac: platform.isMac,
            release: os.release(),
            hostname: os.hostname(),
            username: os.userInfo().username,
            homedir: os.homedir(),
            totalMemory: fileScannerService.formatSize(os.totalmem()),
            freeMemory: fileScannerService.formatSize(os.freemem()),
            cpuCores: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            uptime: Math.floor(os.uptime() / 3600) + ' 小时'
        }
    };
});

// ==================== 对话框 API ====================

// 选择文件夹
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (result.canceled) {
        return { success: false };
    }

    return { success: true, path: result.filePaths[0] };
});

// 选择多个文件
ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: '所有文件', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return { success: false };
    }

    return { success: true, paths: result.filePaths };
});

// 选择单个文件
ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '所有文件', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return { success: false };
    }

    return { success: true, path: result.filePaths[0] };
});

// ==================== AI 智能分析 API ====================

// 获取智能清理建议
ipcMain.handle('get-ai-suggestions', async (event, scanResult) => {
    try {
        const diskInfo = await fileScannerService.getDiskInfo();
        const suggestions = await aiAnalysisService.generateCleaningSuggestions(scanResult, diskInfo);
        return { success: true, data: suggestions };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 计算文件重要性评分
ipcMain.handle('get-file-importance', async (event, file) => {
    const score = aiAnalysisService.calculateFileImportance(file);
    const label = aiAnalysisService.getImportanceLabel(score);
    return { success: true, data: { score, ...label } };
});

// 预测磁盘使用趋势
ipcMain.handle('get-disk-prediction', async () => {
    try {
        const diskInfo = await fileScannerService.getDiskInfo();
        aiAnalysisService.recordDiskUsage(diskInfo);
        const prediction = aiAnalysisService.predictDiskUsage();
        return { success: true, data: prediction };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 智能文件分类
ipcMain.handle('categorize-files', async (event, files) => {
    const categories = aiAnalysisService.categorizeFiles(files);
    return { success: true, data: categories };
});

// 生成清理报告摘要
ipcMain.handle('get-report-summary', async (event, cleanResult) => {
    try {
        const diskInfo = await fileScannerService.getDiskInfo();
        const summary = aiAnalysisService.generateReportSummary(cleanResult, diskInfo);
        return { success: true, data: summary };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== AI 聊天 API ====================

// 获取 AI 供应商列表
ipcMain.handle('get-ai-providers', async () => {
    return { success: true, data: aiChatService.getProviders() };
});

// 获取 AI 配置
ipcMain.handle('get-ai-config', async () => {
    // 从设置中读取
    const settings = settingsService.getSettings();
    if (settings.aiConfig) {
        aiChatService.setConfig(settings.aiConfig);
    }
    return { success: true, data: aiChatService.getConfig() };
});

// 保存 AI 配置
ipcMain.handle('save-ai-config', async (event, config) => {
    try {
        aiChatService.setConfig(config);
        // 保存到设置
        const settings = settingsService.getSettings();
        settings.aiConfig = config;
        settingsService.updateSettings({ aiConfig: config });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 测试 AI 连接
ipcMain.handle('test-ai-connection', async () => {
    try {
        const result = await aiChatService.testConnection();
        return result;
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// 获取可用模型列表
ipcMain.handle('fetch-ai-models', async (event, provider, apiKey, baseUrl) => {
    try {
        const models = await aiChatService.fetchAvailableModels(provider, apiKey, baseUrl);
        return { success: true, data: models };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 发送 AI 消息
ipcMain.handle('send-ai-message', async (event, message, history) => {
    try {
        const response = await aiChatService.sendMessage(message, history);
        return { success: true, data: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
});


// ==================== AI 文件助手 API ====================

// 分析文件
ipcMain.handle('ai-analyze-file', async (event, filePath) => {
    try {
        const result = await aiFileAssistant.analyzeFile(filePath);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 批量分析文件
ipcMain.handle('ai-analyze-files', async (event, filePaths) => {
    try {
        const results = await aiFileAssistant.analyzeFiles(filePaths, (progress) => {
            mainWindow.webContents.send('ai-analyze-progress', progress);
        });
        return { success: true, data: results };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// AI 智能分类
ipcMain.handle('ai-categorize-files', async (event, options) => {
    try {
        const { files, directoryPath } = options || {};
        const categories = await aiFileAssistant.categorizeFiles(files, directoryPath);
        return { success: true, data: categories };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// AI 重命名建议
ipcMain.handle('ai-suggest-rename', async (event, file) => {
    try {
        const suggestion = await aiFileAssistant.suggestRename(file);
        return { success: true, data: suggestion };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 批量重命名建议
ipcMain.handle('ai-suggest-batch-rename', async (event, files) => {
    try {
        const suggestions = await aiFileAssistant.suggestBatchRename(files, (progress) => {
            mainWindow.webContents.send('ai-rename-progress', progress);
        });
        return { success: true, data: suggestions };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 执行重命名
ipcMain.handle('ai-execute-rename', async (event, filePath, newName) => {
    try {
        const result = await aiFileAssistant.executeRename(filePath, newName);
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// AI 调整分类
ipcMain.handle('ai-adjust-categorization', async (event, files, currentCategories, instruction) => {
    try {
        const result = await aiFileAssistant.adjustCategorization(files, currentCategories, instruction);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 批量执行重命名
ipcMain.handle('ai-execute-batch-rename', async (event, renamePairs) => {
    try {
        const result = await aiFileAssistant.executeBatchRename(renamePairs, (progress) => {
            mainWindow.webContents.send('ai-batch-rename-progress', progress);
        });
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 创建分类目录
ipcMain.handle('ai-create-category-structure', async (event, basePath, categories) => {
    try {
        const result = await aiFileAssistant.createCategoryStructure(basePath, categories);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 移动文件到分类目录
// 移动文件到分类目录
ipcMain.handle('ai-move-to-categories', async (event, basePath, categorizedFiles) => {
    try {
        const result = await aiFileAssistant.moveFilesToCategories(basePath, categorizedFiles, (progress) => {
            mainWindow.webContents.send('ai-move-progress', progress);
        });

        // 记录操作到历史记录，支持撤销
        if (result.results && result.results.length > 0) {
            settingsService.addCleanRecord({
                type: 'ai-categorize',
                deletedCount: 0,
                freedSize: 0,
                details: `整理了 ${result.succeeded} 个文件`,
                movedFiles: result.results,
                canUndo: true
            });
        }

        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 撤销历史记录
ipcMain.handle('undo-history-record', async (event, recordId) => {
    try {
        const history = settingsService.getHistory(1000);
        const record = history.find(r => r.id === recordId);

        if (!record) return { success: false, error: '记录不存在' };
        if (!record.canUndo) return { success: false, error: '此记录无法撤销或已撤销' };
        if (!record.movedFiles || record.movedFiles.length === 0) return { success: false, error: '无文件操作详情' };

        let recovered = 0;
        let failed = 0;

        for (const move of record.movedFiles) {
            if (!move.success) continue;
            try {
                if (fs.existsSync(move.target)) {
                    const sourceDir = path.dirname(move.source);
                    if (!fs.existsSync(sourceDir)) fs.mkdirSync(sourceDir, { recursive: true });

                    if (!fs.existsSync(move.source)) {
                        fs.renameSync(move.target, move.source);
                        recovered++;
                    } else {
                        failed++;
                    }
                } else {
                    failed++;
                }
            } catch (e) {
                failed++;
                console.error(`撤销文件失败: ${move.target}`, e);
            }
        }

        settingsService.updateHistoryRecord(recordId, {
            canUndo: false,
            undone: true,
            details: record.details + ` 【已撤销】`
        });

        return { success: true, recovered, failed };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 扫描文件夹中的文件
ipcMain.handle('list-files-in-folder', async (event, folderPath) => {
    try {
        const files = fs.readdirSync(folderPath).filter(f => {
            const fullPath = path.join(folderPath, f);
            try {
                return fs.statSync(fullPath).isFile();
            } catch (e) {
                return false;
            }
        }).map(f => ({
            path: path.join(folderPath, f),
            name: f
        }));
        return { success: true, data: files };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
