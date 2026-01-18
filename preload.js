const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 窗口控制
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),

    // ==================== 设置 ====================
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSettings: (newSettings) => ipcRenderer.invoke('update-settings', newSettings),
    getExcludePaths: () => ipcRenderer.invoke('get-exclude-paths'),
    addExcludePath: (path) => ipcRenderer.invoke('add-exclude-path', path),
    removeExcludePath: (path) => ipcRenderer.invoke('remove-exclude-path', path),

    // ==================== 历史记录 ====================
    getHistory: (limit) => ipcRenderer.invoke('get-history', limit),
    getStatistics: () => ipcRenderer.invoke('get-statistics'),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    undoHistoryRecord: (recordId) => ipcRenderer.invoke('undo-history-record', recordId),
    exportReport: (format) => ipcRenderer.invoke('export-report', format),

    // ==================== 垃圾清理 ====================
    scanJunkFiles: () => ipcRenderer.invoke('scan-junk-files'),
    cleanJunkFiles: (categories) => ipcRenderer.invoke('clean-junk-files', categories),
    cleanSelectedFiles: (filePaths) => ipcRenderer.invoke('clean-selected-files', filePaths),

    // ==================== 大文件扫描 ====================
    getFileTypes: () => ipcRenderer.invoke('get-file-types'),
    scanLargeFiles: (options) => ipcRenderer.invoke('scan-large-files', options),
    stopScan: () => ipcRenderer.invoke('stop-scan'),
    deleteFiles: (filePaths) => ipcRenderer.invoke('delete-files', filePaths),
    openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
    moveToTrash: (filePaths) => ipcRenderer.invoke('move-to-trash', filePaths),

    // ==================== 空文件夹清理 ====================
    scanEmptyFolders: (targetPath) => ipcRenderer.invoke('scan-empty-folders', targetPath),
    deleteEmptyFolders: (folderPaths) => ipcRenderer.invoke('delete-empty-folders', folderPaths),

    // ==================== 重复文件查找 ====================
    scanDuplicateFiles: (options) => ipcRenderer.invoke('scan-duplicate-files', options),
    deleteDuplicateFiles: (groups) => ipcRenderer.invoke('delete-duplicate-files', groups),

    // ==================== 磁盘和系统信息 ====================
    getDiskInfo: () => ipcRenderer.invoke('get-disk-info'),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

    // ==================== 对话框 ====================
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    selectFiles: () => ipcRenderer.invoke('select-files'),
    selectFile: () => ipcRenderer.invoke('select-file'),

    // ==================== AI 智能分析 ====================
    getAISuggestions: (scanResult) => ipcRenderer.invoke('get-ai-suggestions', scanResult),
    getFileImportance: (file) => ipcRenderer.invoke('get-file-importance', file),
    getDiskPrediction: () => ipcRenderer.invoke('get-disk-prediction'),
    categorizeFiles: (files) => ipcRenderer.invoke('categorize-files', files),
    getReportSummary: (cleanResult) => ipcRenderer.invoke('get-report-summary', cleanResult),

    // ==================== AI 聊天 ====================
    listFiles: (folderPath) => ipcRenderer.invoke('list-files-in-folder', folderPath),
    getAIProviders: () => ipcRenderer.invoke('get-ai-providers'),
    getAIConfig: () => ipcRenderer.invoke('get-ai-config'),
    saveAIConfig: (config) => ipcRenderer.invoke('save-ai-config', config),
    testAIConnection: () => ipcRenderer.invoke('test-ai-connection'),
    fetchAIModels: (provider, apiKey, baseUrl) => ipcRenderer.invoke('fetch-ai-models', provider, apiKey, baseUrl),
    sendAIMessage: (message, history) => ipcRenderer.invoke('send-ai-message', message, history),

    // ==================== AI 文件助手 ====================
    aiAnalyzeFile: (filePath) => ipcRenderer.invoke('ai-analyze-file', filePath),
    aiAnalyzeFiles: (filePaths) => ipcRenderer.invoke('ai-analyze-files', filePaths),
    aiCategorizeFiles: (files) => ipcRenderer.invoke('ai-categorize-files', files),
    aiAdjustCategorization: (files, currentCategories, instruction) => ipcRenderer.invoke('ai-adjust-categorization', files, currentCategories, instruction),
    aiSuggestRename: (file) => ipcRenderer.invoke('ai-suggest-rename', file),
    aiSuggestBatchRename: (files) => ipcRenderer.invoke('ai-suggest-batch-rename', files),
    aiExecuteRename: (filePath, newName) => ipcRenderer.invoke('ai-execute-rename', filePath, newName),
    aiExecuteBatchRename: (renamePairs) => ipcRenderer.invoke('ai-execute-batch-rename', renamePairs),
    aiCreateCategoryStructure: (basePath, categories) => ipcRenderer.invoke('ai-create-category-structure', basePath, categories),
    aiMoveToCategories: (basePath, categorizedFiles) => ipcRenderer.invoke('ai-move-to-categories', basePath, categorizedFiles),

    // ==================== 事件监听 ====================
    onScanProgress: (callback) => ipcRenderer.on('scan-progress', (event, progress) => callback(progress)),
    onCleanProgress: (callback) => ipcRenderer.on('clean-progress', (event, progress) => callback(progress)),
    onScanLargeProgress: (callback) => ipcRenderer.on('scan-large-progress', (event, progress) => callback(progress)),
    onDeleteProgress: (callback) => ipcRenderer.on('delete-progress', (event, progress) => callback(progress)),
    onScanEmptyProgress: (callback) => ipcRenderer.on('scan-empty-progress', (event, progress) => callback(progress)),
    onDeleteEmptyProgress: (callback) => ipcRenderer.on('delete-empty-progress', (event, progress) => callback(progress)),
    onScanDuplicateProgress: (callback) => ipcRenderer.on('scan-duplicate-progress', (event, progress) => callback(progress)),
    onDeleteDuplicateProgress: (callback) => ipcRenderer.on('delete-duplicate-progress', (event, progress) => callback(progress)),
    onAIAnalyzeProgress: (callback) => ipcRenderer.on('ai-analyze-progress', (event, progress) => callback(progress)),
    onAIRenameProgress: (callback) => ipcRenderer.on('ai-rename-progress', (event, progress) => callback(progress)),
    onAIBatchRenameProgress: (callback) => ipcRenderer.on('ai-batch-rename-progress', (event, progress) => callback(progress)),
    onAIMoveProgress: (callback) => ipcRenderer.on('ai-move-progress', (event, progress) => callback(progress)),

    // 移除监听
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
