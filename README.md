# 智能文件整理助手 🧠✨

一款跨平台的 AI 智能文件整理工具，支持 Windows 和 macOS，帮助您深度清理系统垃圾、智能管理文件、释放磁盘空间。

![Windows](https://img.shields.io/badge/Windows-10%2F11-blue)
![macOS](https://img.shields.io/badge/macOS-12%2B-black)
![Electron](https://img.shields.io/badge/Electron-40.0-47848F)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 核心特性

### 🤖 AI 智能分析
- **智能清理建议** - AI 分析系统状态，给出个性化清理建议
- **文件重要性评分** - 自动评估文件重要程度，避免误删
- **磁盘使用预测** - 预测磁盘空间使用趋势
- **智能文件分类** - 自动识别并分类不同类型的文件

### 🗑️ 垃圾文件清理

跨平台支持，智能识别 30+ 种垃圾文件：

#### 系统垃圾
| 类别 | Windows | macOS |
|------|---------|-------|
| 系统临时文件 | ✅ | ✅ |
| 用户临时文件 | ✅ | ✅ |
| 系统更新缓存 | ✅ | ✅ |
| 缩略图缓存 | ✅ | ✅ |
| 预读取数据 | ✅ | - |
| 最近文件记录 | ✅ | ✅ |
| 错误报告 | ✅ | ✅ |
| 系统日志 | ✅ | ✅ |

#### 浏览器缓存
- **Google Chrome** - 缓存、代码缓存、GPU 缓存
- **Microsoft Edge** - 缓存、代码缓存
- **Firefox** - 缓存文件
- **Safari** (macOS) - 缓存和本地存储

#### 社交通讯软件
- **微信** 💬 - 临时文件、用户缓存（跨平台）
- **QQ** 🐧 - 临时文件、日志（跨平台）
- **Telegram** ✈️ - 缓存文件（跨平台）
- **Discord** 🎮 - 缓存、代码缓存（跨平台）

#### 开发工具
- **NPM** 📦 - 包管理器缓存（跨平台）
- **Yarn** 🧶 - 包管理器缓存（跨平台）
- **pip** 🐍 - Python 包缓存（跨平台）
- **Gradle** 🐘 - 构建缓存（跨平台）
- **Maven** ☕ - 本地仓库缓存（跨平台）
- **VS Code** 💻 - 缓存、日志（跨平台）

### 📊 大文件管理

智能扫描磁盘大文件，按类型分类统计：

| 文件类型 | 扩展名 |
|---------|--------|
| 🎬 视频文件 | .mp4, .avi, .mkv, .mov, .wmv... |
| 🎵 音频文件 | .mp3, .wav, .flac, .aac... |
| 🖼️ 图片文件 | .jpg, .png, .gif, .psd, .raw... |
| 📄 文档文件 | .pdf, .doc, .docx, .xls, .xlsx... |
| 📦 压缩文件 | .zip, .rar, .7z, .tar, .gz... |

**功能亮点：**
- 可视化文件类型分布图表
- 按大小/日期/名称/类型排序
- 一键打开文件所在目录
- 安全删除（移至回收站）
- 自定义最小文件大小筛选

### 💾 磁盘空间监控

- 实时显示各磁盘使用情况
- 可视化存储占用比例
- 快速定位空间不足的驱动器
- 跨平台支持（Windows 多盘符 / macOS 卷管理）

### 🖥️ 系统信息

- 操作系统版本
- CPU 型号和核心数
- 内存使用情况
- 系统运行时间

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Windows 10/11 或 macOS 12+

### 开发运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm start
```

### 打包发布

```bash
# 打包 Windows 版本
npm run build:win

# 打包 macOS 版本
npm run build:mac

# 打包所有平台
npm run build:all
```

## 📁 项目结构

```
smart-file-organizer/
├── main.js                    # Electron 主进程
├── preload.js                 # 预加载脚本（安全通信桥）
├── package.json               # 项目配置 + 打包配置
├── README.md                  # 项目说明文档
├── assets/                    # 资源文件
│   └── icon.ico/icns          # 应用图标
└── src/
    ├── services/              # 业务服务层
    │   ├── platformAdapter.js # 🆕 跨平台适配器
    │   ├── cleaner.js         # 🗑️ 垃圾清理服务（跨平台）
    │   ├── fileScanner.js     # 📊 大文件扫描服务（跨平台）
    │   ├── advancedCleaner.js # 🔍 高级清理（空文件夹、重复文件）
    │   ├── aiAnalysis.js      # 🤖 AI 智能分析服务
    │   ├── aiChat.js          # 💬 AI 对话服务
    │   └── settings.js        # ⚙️ 设置管理
    └── renderer/              # 渲染进程（前端）
        ├── index.html         # 主页面
        ├── styles.css         # 现代化深色主题样式
        └── renderer.js        # UI 交互逻辑
```

## 🎨 界面预览

- 🌙 现代化深色主题设计
- 📊 可视化文件类型分布图表
- 🏷️ 分组显示垃圾类别
- ⚡ 流畅的动画效果
- 🔔 Toast 通知反馈
- 🖥️ 跨平台原生体验

## 🌍 跨平台支持

### Windows 特性
- 支持多驱动器扫描（C:, D:, E:...）
- Windows 特有的系统清理（预读取、注册表缓存等）
- 管理员权限自动提升

### macOS 特性
- 支持 Intel 和 Apple Silicon (M1/M2/M3)
- macOS 特有的系统清理（系统日志、诊断报告等）
- 原生 DMG 安装包

## ⚠️ 注意事项

1. **管理员权限**：清理系统文件需要管理员权限
2. **谨慎操作**：
   - 垃圾清理操作不可撤销
   - 大文件管理默认移至回收站
   - 带 ⚠️ 标记的类别请谨慎清理
3. **关闭应用**：清理应用缓存前建议关闭相应应用

## 🛠️ 技术栈

- **Electron 40** - 跨平台桌面应用框架
- **Node.js** - 文件系统操作
- **HTML5/CSS3/JavaScript** - 现代化 UI 界面
- **Electron Builder** - 跨平台打包发布

## 📝 更新日志

### v1.0.0
- 🎉 初始版本发布
- ✅ 跨平台支持（Windows + macOS）
- ✅ 支持 30+ 种垃圾文件清理
- ✅ AI 智能分析和建议
- ✅ 支持 12 种大文件类型分类
- ✅ 可视化文件类型分布图表
- ✅ 磁盘空间和系统信息展示

## 📄 许可证

MIT License

---

Made with ❤️ for Windows & macOS Users

## ✨ 功能特性

### 🗑️ 垃圾文件清理

分类整理，一键清理 30+ 种垃圾文件：

#### 系统垃圾
| 类别 | 说明 |
|------|------|
| Windows 临时文件 | 系统 Temp 目录的 .tmp、.log、.bak 等 |
| 用户临时文件 | 用户临时文件、崩溃转储、D3D 缓存 |
| Windows 更新缓存 | 已安装更新的下载文件 |
| 缩略图缓存 | 资源管理器缩略图和图标缓存 |
| 预读取数据 | Prefetch 目录 |
| 最近文件记录 | 最近打开的文件历史 |
| 错误报告 | Windows 错误报告和内存转储 |
| Windows 日志 | 系统安装和更新日志 |

#### 浏览器缓存
- **Google Chrome** - 缓存、代码缓存、GPU 缓存、着色器缓存
- **Microsoft Edge** - 缓存、代码缓存、GPU 缓存
- **Firefox** - 缓存文件
- **Opera / Opera GX** - 缓存文件

#### 社交通讯软件
- **微信** 💬 - 临时文件、用户缓存（不含聊天记录）
- **QQ** 🐧 - 临时文件、日志
- **腾讯会议** 📹 - 缓存和日志
- **钉钉** 💼 - 缓存文件
- **Telegram** ✈️ - 缓存文件
- **Discord** 🎮 - 缓存、代码缓存、GPU 缓存

#### 开发工具
- **NPM** 📦 - 包管理器缓存
- **Yarn** 🧶 - 包管理器缓存
- **pip** 🐍 - Python 包缓存
- **Gradle** 🐘 - 构建缓存
- **Maven** ☕ - 本地仓库缓存
- **VS Code** 💻 - 缓存、日志、扩展缓存
- **JetBrains IDE** 🔨 - IntelliJ/PyCharm/WebStorm 缓存

#### 游戏平台
- **Steam** 🎮 - 下载缓存、网页缓存、着色器缓存
- **Epic Games** 🎯 - 启动器缓存

#### 创意软件
- **Adobe** 🎨 - Premiere、After Effects 等媒体缓存
- **Spotify** 🎵 - 音乐缓存

#### 办公软件
- **Microsoft Office** 📊 - 未保存文件、Office 缓存

### 📊 大文件管理

智能扫描磁盘大文件，按类型分类统计：

| 文件类型 | 扩展名 |
|---------|--------|
| 🎬 视频文件 | .mp4, .avi, .mkv, .mov, .wmv, .flv, .webm... |
| 🎵 音频文件 | .mp3, .wav, .flac, .aac, .ogg, .m4a... |
| 🖼️ 图片文件 | .jpg, .png, .gif, .psd, .raw, .heic... |
| 📄 文档文件 | .pdf, .doc, .docx, .xls, .xlsx, .ppt... |
| 📦 压缩文件 | .zip, .rar, .7z, .tar, .gz, .iso... |
| 💿 安装程序 | .exe, .msi, .msix, .appx... |
| 💻 虚拟机/镜像 | .vmdk, .vdi, .vhd, .wim, .esd... |
| 🎮 游戏资源 | .pak, .asset, .unity3d, .vpk... |
| 🗄️ 数据库文件 | .db, .sqlite, .mdf, .accdb... |
| 👨‍💻 代码/开发 | .jar, .war, .dll, .node... |

**功能亮点：**
- 可视化文件类型分布图表
- 按大小/日期/名称/类型排序
- 一键打开文件所在目录
- 安全删除（移至回收站）
- 自定义最小文件大小筛选

### 💾 磁盘空间监控

- 实时显示各磁盘使用情况
- 可视化存储占用比例
- 快速定位空间不足的驱动器

### 🖥️ 系统信息

- 操作系统版本
- CPU 型号和核心数
- 内存使用情况
- 系统运行时间

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Windows 10/11

### 开发运行

```bash
# 克隆或进入项目目录
cd d:\Tools\windows-cleaner

# 安装依赖
npm install

# 开发模式运行
npm start
```

### 打包发布

```bash
# 打包 Windows 安装版和便携版
npm run build:win
```

打包完成后，安装文件位于 `dist` 目录：
- `Windows清理大师 Setup x.x.x.exe` - 安装版
- `Windows清理大师_便携版_x.x.x.exe` - 便携版（无需安装）

## 📁 项目结构

```
windows-cleaner/
├── main.js                    # Electron 主进程
├── preload.js                 # 预加载脚本（安全通信桥）
├── package.json               # 项目配置 + 打包配置
├── README.md                  # 项目说明文档
├── assets/                    # 资源文件
│   └── icon.ico               # 应用图标
└── src/
    ├── services/              # 业务服务层
    │   ├── cleaner.js         # 🗑️ 垃圾清理服务（30+类别）
    │   └── fileScanner.js     # 📊 大文件扫描服务（12种类型）
    └── renderer/              # 渲染进程（前端）
        ├── index.html         # 主页面
        ├── styles.css         # 现代化深色主题样式
        └── renderer.js        # UI 交互逻辑
```

## 🎨 界面预览

- 🌙 现代化深色主题设计
- 📊 可视化文件类型分布图表
- 🏷️ 分组显示垃圾类别
- ⚡ 流畅的动画效果
- 🔔 Toast 通知反馈

## ⚠️ 注意事项

1. **管理员权限**：清理系统文件需要管理员权限，打包时已配置自动请求提升权限
2. **谨慎操作**：
   - 垃圾清理操作不可撤销
   - 大文件管理默认移至回收站
   - 带 ⚠️ 标记的类别请谨慎清理
3. **关闭应用**：清理应用缓存前建议关闭相应应用（如浏览器、微信等）

## 🛠️ 技术栈

- **Electron 40** - 跨平台桌面应用框架
- **Node.js** - 文件系统操作
- **HTML5/CSS3/JavaScript** - 现代化 UI 界面
- **Electron Builder** - 打包发布

## 📝 更新日志

### v1.0.0
- 🎉 初始版本发布
- ✅ 支持 30+ 种垃圾文件清理
- ✅ 支持微信、QQ、钉钉等国产软件缓存清理
- ✅ 支持 12 种大文件类型分类
- ✅ 可视化文件类型分布图表
- ✅ 磁盘空间和系统信息展示
- ✅ 支持打包为 Windows 安装版和便携版

## 📄 许可证

MIT License

---

Made with ❤️ for Windows Users
