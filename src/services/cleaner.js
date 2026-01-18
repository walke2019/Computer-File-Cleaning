const fs = require('fs');
const path = require('path');
const os = require('os');
const { PlatformAdapter } = require('./platformAdapter');

class CleanerService {
    constructor() {
        this.platform = new PlatformAdapter();
        this.tempDir = os.tmpdir();
        this.userHome = os.homedir();

        // 定义垃圾文件类别 - 大幅扩展
        this.junkCategories = {
            // ==================== 系统垃圾 ====================
            systemTemp: {
                name: this.platform.isWindows ? 'Windows 临时文件' : '系统临时文件',
                icon: '🗂️',
                category: 'system',
                description: '系统临时目录中的临时文件',
                paths: this.platform.getTempDirs(),
                extensions: ['.tmp', '.temp', '.log', '.bak', '.old', '.chk', '.gid', '.dmp'],
                safeToClean: true
            },

            systemCache: {
                name: '用户临时文件',
                icon: '💾',
                category: 'system',
                description: '用户账户的临时文件和缓存',
                paths: this.platform.isWindows
                    ? [
                        path.join(this.userHome, 'AppData', 'Local', 'Temp'),
                        path.join(this.userHome, 'AppData', 'Local', 'CrashDumps'),
                        path.join(this.userHome, 'AppData', 'Local', 'D3DSCache')
                    ]
                    : [
                        path.join(this.userHome, 'Library/Caches'),
                        '/var/tmp'
                    ],
                safeToClean: true
            },

            systemUpdate: {
                name: this.platform.isWindows ? 'Windows 更新缓存' : '系统更新缓存',
                icon: '🔄',
                category: 'system',
                description: this.platform.isWindows ? '已安装的 Windows 更新下载文件' : '系统更新下载文件',
                paths: this.platform.getSystemUpdateDirs(),
                safeToClean: true,
                enabled: this.platform.isWindows || this.platform.isMac
            },

            thumbnailCache: {
                name: '缩略图缓存',
                icon: '🖼️',
                category: 'system',
                description: '文件管理器的缩略图缓存',
                paths: this.platform.isWindows
                    ? [path.join(this.userHome, 'AppData', 'Local', 'Microsoft', 'Windows', 'Explorer')]
                    : [path.join(this.userHome, 'Library/Caches/com.apple.finder')],
                patterns: this.platform.isWindows ? ['thumbcache_*.db', 'iconcache_*.db'] : ['*.db'],
                safeToClean: true
            },

            prefetch: {
                name: '预读取数据',
                icon: '⚡',
                category: 'system',
                description: 'Windows 程序预读取缓存',
                paths: this.platform.isWindows ? ['C:\\Windows\\Prefetch'] : [],
                extensions: ['.pf'],
                safeToClean: true,
                enabled: this.platform.isWindows
            },

            recentFiles: {
                name: '最近文件记录',
                icon: '📋',
                category: 'system',
                description: '最近打开的文件快捷方式',
                paths: this.platform.isWindows
                    ? [path.join(this.userHome, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Recent')]
                    : [path.join(this.userHome, 'Library/Application Support/com.apple.sharedfilelist')],
                extensions: this.platform.isWindows ? ['.lnk'] : ['.sfl', '.sfl2'],
                safeToClean: true
            },

            errorReports: {
                name: '错误报告',
                icon: '⚠️',
                category: 'system',
                description: this.platform.isWindows ? 'Windows 错误报告和内存转储' : '系统错误报告',
                paths: this.platform.isWindows
                    ? [
                        path.join(this.userHome, 'AppData', 'Local', 'Microsoft', 'Windows', 'WER'),
                        'C:\\Windows\\LiveKernelReports',
                        'C:\\Windows\\Minidump'
                    ]
                    : [
                        path.join(this.userHome, 'Library/Logs/DiagnosticReports'),
                        '/Library/Logs/DiagnosticReports'
                    ],
                extensions: ['.dmp', '.hdmp', '.mdmp', '.crash', '.panic'],
                safeToClean: true
            },

            systemLogs: {
                name: this.platform.isWindows ? 'Windows 日志' : '系统日志',
                icon: '📝',
                category: 'system',
                description: '系统安装和更新日志',
                paths: this.platform.getSystemLogDirs(),
                extensions: ['.log', '.etl', '.txt'],
                safeToClean: true
            },

            // ==================== 浏览器缓存 ====================
            chromeCache: {
                name: 'Google Chrome 缓存',
                icon: '🌐',
                category: 'browser',
                description: 'Chrome 浏览器缓存和临时文件',
                paths: this.platform.getBrowserCacheDirs('chrome'),
                safeToClean: true
            },

            edgeCache: {
                name: 'Microsoft Edge 缓存',
                icon: '🌊',
                category: 'browser',
                description: 'Edge 浏览器缓存和临时文件',
                paths: this.platform.getBrowserCacheDirs('edge'),
                safeToClean: true
            },

            firefoxCache: {
                name: 'Firefox 缓存',
                icon: '🦊',
                category: 'browser',
                description: 'Firefox 浏览器缓存',
                paths: this.platform.getBrowserCacheDirs('firefox'),
                subfolders: ['cache2'],
                safeToClean: true
            },

            operaCache: {
                name: 'Opera 缓存',
                icon: '🎭',
                category: 'browser',
                description: 'Opera 浏览器缓存',
                paths: [
                    path.join(this.userHome, 'AppData', 'Local', 'Opera Software', 'Opera Stable', 'Cache'),
                    path.join(this.userHome, 'AppData', 'Local', 'Opera Software', 'Opera GX Stable', 'Cache')
                ],
                safeToClean: true
            },

            // ==================== 社交通讯软件 ====================
            wechatCache: {
                name: '微信缓存',
                icon: '💬',
                category: 'social',
                description: '微信临时文件和缓存（不含聊天记录）',
                paths: this.platform.getSocialAppDirs('wechat'),
                dynamicPaths: this.platform.isWindows
                    ? [
                        { base: path.join(this.userHome, 'Documents', 'WeChat Files'), subfolder: 'FileStorage/Cache' },
                        { base: path.join(this.userHome, 'Documents', 'WeChat Files'), subfolder: 'FileStorage/Temp' }
                    ]
                    : [],
                safeToClean: true
            },

            qqCache: {
                name: 'QQ 缓存',
                icon: '🐧',
                category: 'social',
                description: 'QQ 临时文件和缓存',
                paths: this.platform.getSocialAppDirs('qq'),
                dynamicPaths: this.platform.isWindows
                    ? [{ base: path.join(this.userHome, 'AppData', 'Roaming', 'Tencent', 'Users'), subfolder: 'QQ/Temp' }]
                    : [],
                extensions: ['.tmp', '.log'],
                safeToClean: true
            },

            tencentMeeting: {
                name: '腾讯会议缓存',
                icon: '📹',
                category: 'social',
                description: '腾讯会议临时文件和日志',
                paths: [
                    path.join(this.userHome, 'AppData', 'Roaming', 'Tencent', 'WeMeet', 'Cache'),
                    path.join(this.userHome, 'AppData', 'Roaming', 'Tencent', 'WeMeet', 'Logs'),
                    path.join(this.userHome, 'AppData', 'Local', 'Tencent', 'WeMeet', 'Cache')
                ],
                safeToClean: true
            },

            dingTalk: {
                name: '钉钉缓存',
                icon: '💼',
                category: 'social',
                description: '钉钉临时文件和缓存',
                paths: [
                    path.join(this.userHome, 'AppData', 'Local', 'DingTalk', 'Cache'),
                    path.join(this.userHome, 'AppData', 'Roaming', 'DingTalk', 'Cache')
                ],
                safeToClean: true
            },

            telegram: {
                name: 'Telegram 缓存',
                icon: '✈️',
                category: 'social',
                description: 'Telegram 缓存文件',
                paths: this.platform.getSocialAppDirs('telegram'),
                safeToClean: true
            },

            discord: {
                name: 'Discord 缓存',
                icon: '🎮',
                category: 'social',
                description: 'Discord 缓存和临时文件',
                paths: this.platform.getSocialAppDirs('discord'),
                safeToClean: true
            },

            // ==================== 开发工具 ====================
            npmCache: {
                name: 'NPM 缓存',
                icon: '📦',
                category: 'development',
                description: 'Node.js 包管理器缓存',
                paths: this.platform.getDevToolCacheDirs('npm'),
                safeToClean: true
            },

            yarnCache: {
                name: 'Yarn 缓存',
                icon: '🧶',
                category: 'development',
                description: 'Yarn 包管理器缓存',
                paths: this.platform.getDevToolCacheDirs('yarn'),
                safeToClean: true
            },

            pipCache: {
                name: 'Python pip 缓存',
                icon: '🐍',
                category: 'development',
                description: 'Python 包管理器缓存',
                paths: this.platform.getDevToolCacheDirs('pip'),
                safeToClean: true
            },

            gradleCache: {
                name: 'Gradle 缓存',
                icon: '🐘',
                category: 'development',
                description: 'Gradle 构建缓存',
                paths: this.platform.getDevToolCacheDirs('gradle'),
                safeToClean: true
            },

            mavenCache: {
                name: 'Maven 缓存',
                icon: '☕',
                category: 'development',
                description: 'Maven 本地仓库缓存',
                paths: this.platform.getDevToolCacheDirs('maven'),
                safeToClean: false,
                warning: '清理后需要重新下载项目依赖'
            },

            vscodeCache: {
                name: 'VS Code 缓存',
                icon: '💻',
                category: 'development',
                description: 'Visual Studio Code 缓存',
                paths: this.platform.getDevToolCacheDirs('vscode'),
                safeToClean: true
            },

            jetbrainsCache: {
                name: 'JetBrains IDE 缓存',
                icon: '🔨',
                category: 'development',
                description: 'IntelliJ/PyCharm/WebStorm 等 IDE 缓存',
                paths: [
                    path.join(this.userHome, 'AppData', 'Local', 'JetBrains')
                ],
                subfolders: ['caches', 'log'],
                safeToClean: true
            },

            // ==================== 游戏平台 ====================
            steamCache: {
                name: 'Steam 缓存',
                icon: '🎮',
                category: 'gaming',
                description: 'Steam 下载缓存和网页缓存',
                paths: [
                    path.join(this.userHome, 'AppData', 'Local', 'Steam', 'htmlcache'),
                    'C:\\Program Files (x86)\\Steam\\appcache\\httpcache',
                    'C:\\Program Files (x86)\\Steam\\config\\htmlcache'
                ],
                safeToClean: true
            },

            epicCache: {
                name: 'Epic Games 缓存',
                icon: '🎯',
                category: 'gaming',
                description: 'Epic Games 启动器缓存',
                paths: [
                    path.join(this.userHome, 'AppData', 'Local', 'EpicGamesLauncher', 'Saved', 'webcache')
                ],
                safeToClean: true
            },

            // ==================== 创意软件 ====================
            adobeCache: {
                name: 'Adobe 媒体缓存',
                icon: '🎨',
                category: 'creative',
                description: 'Adobe 软件的媒体缓存',
                paths: [
                    path.join(this.userHome, 'AppData', 'Local', 'Adobe'),
                    path.join(this.userHome, 'AppData', 'Roaming', 'Adobe', 'Common', 'Media Cache Files'),
                    path.join(this.userHome, 'AppData', 'Roaming', 'Adobe', 'Common', 'Media Cache')
                ],
                extensions: ['.tmp', '.pek', '.cfa', '.cache'],
                safeToClean: true
            },

            spotifyCache: {
                name: 'Spotify 缓存',
                icon: '🎵',
                category: 'creative',
                description: 'Spotify 音乐缓存',
                paths: [
                    path.join(this.userHome, 'AppData', 'Local', 'Spotify', 'Storage')
                ],
                safeToClean: true
            },

            // ==================== 办公软件 ====================
            officeCache: {
                name: 'Microsoft Office 缓存',
                icon: '📊',
                category: 'office',
                description: 'Office 临时文件和缓存',
                paths: [
                    path.join(this.userHome, 'AppData', 'Local', 'Microsoft', 'Office', 'UnsavedFiles'),
                    path.join(this.userHome, 'AppData', 'Local', 'Microsoft', 'Office', '16.0', 'OfficeFileCache')
                ],
                safeToClean: true
            },

            // ==================== 下载目录清理（可选） ====================
            downloadsOld: {
                name: '下载目录旧文件',
                icon: '📥',
                category: 'optional',
                description: '下载目录中的安装包和临时文件',
                paths: [
                    path.join(this.userHome, 'Downloads')
                ],
                extensions: ['.exe', '.msi', '.zip', '.rar', '.7z'],
                olderThanDays: 30,
                safeToClean: false,
                warning: '仅清理30天前的安装包和压缩文件'
            }
        };

        // 类别分组
        this.categoryGroups = {
            system: { name: '系统垃圾', icon: '🖥️', order: 1 },
            browser: { name: '浏览器缓存', icon: '🌐', order: 2 },
            social: { name: '社交通讯', icon: '💬', order: 3 },
            development: { name: '开发工具', icon: '👨‍💻', order: 4 },
            gaming: { name: '游戏平台', icon: '🎮', order: 5 },
            creative: { name: '创意软件', icon: '🎨', order: 6 },
            office: { name: '办公软件', icon: '📊', order: 7 },
            optional: { name: '可选清理', icon: '⚙️', order: 8 }
        };
    }

    /**
     * 扫描垃圾文件（带分组）
     */
    async scanJunkFiles(progressCallback) {
        const results = {};
        const categories = Object.keys(this.junkCategories);
        let completed = 0;
        let totalScanned = 0;
        let totalSize = 0;

        for (const categoryKey of categories) {
            const category = this.junkCategories[categoryKey];
            const categoryResult = {
                name: category.name,
                icon: category.icon,
                group: category.category,
                groupName: this.categoryGroups[category.category]?.name || '其他',
                description: category.description,
                warning: category.warning,
                safeToClean: category.safeToClean,
                files: [],
                totalSize: 0,
                fileCount: 0
            };

            // 处理普通路径
            for (const scanPath of category.paths || []) {
                try {
                    if (!fs.existsSync(scanPath)) continue;

                    let files;
                    if (category.subfolders) {
                        // 扫描指定子文件夹
                        files = await this.scanWithSubfolders(scanPath, category.subfolders, category.extensions, category.patterns);
                    } else {
                        files = await this.scanDirectory(
                            scanPath,
                            category.extensions || [],
                            category.patterns || [],
                            category.olderThanDays
                        );
                    }

                    categoryResult.files.push(...files);
                    categoryResult.totalSize += files.reduce((sum, f) => sum + f.size, 0);
                    categoryResult.fileCount += files.length;
                } catch (error) {
                    console.log(`无法访问: ${scanPath}`, error.message);
                }
            }

            // 处理动态路径（如微信用户文件夹）
            if (category.dynamicPaths) {
                for (const dynamicPath of category.dynamicPaths) {
                    try {
                        if (fs.existsSync(dynamicPath.base)) {
                            const userFolders = fs.readdirSync(dynamicPath.base, { withFileTypes: true })
                                .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'All Users');

                            for (const userFolder of userFolders) {
                                const targetPath = path.join(dynamicPath.base, userFolder.name, dynamicPath.subfolder);
                                if (fs.existsSync(targetPath)) {
                                    const files = await this.scanDirectory(targetPath, category.extensions || [], category.patterns || []);
                                    categoryResult.files.push(...files);
                                    categoryResult.totalSize += files.reduce((sum, f) => sum + f.size, 0);
                                    categoryResult.fileCount += files.length;
                                }
                            }
                        }
                    } catch (error) {
                        console.log(`无法访问动态路径: ${dynamicPath.base}`, error.message);
                    }
                }
            }

            totalScanned += categoryResult.fileCount;
            totalSize += categoryResult.totalSize;
            results[categoryKey] = categoryResult;
            completed++;

            if (progressCallback) {
                progressCallback({
                    current: completed,
                    total: categories.length,
                    category: category.name,
                    percentage: Math.round((completed / categories.length) * 100),
                    totalScanned: totalScanned,
                    totalSize: this.formatSize(totalSize)
                });
            }
        }

        return results;
    }

    /**
     * 扫描带子文件夹的目录
     */
    async scanWithSubfolders(basePath, subfolders, extensions = [], patterns = []) {
        const files = [];

        try {
            const items = fs.readdirSync(basePath, { withFileTypes: true });

            for (const item of items) {
                if (item.isDirectory()) {
                    for (const subfolder of subfolders) {
                        const targetPath = path.join(basePath, item.name, subfolder);
                        if (fs.existsSync(targetPath)) {
                            const subFiles = await this.scanDirectory(targetPath, extensions, patterns);
                            files.push(...subFiles);
                        }
                    }
                }
            }
        } catch (error) {
            console.log(`扫描子文件夹失败: ${basePath}`, error.message);
        }

        return files;
    }

    /**
     * 扫描目录
     */
    async scanDirectory(dirPath, extensions = [], patterns = [], olderThanDays = null, maxDepth = 5, currentDepth = 0) {
        const files = [];

        if (currentDepth > maxDepth) return files;

        try {
            const items = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);

                try {
                    if (item.isFile()) {
                        let shouldInclude = true;

                        // 检查扩展名
                        if (extensions.length > 0) {
                            shouldInclude = extensions.some(ext =>
                                item.name.toLowerCase().endsWith(ext.toLowerCase())
                            );
                        }

                        // 检查模式
                        if (patterns.length > 0 && !shouldInclude) {
                            shouldInclude = patterns.some(pattern => {
                                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
                                return regex.test(item.name);
                            });
                        }

                        // 如果没有指定扩展名和模式,包含所有文件
                        if (extensions.length === 0 && patterns.length === 0) {
                            shouldInclude = true;
                        }

                        if (shouldInclude) {
                            const stats = fs.statSync(fullPath);

                            // 检查文件年龄
                            if (olderThanDays) {
                                const fileAge = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                                if (fileAge < olderThanDays) continue;
                            }

                            files.push({
                                path: fullPath,
                                name: item.name,
                                size: stats.size,
                                modified: stats.mtime
                            });
                        }
                    } else if (item.isDirectory()) {
                        const subFiles = await this.scanDirectory(fullPath, extensions, patterns, olderThanDays, maxDepth, currentDepth + 1);
                        files.push(...subFiles);
                    }
                } catch (e) {
                    // 忽略单个文件的访问错误
                }
            }
        } catch (error) {
            console.log(`扫描目录失败: ${dirPath}`, error.message);
        }

        return files;
    }

    /**
     * 清理垃圾文件
     */
    async cleanJunkFiles(categories, progressCallback) {
        let totalDeleted = 0;
        let totalSize = 0;
        let errors = [];
        let processed = 0;

        // 收集所有要删除的文件
        const allFiles = [];
        for (const categoryKey of categories) {
            const category = this.junkCategories[categoryKey];
            if (!category) continue;

            // 重新扫描获取最新文件列表
            for (const scanPath of category.paths || []) {
                try {
                    if (!fs.existsSync(scanPath)) continue;

                    let files;
                    if (category.subfolders) {
                        files = await this.scanWithSubfolders(scanPath, category.subfolders, category.extensions, category.patterns);
                    } else {
                        files = await this.scanDirectory(
                            scanPath,
                            category.extensions || [],
                            category.patterns || [],
                            category.olderThanDays
                        );
                    }
                    allFiles.push(...files);
                } catch (error) {
                    errors.push({ path: scanPath, error: error.message });
                }
            }
        }

        const totalFiles = allFiles.length;

        // 删除文件
        for (const file of allFiles) {
            try {
                fs.unlinkSync(file.path);
                totalDeleted++;
                totalSize += file.size;
            } catch (e) {
                // 尝试删除只读文件
                try {
                    fs.chmodSync(file.path, 0o666);
                    fs.unlinkSync(file.path);
                    totalDeleted++;
                    totalSize += file.size;
                } catch (e2) {
                    errors.push({ path: file.path, error: e2.message });
                }
            }

            processed++;
            if (progressCallback && processed % 10 === 0) {
                progressCallback({
                    current: processed,
                    total: totalFiles,
                    file: file.name,
                    percentage: Math.round((processed / totalFiles) * 100)
                });
            }
        }

        return {
            deletedCount: totalDeleted,
            freedSize: totalSize,
            freedSizeFormatted: this.formatSize(totalSize),
            errors: errors
        };
    }

    /**
     * 清理指定的文件列表
     */
    async cleanSelectedFiles(filePaths, progressCallback) {
        let totalDeleted = 0;
        let totalSize = 0;
        let errors = [];
        let processed = 0;
        const totalFiles = filePaths.length;

        for (const filePath of filePaths) {
            try {
                const stats = fs.statSync(filePath);
                fs.unlinkSync(filePath);
                totalDeleted++;
                totalSize += stats.size;
            } catch (e) {
                try {
                    const stats = fs.statSync(filePath);
                    fs.chmodSync(filePath, 0o666);
                    fs.unlinkSync(filePath);
                    totalDeleted++;
                    totalSize += stats.size;
                } catch (e2) {
                    errors.push({ path: filePath, error: e2.message });
                }
            }

            processed++;
            if (progressCallback && processed % 5 === 0) {
                progressCallback({
                    current: processed,
                    total: totalFiles,
                    file: path.basename(filePath),
                    percentage: Math.round((processed / totalFiles) * 100)
                });
            }
        }

        return {
            deletedCount: totalDeleted,
            freedSize: totalSize,
            freedSizeFormatted: this.formatSize(totalSize),
            errors: errors
        };
    }

    /**
     * 获取类别分组
     */
    getCategoryGroups() {
        return this.categoryGroups;
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

module.exports = { CleanerService };
