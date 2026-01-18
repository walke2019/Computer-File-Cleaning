# 跨平台支持文档

## 概述

智能文件整理助手现已支持 Windows 和 macOS 两大平台，通过 `PlatformAdapter` 实现统一的跨平台接口。

## 平台适配器 (PlatformAdapter)

### 核心功能

`src/services/platformAdapter.js` 提供了以下跨平台能力：

#### 1. 平台检测
```javascript
const platform = new PlatformAdapter();
console.log(platform.isWindows);  // Windows 系统返回 true
console.log(platform.isMac);      // macOS 系统返回 true
console.log(platform.getPlatformName());  // "Windows" 或 "macOS"
console.log(platform.getPlatformIcon());  // "🪟" 或 "🍎"
```

#### 2. 系统目录获取
```javascript
// 获取临时目录
platform.getTempDirs()
// Windows: ['C:\\Windows\\Temp', ...]
// macOS: ['/tmp', '/var/tmp', ...]

// 获取常用目录
const dirs = platform.getCommonDirs()
// 返回: { downloads, documents, desktop, pictures, videos, music, ... }
```

#### 3. 应用数据目录
```javascript
// 获取应用数据目录
platform.getAppDataDir('MyApp')
// Windows: C:\Users\xxx\AppData\Local\MyApp
// macOS: /Users/xxx/Library/Application Support/MyApp

// 获取应用缓存目录
platform.getAppCacheDir('MyApp')
// Windows: C:\Users\xxx\AppData\Local\MyApp\Cache
// macOS: /Users/xxx/Library/Caches/MyApp
```

#### 4. 浏览器缓存
```javascript
platform.getBrowserCacheDirs('chrome')
// 返回 Chrome 浏览器在当前平台的缓存目录数组
```

#### 5. 开发工具缓存
```javascript
platform.getDevToolCacheDirs('npm')
// 返回 NPM 在当前平台的缓存目录
```

#### 6. 社交软件目录
```javascript
platform.getSocialAppDirs('wechat')
// 返回微信在当前平台的数据目录
```

## 平台差异对照表

### 系统目录

| 功能 | Windows | macOS |
|------|---------|-------|
| 临时目录 | `C:\Windows\Temp` | `/tmp`, `/var/tmp` |
| 用户临时 | `%LOCALAPPDATA%\Temp` | `~/Library/Caches` |
| 应用数据 | `%LOCALAPPDATA%` | `~/Library/Application Support` |
| 应用缓存 | `%LOCALAPPDATA%\Cache` | `~/Library/Caches` |
| 系统日志 | `C:\Windows\Logs` | `/var/log`, `~/Library/Logs` |

### 浏览器缓存

| 浏览器 | Windows | macOS |
|--------|---------|-------|
| Chrome | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache` | `~/Library/Caches/Google/Chrome/Default/Cache` |
| Edge | `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache` | `~/Library/Caches/Microsoft Edge/Default/Cache` |
| Firefox | `%LOCALAPPDATA%\Mozilla\Firefox\Profiles` | `~/Library/Caches/Firefox/Profiles` |
| Safari | - | `~/Library/Caches/com.apple.Safari` |

### 开发工具

| 工具 | Windows | macOS |
|------|---------|-------|
| NPM | `%LOCALAPPDATA%\npm-cache` | `~/.npm` |
| Yarn | `%LOCALAPPDATA%\Yarn\Cache` | `~/Library/Caches/Yarn` |
| pip | `%LOCALAPPDATA%\pip\cache` | `~/Library/Caches/pip` |
| VS Code | `%APPDATA%\Code\Cache` | `~/Library/Caches/com.microsoft.VSCode` |

### 社交软件

| 应用 | Windows | macOS |
|------|---------|-------|
| 微信 | `%USERPROFILE%\Documents\WeChat Files` | `~/Library/Containers/com.tencent.xinWeChat` |
| QQ | `%USERPROFILE%\Documents\Tencent Files` | `~/Library/Containers/com.tencent.qq` |
| Telegram | `%APPDATA%\Telegram Desktop` | `~/Library/Application Support/Telegram Desktop` |
| Discord | `%APPDATA%\discord` | `~/Library/Application Support/discord` |

## 磁盘管理

### Windows
- 支持多驱动器：C:, D:, E:, F:, G:, H:
- 默认扫描驱动器：C:
- 驱动器格式：`C:\`

### macOS
- 单一根目录：`/`
- 挂载的卷位于：`/Volumes/`
- 默认扫描驱动器：`/`

## 系统排除路径

### Windows
```javascript
[
  'Windows\\WinSxS',
  'Windows\\System32',
  'Windows\\SysWOW64',
  '$Recycle.Bin',
  'System Volume Information',
  'Recovery',
  'PerfLogs'
]
```

### macOS
```javascript
[
  '/System',
  '/Library/System',
  '/private/var/vm',
  '/.Spotlight-V100',
  '/.fseventsd',
  '/.Trashes'
]
```

## 使用示例

### 在服务中使用

```javascript
const { PlatformAdapter } = require('./platformAdapter');

class MyService {
    constructor() {
        this.platform = new PlatformAdapter();
    }

    getCacheDirs() {
        if (this.platform.isWindows) {
            return ['C:\\Windows\\Temp'];
        } else if (this.platform.isMac) {
            return ['/tmp'];
        }
        return [];
    }

    // 或者直接使用适配器方法
    getCacheDirsSimple() {
        return this.platform.getTempDirs();
    }
}
```

### 条件功能启用

```javascript
// 在 cleaner.js 中
prefetch: {
    name: '预读取数据',
    icon: '⚡',
    category: 'system',
    description: 'Windows 程序预读取缓存',
    paths: this.platform.isWindows ? ['C:\\Windows\\Prefetch'] : [],
    extensions: ['.pf'],
    safeToClean: true,
    enabled: this.platform.isWindows  // 仅在 Windows 上启用
}
```

## 打包配置

### package.json

```json
{
  "build": {
    "win": {
      "target": ["portable"],
      "arch": ["x64"]
    },
    "mac": {
      "target": ["dmg"],
      "arch": ["x64", "arm64"]  // 支持 Intel 和 Apple Silicon
    }
  }
}
```

### 打包命令

```bash
# Windows 版本
npm run build:win

# macOS 版本
npm run build:mac

# 所有平台
npm run build:all
```

## 测试建议

### Windows 测试
1. 测试多驱动器扫描
2. 测试管理员权限提升
3. 测试 Windows 特有功能（预读取、注册表缓存等）

### macOS 测试
1. 测试 Intel 和 Apple Silicon 兼容性
2. 测试系统权限请求
3. 测试 macOS 特有功能（系统日志、诊断报告等）

### 通用测试
1. 测试所有跨平台功能
2. 测试路径分隔符处理
3. 测试文件系统权限
4. 测试大文件扫描性能

## 注意事项

1. **路径分隔符**：使用 `path.join()` 而不是硬编码 `\` 或 `/`
2. **权限管理**：macOS 需要用户授权访问某些目录
3. **文件系统差异**：注意大小写敏感性（macOS 默认不区分大小写）
4. **系统 API**：某些 Node.js API 在不同平台上行为可能不同

## 未来扩展

- [ ] Linux 支持
- [ ] 更多浏览器支持（Brave, Opera GX 等）
- [ ] 云存储清理（OneDrive, iCloud 等）
- [ ] 游戏平台缓存（Steam, Epic 等）
