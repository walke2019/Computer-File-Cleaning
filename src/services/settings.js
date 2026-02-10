const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 设置服务 - 管理用户配置和历史记录
 */
class SettingsService {
    constructor() {
        this.configDir = path.join(os.homedir(), '.windows-cleaner');
        this.configFile = path.join(this.configDir, 'settings.json');
        this.historyFile = path.join(this.configDir, 'history.json');

        const isMac = os.platform() === 'darwin';
        this.defaultSettings = {
            // 白名单 - 排除的路径
            excludePaths: [],
            // 白名单 - 排除的文件扩展名
            excludeExtensions: [],
            // 大文件扫描默认最小大小 (MB)
            defaultMinFileSize: 100,
            // 大文件扫描默认驱动器
            defaultDrive: isMac ? '/' : 'C:',
            // 清理前确认
            confirmBeforeClean: true,
            // 清理后显示报告
            showReportAfterClean: true,
            // 保留最近N天的历史记录
            historyRetentionDays: 30,
            // 主题 (dark/light)
            theme: 'dark',
            // 语言
            language: 'zh-CN'
        };

        this.settings = null;
        this.history = [];

        this.init();
    }

    /**
     * 初始化配置目录和文件
     */
    init() {
        try {
            // 创建配置目录
            if (!fs.existsSync(this.configDir)) {
                fs.mkdirSync(this.configDir, { recursive: true });
            }

            // 加载设置
            this.loadSettings();

            // 加载历史记录
            this.loadHistory();
        } catch (error) {
            console.error('初始化设置服务失败:', error);
            this.settings = { ...this.defaultSettings };
            this.history = [];
        }
    }

    /**
     * 加载设置
     */
    loadSettings() {
        try {
            if (fs.existsSync(this.configFile)) {
                const data = fs.readFileSync(this.configFile, 'utf-8');
                const savedSettings = JSON.parse(data);
                this.settings = { ...this.defaultSettings, ...savedSettings };
            } else {
                this.settings = { ...this.defaultSettings };
                this.saveSettings();
            }
        } catch (error) {
            console.error('加载设置失败:', error);
            this.settings = { ...this.defaultSettings };
        }
    }

    /**
     * 保存设置
     */
    saveSettings() {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(this.settings, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    }

    /**
     * 获取设置
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * 更新设置
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        return this.saveSettings();
    }

    /**
     * 获取白名单路径
     */
    getExcludePaths() {
        return [...this.settings.excludePaths];
    }

    /**
     * 添加白名单路径
     */
    addExcludePath(pathToExclude) {
        if (!this.settings.excludePaths.includes(pathToExclude)) {
            this.settings.excludePaths.push(pathToExclude);
            this.saveSettings();
            return true;
        }
        return false;
    }

    /**
     * 移除白名单路径
     */
    removeExcludePath(pathToRemove) {
        const index = this.settings.excludePaths.indexOf(pathToRemove);
        if (index > -1) {
            this.settings.excludePaths.splice(index, 1);
            this.saveSettings();
            return true;
        }
        return false;
    }

    /**
     * 加载历史记录
     */
    loadHistory() {
        try {
            if (fs.existsSync(this.historyFile)) {
                const data = fs.readFileSync(this.historyFile, 'utf-8');
                this.history = JSON.parse(data);

                // 清理过期的历史记录
                this.cleanOldHistory();
            } else {
                this.history = [];
            }
        } catch (error) {
            console.error('加载历史记录失败:', error);
            this.history = [];
        }
    }

    /**
     * 保存历史记录
     */
    saveHistory() {
        try {
            fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('保存历史记录失败:', error);
            return false;
        }
    }

    /**
     * 添加清理记录
     */
    addCleanRecord(record) {
        const newRecord = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: record.type || 'junk', // junk, large-files, empty-folders, duplicates
            deletedCount: record.deletedCount || 0,
            freedSize: record.freedSize || 0,
            freedSizeFormatted: this.formatSize(record.freedSize || 0),
            categories: record.categories || [],
            details: record.details || '',
            errors: record.errors || []
        };

        this.history.unshift(newRecord);

        // 限制历史记录数量
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }

        this.saveHistory();
        return newRecord;
    }

    /**
     * 获取历史记录
     */
    /**
     * 获取历史记录
     */
    getHistory(limit = 50) {
        return this.history.slice(0, limit);
    }

    /**
     * 更新历史记录
     */
    updateHistoryRecord(id, updates) {
        const index = this.history.findIndex(r => r.id === id);
        if (index > -1) {
            this.history[index] = { ...this.history[index], ...updates };
            this.saveHistory();
            return true;
        }
        return false;
    }

    /**
     * 清理过期的历史记录
     */
    cleanOldHistory() {
        const retentionDays = this.settings.historyRetentionDays || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const originalLength = this.history.length;
        this.history = this.history.filter(record => {
            return new Date(record.timestamp) > cutoffDate;
        });

        if (this.history.length !== originalLength) {
            this.saveHistory();
        }
    }

    /**
     * 清空历史记录
     */
    clearHistory() {
        this.history = [];
        this.saveHistory();
        return true;
    }

    /**
     * 获取统计数据
     */
    getStatistics() {
        const totalCleaned = this.history.reduce((sum, r) => sum + (r.freedSize || 0), 0);
        const totalFiles = this.history.reduce((sum, r) => sum + (r.deletedCount || 0), 0);
        const cleanCount = this.history.length;

        // 按类型分组统计
        const byType = {};
        for (const record of this.history) {
            const type = record.type || 'junk';
            if (!byType[type]) {
                byType[type] = { count: 0, size: 0, files: 0 };
            }
            byType[type].count++;
            byType[type].size += record.freedSize || 0;
            byType[type].files += record.deletedCount || 0;
        }

        return {
            totalCleaned,
            totalCleanedFormatted: this.formatSize(totalCleaned),
            totalFiles,
            cleanCount,
            byType
        };
    }

    /**
     * 导出报告
     */
    exportReport(format = 'txt') {
        const stats = this.getStatistics();
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (format === 'txt') {
            const appName = os.platform() === 'darwin' ? '智能文件整理助手' : 'Windows 清理大师';
            let report = `${appName} - 清理报告\n`;
            report += `生成时间: ${now.toLocaleString()}\n`;
            report += `${'='.repeat(50)}\n\n`;

            report += `📊 总体统计\n`;
            report += `-`.repeat(30) + '\n';
            report += `总清理次数: ${stats.cleanCount} 次\n`;
            report += `总清理文件: ${stats.totalFiles.toLocaleString()} 个\n`;
            report += `总释放空间: ${stats.totalCleanedFormatted}\n\n`;

            report += `📋 最近清理记录\n`;
            report += `-`.repeat(30) + '\n';

            for (const record of this.history.slice(0, 20)) {
                const time = new Date(record.timestamp).toLocaleString();
                const typeNames = {
                    'junk': '垃圾清理',
                    'large-files': '大文件清理',
                    'empty-folders': '空文件夹清理',
                    'duplicates': '重复文件清理'
                };
                report += `[${time}] ${typeNames[record.type] || record.type}\n`;
                report += `  删除 ${record.deletedCount} 个文件，释放 ${record.freedSizeFormatted}\n`;
            }

            return { content: report, filename: `清理报告_${dateStr}.txt` };
        }

        return null;
    }

    /**
     * 格式化文件大小
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = { SettingsService };
