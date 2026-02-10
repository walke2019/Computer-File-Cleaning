const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * 智能卸载服务 (macOS 深度清理)
 */
class UninstallerService {
    constructor(platformAdapter) {
        this.platform = platformAdapter;
        this.userHome = os.homedir();
    }

    /**
     * 获取已安装的应用列表
     */
    async getInstalledApps() {
        if (!this.platform.isMac) return [];

        const appDirs = ['/Applications', path.join(this.userHome, 'Applications')];
        const apps = [];

        for (const dir of appDirs) {
            if (!fs.existsSync(dir)) continue;

            try {
                const files = fs.readdirSync(dir);
                const appPromises = files
                    .filter(file => file.endsWith('.app'))
                    .map(async (file) => {
                        try {
                            const appPath = path.join(dir, file);
                            const stats = fs.statSync(appPath);

                            // 获取详细信息
                            const info = this.getAppInfo(appPath);

                            // 获取大小 (使用 du 比较快，但仍然可能有延迟)
                            const size = this.getDirSize(appPath);

                            return {
                                name: file.replace('.app', ''),
                                path: appPath,
                                icon: info.icon,
                                bundleId: info.bundleId,
                                version: info.version,
                                size: size,
                                installDate: stats.birthtime
                            };
                        } catch (e) {
                            return null;
                        }
                    });

                const results = await Promise.all(appPromises);
                apps.push(...results.filter(app => app !== null));
            } catch (error) {
                console.error(`读取应用目录失败: ${dir}`, error);
            }
        }

        return apps.sort((a, b) => b.installDate - a.installDate);
    }

    /**
     * 获取应用的详细信息 (从 Info.plist)
     */
    getAppInfo(appPath) {
        const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
        let bundleId = '';
        let version = '';
        let icon = '';

        if (fs.existsSync(infoPlistPath)) {
            try {
                // 使用 defaults read 命令读取 plist
                // 注意：defaults read 可能会因为特殊的 Info.plist 格式失败，所以放进 try-catch
                try {
                    bundleId = execSync(`defaults read "${infoPlistPath}" CFBundleIdentifier`).toString().trim();
                } catch (e) { /* ignore */ }

                try {
                    version = execSync(`defaults read "${infoPlistPath}" CFBundleShortVersionString`).toString().trim();
                } catch (e) { /* ignore */ }

                try {
                    const iconFile = execSync(`defaults read "${infoPlistPath}" CFBundleIconFile`).toString().trim();
                    if (iconFile) {
                        const iconName = iconFile.endsWith('.icns') ? iconFile : iconFile + '.icns';
                        const iconPath = path.join(appPath, 'Contents', 'Resources', iconName);
                        if (fs.existsSync(iconPath)) {
                            icon = iconPath;
                        }
                    }
                } catch (e) { /* ignore */ }
            } catch (e) {
                // 忽略错误
            }
        }

        return { bundleId, version, icon };
    }

    /**
     * 查找与应用相关的残留文件
     */
    async findRelatedFiles(appPath, bundleId) {
        if (!this.platform.isMac) return [];

        const appName = path.basename(appPath, '.app');
        const relatedFiles = [];

        // 搜索路径模式
        const searchPaths = [
            { base: '~/Library/Application Support', pattern: [bundleId, appName] },
            { base: '~/Library/Caches', pattern: [bundleId, appName] },
            { base: '~/Library/Preferences', pattern: [bundleId, appName] },
            { base: '~/Library/Logs', pattern: [bundleId, appName] },
            { base: '~/Library/Containers', pattern: [bundleId, appName] },
            { base: '~/Library/Cookies', pattern: [bundleId, appName] },
            { base: '~/Library/Saved Application State', pattern: [bundleId, appName] },
            { base: '~/Library/HTTPStorages', pattern: [bundleId, appName] },
            { base: '~/Library/WebKit', pattern: [bundleId, appName] }
        ];

        // 针对 bundleId 的额外搜索
        if (bundleId) {
            searchPaths.push({ base: '~/Library/Preferences/ByHost', pattern: [bundleId] });
            searchPaths.push({ base: '~/Library/Application Support/com.apple.sharedfilelist', pattern: [bundleId] });
        }

        const foundPaths = new Set();

        for (const item of searchPaths) {
            const fullBase = item.base.replace('~', this.userHome);
            if (!fs.existsSync(fullBase)) continue;

            try {
                const entries = fs.readdirSync(fullBase);
                for (const entry of entries) {
                    const lowercaseEntry = entry.toLowerCase();
                    const isMatch = item.pattern.some(p => p && lowercaseEntry.includes(p.toLowerCase()));

                    if (isMatch) {
                        const fullPath = path.join(fullBase, entry);
                        if (foundPaths.has(fullPath)) continue;

                        try {
                            const stats = fs.statSync(fullPath);
                            relatedFiles.push({
                                path: fullPath,
                                name: entry,
                                size: stats.isDirectory() ? this.getDirSize(fullPath) : stats.size,
                                type: stats.isDirectory() ? 'directory' : 'file',
                                category: path.basename(item.base)
                            });
                            foundPaths.add(fullPath);
                        } catch (e) { /* skip */ }
                    }
                }
            } catch (error) {
                // 忽略访问受限的目录
            }
        }

        return relatedFiles;
    }

    /**
     * 计算目录大小
     */
    getDirSize(dirPath) {
        if (this.platform.isMac) {
            try {
                // 使用 du -sk 快速获取目录大小 (单位 KB)，设置 2 秒超时防止卡死
                const output = execSync(`du -sk "${dirPath}"`, { timeout: 2000 }).toString();
                const sizeKB = parseInt(output.split(/\s+/)[0]);
                return sizeKB * 1024;
            } catch (e) {
                // 如果 du 失败或超时，尝试简单的递归或返回 0
                return 0;
            }
        }

        let size = 0;
        try {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                const fullPath = path.join(dirPath, file);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    size += this.getDirSize(fullPath);
                } else {
                    size += stats.size;
                }
            }
        } catch (e) {
            // 忽略错误
        }
        return size;
    }

    /**
     * 卸载应用并清理文件
     * @param {string} appPath 应用路径
     * @param {Array} relatedFiles 关联文件对象数组
     * @param {Function} trashCallback 移至废纸篓的回调 (electron.shell.trashItem)
     */
    async uninstall(appPath, relatedFiles, trashCallback) {
        const results = {
            deleted: [],
            failed: [],
            totalFreed: 0
        };

        // 1. 删除应用本身 (移至废纸篓)
        try {
            // 建议通过 shell.trashItem 在主进程执行，这里先返回路径
            results.deleted.push(appPath);
        } catch (e) {
            results.failed.push({ path: appPath, error: e.message });
        }

        // 2. 删除关联文件
        for (const file of relatedFiles) {
            try {
                if (fs.existsSync(file.path)) {
                    const stats = fs.statSync(file.path);
                    if (stats.isDirectory()) {
                        fs.rmSync(file.path, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(file.path);
                    }
                    results.deleted.push(file.path);
                    results.totalFreed += file.size;
                }
            } catch (e) {
                results.failed.push({ path: file.path, error: e.message });
            }
        }

        return results;
    }
}

module.exports = { UninstallerService };
