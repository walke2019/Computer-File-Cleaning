const os = require('os');
const path = require('path');

/**
 * 跨平台适配器
 * 提供 Windows 和 macOS 的统一接口
 */
class PlatformAdapter {
    constructor() {
        this.platform = os.platform(); // 'win32', 'darwin', 'linux'
        this.isWindows = this.platform === 'win32';
        this.isMac = this.platform === 'darwin';
        this.isLinux = this.platform === 'linux';
        this.userHome = os.homedir();
    }

    /**
     * 获取系统临时目录
     */
    getTempDirs() {
        if (this.isWindows) {
            return [
                os.tmpdir(),
                'C:\\Windows\\Temp'
            ];
        } else if (this.isMac) {
            return [
                '/tmp',
                '/var/tmp',
                path.join(this.userHome, 'Library/Caches')
            ];
        }
        return ['/tmp', '/var/tmp'];
    }

    /**
     * 获取系统更新缓存目录
     */
    getSystemUpdateDirs() {
        if (this.isWindows) {
            return ['C:\\Windows\\SoftwareDistribution\\Download'];
        } else if (this.isMac) {
            return ['/Library/Updates'];
        }
        return [];
    }

    /**
     * 获取系统日志目录
     */
    getSystemLogDirs() {
        if (this.isWindows) {
            return [
                'C:\\Windows\\Logs',
                'C:\\Windows\\Panther',
                path.join(this.userHome, 'AppData\\Local\\Microsoft\\Windows\\WER')
            ];
        } else if (this.isMac) {
            return [
                '/var/log',
                path.join(this.userHome, 'Library/Logs')
            ];
        }
        return ['/var/log'];
    }

    /**
     * 获取浏览器缓存目录
     */
    getBrowserCacheDirs(browser) {
        const dirs = {
            chrome: this.isWindows
                ? [
                    path.join(this.userHome, 'AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache'),
                    path.join(this.userHome, 'AppData\\Local\\Google\\Chrome\\User Data\\Default\\Code Cache'),
                    path.join(this.userHome, 'AppData\\Local\\Google\\Chrome\\User Data\\Default\\GPUCache')
                ]
                : [
                    path.join(this.userHome, 'Library/Caches/Google/Chrome/Default/Cache'),
                    path.join(this.userHome, 'Library/Caches/Google/Chrome/Default/Code Cache')
                ],
            edge: this.isWindows
                ? [
                    path.join(this.userHome, 'AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cache'),
                    path.join(this.userHome, 'AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Code Cache')
                ]
                : [
                    path.join(this.userHome, 'Library/Caches/Microsoft Edge/Default/Cache')
                ],
            firefox: this.isWindows
                ? [path.join(this.userHome, 'AppData\\Local\\Mozilla\\Firefox\\Profiles')]
                : [path.join(this.userHome, 'Library/Caches/Firefox/Profiles')],
            safari: this.isMac
                ? [
                    path.join(this.userHome, 'Library/Caches/com.apple.Safari'),
                    path.join(this.userHome, 'Library/Safari/LocalStorage')
                ]
                : []
        };
        return dirs[browser] || [];
    }

    /**
     * 获取应用数据目录
     */
    getAppDataDir(appName) {
        if (this.isWindows) {
            return path.join(this.userHome, 'AppData\\Local', appName);
        } else if (this.isMac) {
            return path.join(this.userHome, 'Library/Application Support', appName);
        }
        return path.join(this.userHome, '.config', appName);
    }

    /**
     * 获取应用缓存目录
     */
    getAppCacheDir(appName) {
        if (this.isWindows) {
            return path.join(this.userHome, 'AppData\\Local', appName, 'Cache');
        } else if (this.isMac) {
            return path.join(this.userHome, 'Library/Caches', appName);
        }
        return path.join(this.userHome, '.cache', appName);
    }

    /**
     * 获取常用目录
     */
    getCommonDirs() {
        const base = {
            downloads: path.join(this.userHome, this.isWindows ? 'Downloads' : 'Downloads'),
            documents: path.join(this.userHome, this.isWindows ? 'Documents' : 'Documents'),
            desktop: path.join(this.userHome, this.isWindows ? 'Desktop' : 'Desktop'),
            pictures: path.join(this.userHome, this.isWindows ? 'Pictures' : 'Pictures'),
            videos: path.join(this.userHome, this.isWindows ? 'Videos' : 'Movies'),
            music: path.join(this.userHome, this.isWindows ? 'Music' : 'Music')
        };

        if (this.isWindows) {
            base.appData = path.join(this.userHome, 'AppData');
            base.programFiles = 'C:\\Program Files';
            base.programFilesX86 = 'C:\\Program Files (x86)';
        } else if (this.isMac) {
            base.applications = '/Applications';
            base.library = path.join(this.userHome, 'Library');
        }

        return base;
    }

    /**
     * 获取系统排除路径（不应扫描的目录）
     */
    getSystemExcludePaths() {
        if (this.isWindows) {
            return [
                'Windows\\WinSxS',
                'Windows\\System32',
                'Windows\\SysWOW64',
                '$Recycle.Bin',
                'System Volume Information',
                'Recovery',
                'PerfLogs'
            ];
        } else if (this.isMac) {
            return [
                '/System',
                '/Library/System',
                '/private/var/vm',
                '/.Spotlight-V100',
                '/.fseventsd',
                '/.Trashes',
                '/Volumes'
            ];
        }
        return ['/sys', '/proc', '/dev'];
    }

    /**
     * 获取可用磁盘驱动器
     */
    getAvailableDrives() {
        if (this.isWindows) {
            // Windows: C:, D:, E:, etc.
            return ['C:', 'D:', 'E:', 'F:', 'G:', 'H:'];
        } else if (this.isMac) {
            // macOS: 获取所有本地挂载点，过滤网络磁盘
            try {
                const { execSync } = require('child_process');
                // -l flag for local filesystems only
                const output = execSync('df -l').toString();
                const lines = output.split('\n');
                const drives = new Set(['/']);

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // df output format usually: Filesystem 512-blocks Used Available Capacity iused ifree %iused Mounted on
                    // We need the last column
                    const parts = line.split(/\s+/);
                    const mountPoint = parts[parts.length - 1];

                    if (mountPoint && mountPoint.startsWith('/Volumes/')) {
                        drives.add(mountPoint);
                    }
                }
                return Array.from(drives);
            } catch (e) {
                console.error('获取磁盘列表失败:', e);
                return ['/'];
            }
        }
        return ['/'];
    }

    /**
     * 获取默认扫描驱动器
     */
    getDefaultDrive() {
        if (this.isWindows) {
            return 'C:';
        }
        return '/';
    }

    /**
     * 获取开发工具缓存目录
     */
    getDevToolCacheDirs(tool) {
        const dirs = {
            npm: this.isWindows
                ? [path.join(this.userHome, 'AppData\\Local\\npm-cache')]
                : [path.join(this.userHome, '.npm')],
            yarn: this.isWindows
                ? [path.join(this.userHome, 'AppData\\Local\\Yarn\\Cache')]
                : [path.join(this.userHome, 'Library/Caches/Yarn')],
            pip: this.isWindows
                ? [path.join(this.userHome, 'AppData\\Local\\pip\\cache')]
                : [path.join(this.userHome, 'Library/Caches/pip')],
            gradle: [path.join(this.userHome, '.gradle', 'caches')],
            maven: [path.join(this.userHome, '.m2', 'repository')],
            vscode: this.isWindows
                ? [
                    path.join(this.userHome, 'AppData\\Roaming\\Code\\Cache'),
                    path.join(this.userHome, 'AppData\\Roaming\\Code\\CachedData')
                ]
                : [
                    path.join(this.userHome, 'Library/Caches/com.microsoft.VSCode'),
                    path.join(this.userHome, 'Library/Application Support/Code/Cache')
                ]
        };
        return dirs[tool] || [];
    }

    /**
     * 获取社交软件目录
     */
    getSocialAppDirs(app) {
        const dirs = {
            wechat: this.isWindows
                ? [
                    path.join(this.userHome, 'Documents\\WeChat Files'),
                    path.join(this.userHome, 'AppData\\Roaming\\Tencent\\WeChat')
                ]
                : [
                    path.join(this.userHome, 'Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat')
                ],
            qq: this.isWindows
                ? [
                    path.join(this.userHome, 'Documents\\Tencent Files'),
                    path.join(this.userHome, 'AppData\\Roaming\\Tencent\\QQ')
                ]
                : [
                    path.join(this.userHome, 'Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ')
                ],
            telegram: this.isWindows
                ? [path.join(this.userHome, 'AppData\\Roaming\\Telegram Desktop')]
                : [path.join(this.userHome, 'Library/Application Support/Telegram Desktop')],
            discord: this.isWindows
                ? [path.join(this.userHome, 'AppData\\Roaming\\discord')]
                : [path.join(this.userHome, 'Library/Application Support/discord')]
        };
        return dirs[app] || [];
    }

    /**
     * 格式化路径（统一路径分隔符）
     */
    normalizePath(pathStr) {
        return path.normalize(pathStr);
    }

    /**
     * 获取平台名称（用于显示）
     */
    getPlatformName() {
        if (this.isWindows) return 'Windows';
        if (this.isMac) return 'macOS';
        if (this.isLinux) return 'Linux';
        return 'Unknown';
    }

    /**
     * 获取平台图标
     */
    getPlatformIcon() {
        if (this.isWindows) return '🪟';
        if (this.isMac) return '🍎';
        if (this.isLinux) return '🐧';
        return '💻';
    }
    /**
     * 格式化文件大小
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = { PlatformAdapter };
