const fs = require('fs');
const path = require('path');
const os = require('os');
const { PlatformAdapter } = require('./platformAdapter');

class FileScannerService {
    constructor() {
        this.platform = new PlatformAdapter();
        this.userHome = os.homedir();
        this.abortScan = false;

        // 详细的文件类型定义
        this.fileTypes = {
            video: {
                name: '视频文件',
                icon: '🎬',
                color: '#ef4444',
                extensions: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.rmvb', '.rm', '.ts', '.vob']
            },
            audio: {
                name: '音频文件',
                icon: '🎵',
                color: '#8b5cf6',
                extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.ape', '.aiff', '.opus']
            },
            image: {
                name: '图片文件',
                icon: '🖼️',
                color: '#10b981',
                extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.psd', '.raw', '.tiff', '.tif', '.svg', '.webp', '.ico', '.heic', '.heif']
            },
            document: {
                name: '文档文件',
                icon: '📄',
                color: '#3b82f6',
                extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp', '.pages', '.numbers', '.key', '.epub', '.mobi']
            },
            archive: {
                name: '压缩文件',
                icon: '📦',
                color: '#f59e0b',
                extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso', '.dmg', '.cab', '.arj', '.lzh', '.tgz']
            },
            installer: {
                name: '安装程序',
                icon: '💿',
                color: '#ec4899',
                extensions: ['.exe', '.msi', '.msix', '.appx', '.deb', '.rpm', '.pkg']
            },
            database: {
                name: '数据库文件',
                icon: '🗄️',
                color: '#06b6d4',
                extensions: ['.db', '.sqlite', '.sqlite3', '.mdf', '.ldf', '.accdb', '.mdb', '.sql']
            },
            code: {
                name: '代码/开发',
                icon: '👨‍💻',
                color: '#64748b',
                extensions: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.jar', '.war', '.dll', '.so', '.node']
            },
            virtual: {
                name: '虚拟机/镜像',
                icon: '💻',
                color: '#0ea5e9',
                extensions: ['.vmdk', '.vdi', '.vhd', '.vhdx', '.qcow2', '.img', '.wim', '.esd']
            },
            backup: {
                name: '备份文件',
                icon: '💾',
                color: '#84cc16',
                extensions: ['.bak', '.backup', '.old', '.orig', '.tmp', '.temp', '.cache']
            },
            game: {
                name: '游戏资源',
                icon: '🎮',
                color: '#a855f7',
                extensions: ['.pak', '.asset', '.unity3d', '.upk', '.vpk', '.wad', '.gcf', '.ncf']
            },
            log: {
                name: '日志文件',
                icon: '📝',
                color: '#78716c',
                extensions: ['.log', '.logs', '.trace', '.etl', '.evtx', '.dmp']
            },
            other: {
                name: '其他文件',
                icon: '📁',
                color: '#9ca3af',
                extensions: []
            }
        };

        // 预定义的扫描目录（常见大文件位置）
        const commonDirs = this.platform.getCommonDirs();
        this.commonLargeFileLocations = [
            { path: commonDirs.downloads, name: '下载目录' },
            { path: commonDirs.documents, name: '文档目录' },
            { path: commonDirs.desktop, name: '桌面' },
            { path: commonDirs.videos, name: '视频目录' },
            { path: commonDirs.pictures, name: '图片目录' },
            { path: commonDirs.music, name: '音乐目录' }
        ];

        if (this.platform.isWindows) {
            this.commonLargeFileLocations.push(
                { path: commonDirs.appData, name: '应用数据' },
                { path: commonDirs.programFiles, name: 'Program Files' },
                { path: commonDirs.programFilesX86, name: 'Program Files (x86)' }
            );
        } else if (this.platform.isMac) {
            this.commonLargeFileLocations.push(
                { path: commonDirs.library, name: '资源库' },
                { path: commonDirs.applications, name: '应用程序' }
            );
        }
    }

    /**
     * 扫描大文件
     * @param {Object} options - 扫描选项
     * @param {string} options.targetDrive - 目标驱动器，如 'C:'
     * @param {number} options.minSize - 最小文件大小（MB）
     * @param {number} options.maxDepth - 最大扫描深度
     * @param {string[]} options.excludePaths - 排除路径
     * @param {string} options.fileTypeFilter - 文件类型过滤
     * @param {Function} progressCallback - 进度回调
     */
    async scanLargeFiles(options, progressCallback) {
        const {
            targetDrive = 'C:',
            minSize = 100,
            maxDepth = 15,
            excludePaths = [],
            fileTypeFilter = null
        } = options;

        this.abortScan = false;
        const minSizeBytes = minSize * 1024 * 1024;
        const largeFiles = [];

        // 默认排除的系统路径
        const systemExcludes = this.platform.getSystemExcludePaths();
        const defaultExcludes = [
            ...systemExcludes,
            'node_modules',
            '.git',
            '__pycache__',
            'venv',
            '.venv',
            '.npm',
            '.yarn',
            '.cache'
        ];

        const allExcludes = [...defaultExcludes, ...excludePaths];

        let scannedCount = 0;
        let scannedDirs = 0;
        let lastProgressUpdate = Date.now();

        const scanDir = async (dirPath, depth = 0) => {
            if (this.abortScan || depth > maxDepth) return;

            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });

                for (const item of items) {
                    if (this.abortScan) break;

                    const fullPath = path.join(dirPath, item.name);

                    // 检查是否在排除列表中
                    const shouldExclude = allExcludes.some(exclude => {
                        const normalizedExclude = exclude.replace(/\\/g, '/').toLowerCase();
                        const normalizedFullPath = fullPath.replace(/\\/g, '/').toLowerCase();
                        const normalizedStartPath = startPath.replace(/\\/g, '/').toLowerCase();

                        // 如果当前路径等于排除路径，或者是在排除路径之下
                        if (normalizedFullPath === normalizedExclude || normalizedFullPath.startsWith(normalizedExclude + '/')) {
                            // 只有当我们的扫描起点不在排除路径之下时，才执行排除
                            if (!normalizedStartPath.startsWith(normalizedExclude)) {
                                return true;
                            }
                        }
                        return false;
                    });

                    if (shouldExclude) continue;

                    try {
                        if (item.isFile()) {
                            scannedCount++;
                            const stats = fs.statSync(fullPath);

                            if (stats.size >= minSizeBytes) {
                                const ext = path.extname(item.name).toLowerCase();
                                const fileType = this.getFileType(ext);

                                // 文件类型过滤
                                if (fileTypeFilter && fileType !== fileTypeFilter) continue;

                                largeFiles.push({
                                    path: fullPath,
                                    name: item.name,
                                    size: stats.size,
                                    sizeFormatted: this.formatSize(stats.size),
                                    extension: ext,
                                    type: fileType,
                                    typeInfo: this.fileTypes[fileType],
                                    modified: stats.mtime,
                                    modifiedFormatted: this.formatDate(stats.mtime),
                                    directory: path.dirname(fullPath)
                                });

                                // 保持列表大小可控
                                if (largeFiles.length > 1000) {
                                    largeFiles.sort((a, b) => b.size - a.size);
                                    largeFiles.length = 800;
                                }
                            }

                            // 限制进度更新频率
                            const now = Date.now();
                            if (now - lastProgressUpdate > 200 && progressCallback) {
                                lastProgressUpdate = now;
                                progressCallback({
                                    scannedFiles: scannedCount,
                                    scannedDirs: scannedDirs,
                                    currentPath: this.truncatePath(dirPath, 60),
                                    foundLargeFiles: largeFiles.length
                                });
                            }
                        } else if (item.isDirectory()) {
                            scannedDirs++;
                            await scanDir(fullPath, depth + 1);
                        }
                    } catch (e) {
                        // 忽略单个文件的访问错误
                    }
                }
            } catch (error) {
                // 忽略目录访问错误
            }
        };

        // 开始扫描
        const startPath = this.platform.isWindows ? targetDrive + '\\' : targetDrive;

        try {
            // 先扫描用户常用目录
            const userPaths = this.commonLargeFileLocations
                .filter(loc => {
                    if (this.platform.isWindows) {
                        return loc.path.toUpperCase().startsWith(targetDrive.toUpperCase());
                    }
                    return loc.path.startsWith(targetDrive);
                })
                .map(loc => loc.path);

            for (const priorityPath of userPaths) {
                if (this.abortScan) break;
                if (fs.existsSync(priorityPath)) {
                    await scanDir(priorityPath, 0);
                }
            }

            // 然后扫描根目录下的其他文件夹
            if (!this.abortScan) {
                await scanDir(startPath, 0);
            }
        } catch (error) {
            console.error('扫描错误:', error);
        }

        // 最终排序
        largeFiles.sort((a, b) => b.size - a.size);

        // 分析文件类型分布
        const typeStats = this.analyzeFileTypes(largeFiles);

        // 分析目录分布
        const directoryStats = this.analyzeDirectories(largeFiles);

        return {
            files: largeFiles,
            totalSize: largeFiles.reduce((sum, f) => sum + f.size, 0),
            totalSizeFormatted: this.formatSize(largeFiles.reduce((sum, f) => sum + f.size, 0)),
            fileCount: largeFiles.length,
            scannedFiles: scannedCount,
            scannedDirs: scannedDirs,
            typeStats: typeStats,
            directoryStats: directoryStats
        };
    }

    /**
     * 获取目录树映射 (用于 TreeMap 视觉化)
     */
    async getFolderTreeMap(targetPath, maxDepth = 3) {
        this.abortScan = false;

        const buildNode = async (currentPath, depth = 0) => {
            if (this.abortScan || depth > maxDepth) return null;

            const name = path.basename(currentPath) || currentPath;
            const node = {
                name: name,
                path: currentPath,
                children: [],
                size: 0,
                type: 'directory'
            };

            try {
                const items = fs.readdirSync(currentPath, { withFileTypes: true });

                for (const item of items) {
                    if (this.abortScan) break;
                    const fullPath = path.join(currentPath, item.name);

                    if (item.isDirectory()) {
                        // 排除系统目录
                        const systemExcludes = this.platform.getSystemExcludePaths();
                        const shouldExclude = systemExcludes.some(exclude => {
                            const normalizedExclude = exclude.replace(/\\/g, '/').toLowerCase();
                            const normalizedFullPath = fullPath.replace(/\\/g, '/').toLowerCase();
                            const normalizedTargetPath = targetPath.replace(/\\/g, '/').toLowerCase();

                            if (normalizedFullPath === normalizedExclude || normalizedFullPath.startsWith(normalizedExclude + '/')) {
                                if (!normalizedTargetPath.startsWith(normalizedExclude)) {
                                    return true;
                                }
                            }
                            return false;
                        });
                        if (shouldExclude) continue;

                        const childNode = await buildNode(fullPath, depth + 1);
                        if (childNode) {
                            node.children.push(childNode);
                            node.size += childNode.size;
                        }
                    } else if (item.isFile()) {
                        try {
                            const stats = fs.statSync(fullPath);
                            node.size += stats.size;
                            // 只有在较浅层级才添加文件节点，否则会导致数据量过大
                            if (depth < maxDepth) {
                                node.children.push({
                                    name: item.name,
                                    path: fullPath,
                                    size: stats.size,
                                    type: 'file',
                                    extension: path.extname(item.name).toLowerCase()
                                });
                            }
                        } catch (e) { }
                    }
                }
            } catch (error) {
                // 无法读取目录
            }

            // 格式化大小并排序
            node.value = node.size; // 用于 TreeMap 算法的权重
            node.sizeFormatted = this.formatSize(node.size);
            node.children.sort((a, b) => b.size - a.size);

            return node;
        };

        return await buildNode(targetPath);
    }

    /**
     * 获取文件类型
     */
    getFileType(extension) {
        for (const [type, config] of Object.entries(this.fileTypes)) {
            if (config.extensions.includes(extension)) {
                return type;
            }
        }
        return 'other';
    }

    /**
     * 分析文件类型分布
     */
    analyzeFileTypes(files) {
        const stats = {};

        for (const [type, config] of Object.entries(this.fileTypes)) {
            stats[type] = {
                ...config,
                files: [],
                totalSize: 0,
                count: 0,
                percentage: 0
            };
        }

        const totalSize = files.reduce((sum, f) => sum + f.size, 0);

        for (const file of files) {
            const type = file.type || 'other';
            if (stats[type]) {
                stats[type].files.push(file);
                stats[type].totalSize += file.size;
                stats[type].count++;
            }
        }

        // 计算百分比并格式化大小
        for (const type of Object.keys(stats)) {
            stats[type].totalSizeFormatted = this.formatSize(stats[type].totalSize);
            stats[type].percentage = totalSize > 0
                ? Math.round((stats[type].totalSize / totalSize) * 100)
                : 0;
        }

        return stats;
    }

    /**
     * 分析目录分布
     */
    analyzeDirectories(files) {
        const dirMap = {};

        for (const file of files) {
            const dir = file.directory;
            if (!dirMap[dir]) {
                dirMap[dir] = {
                    path: dir,
                    files: [],
                    totalSize: 0,
                    count: 0
                };
            }
            dirMap[dir].files.push(file);
            dirMap[dir].totalSize += file.size;
            dirMap[dir].count++;
        }

        // 转换为数组并排序
        const dirStats = Object.values(dirMap)
            .map(d => ({
                ...d,
                totalSizeFormatted: this.formatSize(d.totalSize)
            }))
            .sort((a, b) => b.totalSize - a.totalSize)
            .slice(0, 20); // 只返回前20个目录

        return dirStats;
    }

    /**
     * 按类型获取文件
     */
    getFilesByType(files, type) {
        return files.filter(f => f.type === type);
    }

    /**
     * 获取文件类型定义
     */
    getFileTypes() {
        return this.fileTypes;
    }

    /**
     * 删除文件
     */
    async deleteFiles(filePaths, progressCallback) {
        let deleted = 0;
        let freedSize = 0;
        const errors = [];

        for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            try {
                const stats = fs.statSync(filePath);
                fs.unlinkSync(filePath);
                deleted++;
                freedSize += stats.size;
            } catch (error) {
                errors.push({ path: filePath, error: error.message });
            }

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: filePaths.length,
                    file: path.basename(filePath),
                    percentage: Math.round(((i + 1) / filePaths.length) * 100)
                });
            }
        }

        return {
            deletedCount: deleted,
            freedSize: freedSize,
            freedSizeFormatted: this.formatSize(freedSize),
            errors: errors
        };
    }

    /**
     * 获取目录大小
     */
    async getDirectorySize(dirPath) {
        let totalSize = 0;

        const walkDir = (currentPath) => {
            try {
                const items = fs.readdirSync(currentPath, { withFileTypes: true });
                for (const item of items) {
                    const fullPath = path.join(currentPath, item.name);
                    try {
                        if (item.isFile()) {
                            const stats = fs.statSync(fullPath);
                            totalSize += stats.size;
                        } else if (item.isDirectory()) {
                            walkDir(fullPath);
                        }
                    } catch (e) {
                        // 忽略错误
                    }
                }
            } catch (e) {
                // 忽略错误
            }
        };

        walkDir(dirPath);
        return totalSize;
    }

    /**
     * 获取磁盘信息
     */
    async getDiskInfo() {
        const drives = [];
        const availableDrives = this.platform.getAvailableDrives();

        for (const drivePath of availableDrives) {
            try {
                const stats = fs.statfsSync(drivePath);
                const total = stats.blocks * stats.bsize;
                const free = stats.bfree * stats.bsize;
                const used = total - free;

                const driveInfo = {
                    letter: this.platform.isWindows ? drivePath.replace(':', '') : (drivePath === '/' ? '/' : path.basename(drivePath)),
                    path: drivePath,
                    total: total,
                    free: free,
                    used: used,
                    usedPercentage: Math.round((used / total) * 100),
                    totalFormatted: this.formatSize(total),
                    freeFormatted: this.formatSize(free),
                    usedFormatted: this.formatSize(used)
                };

                // macOS 特殊处理：获取卷名称
                if (this.platform.isMac) {
                    if (drivePath === '/') {
                        driveInfo.name = 'Macintosh HD';
                    } else if (drivePath.startsWith('/Volumes/')) {
                        driveInfo.name = path.basename(drivePath);
                    }
                }

                drives.push(driveInfo);
            } catch (e) {
                // 驱动器不存在或无法访问
            }
        }

        return drives;
    }

    /**
     * 停止扫描
     */
    stopScan() {
        this.abortScan = true;
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

    /**
     * 格式化日期
     */
    formatDate(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * 截断路径
     */
    truncatePath(pathStr, maxLength) {
        if (pathStr.length <= maxLength) return pathStr;
        const start = pathStr.substring(0, 20);
        const end = pathStr.substring(pathStr.length - (maxLength - 23));
        return `${start}...${end}`;
    }
}

module.exports = { FileScannerService };
