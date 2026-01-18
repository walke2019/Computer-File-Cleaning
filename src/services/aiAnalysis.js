const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * AI 智能分析服务
 * 提供智能清理建议、文件重要性评分、磁盘预测等功能
 */
class AIAnalysisService {
    constructor() {
        this.userHome = os.homedir();
        this.configDir = path.join(this.userHome, '.windows-cleaner');
        this.analyticsFile = path.join(this.configDir, 'analytics.json');
        this.analytics = this.loadAnalytics();

        // 文件类型风险等级 (1-10, 10=最安全删除)
        this.fileRiskLevels = {
            // 非常安全 (9-10)
            '.tmp': 10, '.temp': 10, '.log': 9, '.bak': 9, '.old': 9,
            '.cache': 10, '.dmp': 9, '.chk': 10, '.gid': 10,
            // 安全 (7-8)
            '.pf': 8, '.etl': 8, '.lnk': 7,
            // 中等风险 (5-6)
            '.exe': 5, '.msi': 5, '.zip': 6, '.rar': 6, '.7z': 6,
            // 较高风险 (3-4)
            '.doc': 3, '.docx': 3, '.pdf': 3, '.xls': 3, '.xlsx': 3,
            '.ppt': 3, '.pptx': 3, '.txt': 4,
            // 高风险 (1-2)
            '.psd': 2, '.ai': 2, '.dwg': 2, '.db': 1, '.sql': 1
        };

        // 重要目录标记
        this.importantPaths = [
            'Documents', 'Desktop', 'Pictures', 'Projects', 'Work', '工作', '项目', '重要'
        ];

        // 临时/缓存目录标记
        this.tempPaths = [
            'Temp', 'Cache', 'cache', 'tmp', 'Logs', 'logs', 'AppData\\Local\\Temp'
        ];
    }

    /**
     * 加载分析数据
     */
    loadAnalytics() {
        try {
            if (fs.existsSync(this.analyticsFile)) {
                return JSON.parse(fs.readFileSync(this.analyticsFile, 'utf-8'));
            }
        } catch (e) { }
        return {
            diskUsageHistory: [], // 磁盘使用历史
            cleanHistory: [], // 清理历史
            lastAnalysis: null
        };
    }

    /**
     * 保存分析数据
     */
    saveAnalytics() {
        try {
            if (!fs.existsSync(this.configDir)) {
                fs.mkdirSync(this.configDir, { recursive: true });
            }
            fs.writeFileSync(this.analyticsFile, JSON.stringify(this.analytics, null, 2), 'utf-8');
        } catch (e) {
            console.error('保存分析数据失败:', e);
        }
    }

    /**
     * 记录磁盘使用情况（用于预测）
     */
    recordDiskUsage(drives) {
        const record = {
            timestamp: new Date().toISOString(),
            drives: drives.map(d => ({
                letter: d.letter,
                used: d.used,
                total: d.total,
                usedPercentage: d.usedPercentage
            }))
        };

        this.analytics.diskUsageHistory.push(record);

        // 保留最近 30 天的数据
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        this.analytics.diskUsageHistory = this.analytics.diskUsageHistory.filter(
            r => new Date(r.timestamp).getTime() > thirtyDaysAgo
        );

        this.saveAnalytics();
    }

    /**
     * 计算文件重要性评分 (0-100, 100=最重要)
     */
    calculateFileImportance(file) {
        let score = 50; // 基础分

        // 1. 基于文件类型 (-30 到 +30)
        const ext = path.extname(file.path || file.name).toLowerCase();
        const riskLevel = this.fileRiskLevels[ext] || 5;
        score += (5 - riskLevel) * 6; // 风险越高，重要性越高

        // 2. 基于文件路径 (-20 到 +20)
        const filePath = file.path || '';
        if (this.importantPaths.some(p => filePath.includes(p))) {
            score += 20;
        }
        if (this.tempPaths.some(p => filePath.includes(p))) {
            score -= 20;
        }

        // 3. 基于文件大小 (-10 到 +10)
        const sizeMB = (file.size || 0) / (1024 * 1024);
        if (sizeMB > 100) score += 10; // 大文件通常更重要
        else if (sizeMB < 0.1) score -= 5; // 小文件可能是临时文件

        // 4. 基于最近访问时间 (-10 到 +10)
        if (file.modified) {
            const daysSinceModified = (Date.now() - new Date(file.modified).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceModified < 7) score += 10;
            else if (daysSinceModified > 90) score -= 10;
        }

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * 获取文件重要性标签
     */
    getImportanceLabel(score) {
        if (score >= 80) return { label: '重要', color: '#ef4444', icon: '🔴' };
        if (score >= 60) return { label: '较重要', color: '#f59e0b', icon: '🟠' };
        if (score >= 40) return { label: '一般', color: '#eab308', icon: '🟡' };
        if (score >= 20) return { label: '可清理', color: '#22c55e', icon: '🟢' };
        return { label: '建议清理', color: '#10b981', icon: '✅' };
    }

    /**
     * 生成智能清理建议
     */
    async generateCleaningSuggestions(scanResult, diskInfo) {
        const suggestions = [];
        let totalSavings = 0;

        // 1. 分析垃圾文件
        if (scanResult) {
            for (const [key, category] of Object.entries(scanResult)) {
                if (category.fileCount > 0 && category.safeToClean) {
                    suggestions.push({
                        type: 'junk',
                        priority: category.totalSize > 100 * 1024 * 1024 ? 'high' : 'medium',
                        title: `清理 ${category.name}`,
                        description: `发现 ${category.fileCount} 个文件，可释放 ${this.formatSize(category.totalSize)}`,
                        savings: category.totalSize,
                        action: 'clean_junk',
                        category: key,
                        icon: category.icon
                    });
                    totalSavings += category.totalSize;
                }
            }
        }

        // 2. 分析磁盘空间
        if (diskInfo) {
            for (const drive of diskInfo) {
                if (drive.usedPercentage > 90) {
                    suggestions.push({
                        type: 'disk',
                        priority: 'critical',
                        title: `${drive.letter}: 盘空间严重不足`,
                        description: `仅剩 ${drive.freeFormatted}，建议立即清理`,
                        savings: 0,
                        action: 'scan_large',
                        drive: drive.letter,
                        icon: '🚨'
                    });
                } else if (drive.usedPercentage > 80) {
                    suggestions.push({
                        type: 'disk',
                        priority: 'high',
                        title: `${drive.letter}: 盘空间不足`,
                        description: `仅剩 ${drive.freeFormatted}，建议清理大文件`,
                        savings: 0,
                        action: 'scan_large',
                        drive: drive.letter,
                        icon: '⚠️'
                    });
                }
            }
        }

        // 3. 预测性建议
        const prediction = this.predictDiskUsage();
        if (prediction && prediction.daysUntilFull < 30) {
            suggestions.push({
                type: 'prediction',
                priority: prediction.daysUntilFull < 7 ? 'critical' : 'high',
                title: '磁盘空间预警',
                description: `按当前趋势，C盘将在 ${Math.round(prediction.daysUntilFull)} 天后空间不足`,
                savings: 0,
                action: 'view_prediction',
                icon: '🔮'
            });
        }

        // 4. 周期性清理建议
        const lastClean = this.analytics.cleanHistory[this.analytics.cleanHistory.length - 1];
        if (lastClean) {
            const daysSinceClean = (Date.now() - new Date(lastClean.timestamp).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceClean > 7) {
                suggestions.push({
                    type: 'routine',
                    priority: 'low',
                    title: '定期清理提醒',
                    description: `距离上次清理已过 ${Math.round(daysSinceClean)} 天，建议进行常规清理`,
                    savings: 0,
                    action: 'scan_junk',
                    icon: '📅'
                });
            }
        }

        // 按优先级排序
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return {
            suggestions: suggestions.slice(0, 10),
            totalSavings,
            totalSavingsFormatted: this.formatSize(totalSavings),
            analysisTime: new Date().toISOString()
        };
    }

    /**
     * 预测磁盘使用趋势
     */
    predictDiskUsage() {
        const history = this.analytics.diskUsageHistory;
        if (history.length < 3) return null;

        // 获取 C 盘历史数据
        const cDriveHistory = history
            .map(r => {
                const cDrive = r.drives.find(d => d.letter === 'C');
                return cDrive ? { timestamp: new Date(r.timestamp).getTime(), used: cDrive.used, total: cDrive.total } : null;
            })
            .filter(Boolean);

        if (cDriveHistory.length < 3) return null;

        // 简单线性回归预测
        const n = cDriveHistory.length;
        const latestData = cDriveHistory[n - 1];
        const oldestData = cDriveHistory[0];

        const timeDiff = latestData.timestamp - oldestData.timestamp;
        const usedDiff = latestData.used - oldestData.used;

        if (timeDiff === 0 || usedDiff <= 0) {
            return { trend: 'stable', daysUntilFull: null };
        }

        // 每天增长的字节数
        const dailyGrowth = usedDiff / (timeDiff / (1000 * 60 * 60 * 24));
        const remainingSpace = latestData.total - latestData.used;
        const daysUntilFull = remainingSpace / dailyGrowth;

        return {
            trend: usedDiff > 0 ? 'increasing' : 'decreasing',
            dailyGrowth,
            dailyGrowthFormatted: this.formatSize(dailyGrowth),
            daysUntilFull: daysUntilFull > 0 ? daysUntilFull : null,
            currentUsed: latestData.used,
            currentTotal: latestData.total,
            prediction: [
                { days: 7, projected: latestData.used + dailyGrowth * 7 },
                { days: 30, projected: latestData.used + dailyGrowth * 30 },
                { days: 90, projected: latestData.used + dailyGrowth * 90 }
            ]
        };
    }

    /**
     * 智能文件分类
     */
    categorizeFiles(files) {
        const categories = {
            documents: { name: '文档', icon: '📄', files: [], totalSize: 0 },
            media: { name: '媒体', icon: '🎬', files: [], totalSize: 0 },
            archives: { name: '压缩包', icon: '📦', files: [], totalSize: 0 },
            installers: { name: '安装包', icon: '💿', files: [], totalSize: 0 },
            temp: { name: '临时文件', icon: '🗑️', files: [], totalSize: 0 },
            dev: { name: '开发相关', icon: '💻', files: [], totalSize: 0 },
            other: { name: '其他', icon: '📁', files: [], totalSize: 0 }
        };

        const extMap = {
            documents: ['.doc', '.docx', '.pdf', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.odt', '.rtf'],
            media: ['.mp4', '.avi', '.mkv', '.mov', '.mp3', '.wav', '.flac', '.jpg', '.jpeg', '.png', '.gif', '.psd'],
            archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.iso'],
            installers: ['.exe', '.msi', '.msix', '.appx'],
            temp: ['.tmp', '.temp', '.log', '.bak', '.old', '.cache'],
            dev: ['.js', '.ts', '.py', '.java', '.cpp', '.h', '.json', '.xml', '.yml']
        };

        for (const file of files) {
            const ext = path.extname(file.name || file.path || '').toLowerCase();
            let assigned = false;

            for (const [cat, exts] of Object.entries(extMap)) {
                if (exts.includes(ext)) {
                    categories[cat].files.push(file);
                    categories[cat].totalSize += file.size || 0;
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                categories.other.files.push(file);
                categories.other.totalSize += file.size || 0;
            }
        }

        // 添加格式化大小
        for (const cat of Object.values(categories)) {
            cat.totalSizeFormatted = this.formatSize(cat.totalSize);
            cat.fileCount = cat.files.length;
        }

        return categories;
    }

    /**
     * 生成清理报告摘要（AI 风格）
     */
    generateReportSummary(cleanResult, diskInfo) {
        const report = {
            greeting: this.getTimeBasedGreeting(),
            summary: '',
            insights: [],
            recommendations: []
        };

        // 主要摘要
        if (cleanResult && cleanResult.deletedCount > 0) {
            report.summary = `本次清理删除了 ${cleanResult.deletedCount} 个文件，为您释放了 ${cleanResult.freedSizeFormatted} 的磁盘空间。`;
        }

        // 洞察
        if (diskInfo) {
            const cDrive = diskInfo.find(d => d.letter === 'C');
            if (cDrive) {
                if (cDrive.usedPercentage > 80) {
                    report.insights.push({
                        icon: '⚠️',
                        text: `C盘使用率达到 ${cDrive.usedPercentage}%，建议继续清理大文件`
                    });
                } else {
                    report.insights.push({
                        icon: '✅',
                        text: `C盘状态良好，剩余空间 ${cDrive.freeFormatted}`
                    });
                }
            }
        }

        // 推荐
        report.recommendations.push({
            icon: '💡',
            text: '建议每周运行一次垃圾清理，保持系统流畅'
        });

        return report;
    }

    /**
     * 获取基于时间的问候语
     */
    getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 6) return '夜深了，注意休息哦！';
        if (hour < 12) return '早上好！';
        if (hour < 14) return '中午好！';
        if (hour < 18) return '下午好！';
        if (hour < 22) return '晚上好！';
        return '夜深了，注意休息哦！';
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

module.exports = { AIAnalysisService };
