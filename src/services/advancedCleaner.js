const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PlatformAdapter } = require('./platformAdapter');

/**
 * 高级清理服务 - 空文件夹清理、重复文件查找
 */
class AdvancedCleanerService {
    constructor() {
        this.platform = new PlatformAdapter();
        this.abortScan = false;
    }

    /**
     * 扫描空文件夹
     * @param {string} targetPath - 目标路径
     * @param {Function} progressCallback - 进度回调
     */
    async scanEmptyFolders(targetPath, progressCallback) {
        this.abortScan = false;
        const emptyFolders = [];
        let scannedCount = 0;

        const isEmptyDir = (dirPath) => {
            try {
                const items = fs.readdirSync(dirPath);

                if (items.length === 0) {
                    return true;
                }

                // 检查是否只包含空子目录
                let allEmpty = true;
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    try {
                        const stat = fs.statSync(fullPath);
                        if (stat.isFile()) {
                            allEmpty = false;
                            break;
                        } else if (stat.isDirectory()) {
                            if (!isEmptyDir(fullPath)) {
                                allEmpty = false;
                                break;
                            }
                        }
                    } catch (e) {
                        allEmpty = false;
                        break;
                    }
                }

                return allEmpty;
            } catch (e) {
                return false;
            }
        };

        const scanDir = async (dirPath, depth = 0) => {
            if (this.abortScan || depth > 20) return;

            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });

                for (const item of items) {
                    if (this.abortScan) break;

                    if (item.isDirectory()) {
                        const fullPath = path.join(dirPath, item.name);
                        scannedCount++;

                        // 排除系统目录
                        const skipDirs = ['$Recycle.Bin', 'System Volume Information', 'Windows', 'node_modules', '.git'];
                        if (skipDirs.some(d => item.name.toLowerCase() === d.toLowerCase())) {
                            continue;
                        }

                        if (isEmptyDir(fullPath)) {
                            emptyFolders.push({
                                path: fullPath,
                                name: item.name,
                                parent: dirPath
                            });
                        } else {
                            await scanDir(fullPath, depth + 1);
                        }

                        if (scannedCount % 50 === 0 && progressCallback) {
                            progressCallback({
                                scannedDirs: scannedCount,
                                foundEmpty: emptyFolders.length,
                                currentPath: fullPath
                            });
                        }
                    }
                }
            } catch (e) {
                // 忽略权限错误
            }
        };

        await scanDir(targetPath);

        return {
            folders: emptyFolders,
            count: emptyFolders.length,
            scannedDirs: scannedCount
        };
    }

    /**
     * 删除空文件夹
     */
    async deleteEmptyFolders(folderPaths, progressCallback) {
        let deleted = 0;
        const errors = [];

        for (let i = 0; i < folderPaths.length; i++) {
            const folderPath = folderPaths[i];
            try {
                // 递归删除空目录
                fs.rmdirSync(folderPath, { recursive: true });
                deleted++;
            } catch (error) {
                errors.push({ path: folderPath, error: error.message });
            }

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: folderPaths.length,
                    percentage: Math.round(((i + 1) / folderPaths.length) * 100)
                });
            }
        }

        return {
            deletedCount: deleted,
            errors: errors
        };
    }

    /**
     * 扫描重复文件
     * @param {Object} options - 扫描选项
     * @param {Function} progressCallback - 进度回调
     */
    async scanDuplicateFiles(options, progressCallback) {
        const {
            targetPath = this.platform.userHome,
            minSize = 1024 * 1024, // 默认 1MB
            useHash = false, // 是否使用文件哈希（更精确但更慢）
            maxDepth = 10
        } = options;

        this.abortScan = false;
        const fileMap = new Map(); // key: size_name 或 hash, value: [files]
        let scannedCount = 0;
        let duplicateGroups = [];

        const scanDir = async (dirPath, depth = 0) => {
            if (this.abortScan || depth > maxDepth) return;

            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });

                for (const item of items) {
                    if (this.abortScan) break;

                    const fullPath = path.join(dirPath, item.name);

                    // 排除特定目录
                    const skipDirs = ['$Recycle.Bin', 'System Volume Information', 'Windows', 'node_modules', '.git', 'AppData'];
                    if (item.isDirectory() && skipDirs.some(d => item.name.toLowerCase() === d.toLowerCase())) {
                        continue;
                    }

                    try {
                        if (item.isFile()) {
                            scannedCount++;
                            const stats = fs.statSync(fullPath);

                            if (stats.size >= minSize) {
                                // 使用 大小+文件名 作为快速匹配键
                                const key = `${stats.size}_${item.name.toLowerCase()}`;

                                if (!fileMap.has(key)) {
                                    fileMap.set(key, []);
                                }

                                fileMap.get(key).push({
                                    path: fullPath,
                                    name: item.name,
                                    size: stats.size,
                                    sizeFormatted: this.formatSize(stats.size),
                                    modified: stats.mtime,
                                    directory: dirPath
                                });
                            }

                            if (scannedCount % 200 === 0 && progressCallback) {
                                progressCallback({
                                    scannedFiles: scannedCount,
                                    currentPath: dirPath,
                                    potentialDuplicates: Array.from(fileMap.values()).filter(arr => arr.length > 1).length
                                });
                            }
                        } else if (item.isDirectory()) {
                            await scanDir(fullPath, depth + 1);
                        }
                    } catch (e) {
                        // 忽略单个文件错误
                    }
                }
            } catch (e) {
                // 忽略目录错误
            }
        };

        await scanDir(targetPath);

        // 筛选出有重复的文件组
        for (const [key, files] of fileMap.entries()) {
            if (files.length > 1) {
                // 如果启用哈希验证，进一步验证文件内容
                if (useHash) {
                    const hashGroups = await this.groupByHash(files);
                    for (const group of hashGroups) {
                        if (group.length > 1) {
                            duplicateGroups.push({
                                key: key,
                                files: group,
                                count: group.length,
                                wastedSize: group.slice(1).reduce((sum, f) => sum + f.size, 0),
                                wastedSizeFormatted: this.formatSize(group.slice(1).reduce((sum, f) => sum + f.size, 0))
                            });
                        }
                    }
                } else {
                    duplicateGroups.push({
                        key: key,
                        files: files,
                        count: files.length,
                        wastedSize: files.slice(1).reduce((sum, f) => sum + f.size, 0),
                        wastedSizeFormatted: this.formatSize(files.slice(1).reduce((sum, f) => sum + f.size, 0))
                    });
                }
            }
        }

        // 按浪费空间排序
        duplicateGroups.sort((a, b) => b.wastedSize - a.wastedSize);

        const totalWasted = duplicateGroups.reduce((sum, g) => sum + g.wastedSize, 0);

        return {
            groups: duplicateGroups.slice(0, 100), // 限制返回数量
            totalGroups: duplicateGroups.length,
            totalWastedSize: totalWasted,
            totalWastedSizeFormatted: this.formatSize(totalWasted),
            scannedFiles: scannedCount
        };
    }

    /**
     * 按文件哈希分组
     */
    async groupByHash(files) {
        const hashMap = new Map();

        for (const file of files) {
            try {
                const hash = await this.getFileHash(file.path);
                if (!hashMap.has(hash)) {
                    hashMap.set(hash, []);
                }
                hashMap.get(hash).push({ ...file, hash });
            } catch (e) {
                // 忽略哈希计算失败的文件
            }
        }

        return Array.from(hashMap.values());
    }

    /**
     * 计算文件哈希（只读取前 1MB）
     */
    getFileHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('md5');
            const stream = fs.createReadStream(filePath, { start: 0, end: 1024 * 1024 });

            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * 删除重复文件（保留每组第一个）
     */
    async deleteDuplicateFiles(groups, keepFirst = true, progressCallback) {
        let deleted = 0;
        let freedSize = 0;
        const errors = [];
        let processed = 0;

        for (const group of groups) {
            const filesToDelete = keepFirst ? group.files.slice(1) : group.files;

            for (const file of filesToDelete) {
                try {
                    fs.unlinkSync(file.path);
                    deleted++;
                    freedSize += file.size;
                } catch (error) {
                    errors.push({ path: file.path, error: error.message });
                }

                processed++;
                if (progressCallback) {
                    progressCallback({
                        current: processed,
                        deleted: deleted,
                        freedSize: this.formatSize(freedSize)
                    });
                }
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
}

module.exports = { AdvancedCleanerService };
