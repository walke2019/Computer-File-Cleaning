const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 开发者专项清理服务
 */
class DevCleanerService {
    constructor(platformAdapter) {
        this.platform = platformAdapter;
        this.userHome = os.homedir();

        // 开发者专有的清理项
        this.devCategories = {
            xcodeDerivedData: {
                name: 'Xcode Derived Data',
                icon: '🛠️',
                description: 'Xcode 编译生成的中间文件 (安全清理，下次编译会自动重新生成)',
                paths: [path.join(this.userHome, 'Library/Developer/Xcode/DerivedData')],
                enabled: this.platform.isMac
            },
            xcodeArchives: {
                name: 'Xcode Archives',
                icon: '📦',
                description: 'Xcode 打包历史记录',
                paths: [path.join(this.userHome, 'Library/Developer/Xcode/Archives')],
                enabled: this.platform.isMac
            },
            androidDeviceSupport: {
                name: 'iOS DeviceSupport',
                icon: '📱',
                description: '已连接设备的调试支持文件',
                paths: [path.join(this.userHome, 'Library/Developer/Xcode/iOS DeviceSupport')],
                enabled: this.platform.isMac
            },
            androidStudio: {
                name: 'Android Studio 缓存',
                icon: '🤖',
                description: 'Android Studio 构建缓存和日志',
                paths: this.platform.isWindows
                    ? [path.join(this.userHome, '.android/cache')]
                    : [path.join(this.userHome, 'Library/Caches/Google/AndroidStudio*')]
            },
            dockerImages: {
                name: 'Docker 镜像缓存',
                icon: '🐳',
                description: 'Docker 本地存储数据 (建议手动确认后再清理)',
                paths: this.platform.isWindows
                    ? ['C:\\ProgramData\\DockerDesktop']
                    : [path.join(this.userHome, 'Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw')],
                safeToClean: false
            },
            pythonCaches: {
                name: 'Python 编译缓存',
                icon: '🐍',
                description: '__pycache__ 目录中的 .pyc 文件',
                patterns: ['**/__pycache__/*.pyc'],
                safeToClean: true
            }
        };
    }

    /**
     * 获取支持的开发者工具
     */
    getDevTools() {
        return Object.entries(this.devCategories)
            .filter(([_, value]) => value.enabled !== false)
            .map(([key, value]) => ({ key, ...value }));
    }

    /**
     * 扫描开发者垃圾
     */
    async scan(progressCallback) {
        // 逻辑类似于 CleanerService
        // 但可以针对大目录进行更高效的 size 计算 (du -sh 风格)
    }
}

module.exports = { DevCleanerService };
