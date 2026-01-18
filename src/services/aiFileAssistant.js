const fs = require('fs');
const path = require('path');
const { PlatformAdapter } = require('./platformAdapter');

/**
 * AI 文件助手服务
 * 提供智能文件分析、分类、重命名等功能
 */
class AIFileAssistantService {
    constructor(aiChatService) {
        this.platform = new PlatformAdapter();
        this.aiChat = aiChatService;

        // 支持的文件类型
        this.supportedTypes = {
            text: ['.txt', '.md', '.log', '.json', '.xml', '.csv', '.yaml', '.yml'],
            document: ['.doc', '.docx', '.pdf', '.xls', '.xlsx', '.ppt', '.pptx'],
            code: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php'],
            image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
            video: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'],
            audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a']
        };
    }

    /**
     * 分析文件内容
     */
    async analyzeFile(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const ext = path.extname(filePath).toLowerCase();
            const fileName = path.basename(filePath);

            const analysis = {
                path: filePath,
                name: fileName,
                extension: ext,
                size: stats.size,
                modified: stats.mtime,
                type: this.getFileType(ext),
                content: null,
                analysis: null, // AI 分析结果
                importance: 0
            };

            // 提取内容（仅文本文件）
            let contentPreview = '';
            if (this.supportedTypes.text.includes(ext) && stats.size < 1024 * 1024) {
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    analysis.content = content.substring(0, 5000);
                    contentPreview = '\n\n文件内容预览:\n' + content.substring(0, 1000) + (content.length > 1000 ? '...' : '');
                } catch (e) {
                    console.warn('读取文件内容失败:', e);
                }
            }

            // AI 分析
            if (this.aiChat) {
                try {
                    const prompt = `请分析以下文件:
文件名: ${fileName}
大小: ${this.platform ? this.platform.formatSize(stats.size) : stats.size + ' bytes'}
修改时间: ${stats.mtime.toLocaleString()}
类型: ${analysis.type}${contentPreview}

请详细说明:
1. 这可能是什么文件？用途是什么？
2. 文件的重要性如何？
3. 是否建议保留或删除？/n请用简洁的语言回答。`;

                    const response = await this.aiChat.sendMessage(prompt, []);
                    if (response && response.content) {
                        analysis.analysis = response.content;
                    }
                } catch (e) {
                    console.error('AI 分析请求失败:', e);
                    analysis.analysis = 'AI 分析暂时不可用，请检查网络连接或 API 配置。';
                }
            }

            return analysis;
        } catch (error) {
            console.error('文件分析失败:', error);
            return { error: error.message };
        }
    }

    /**
     * 批量分析文件
     */
    async analyzeFiles(filePaths, progressCallback) {
        const results = [];
        let processed = 0;

        for (const filePath of filePaths) {
            const analysis = await this.analyzeFile(filePath);
            if (analysis) {
                results.push(analysis);
            }

            processed++;
            if (progressCallback) {
                progressCallback({
                    current: processed,
                    total: filePaths.length,
                    file: path.basename(filePath),
                    percentage: Math.round((processed / filePaths.length) * 100)
                });
            }
        }

        return results;
    }

    /**
     * AI 智能分类文件
     */
    async categorizeFiles(files, directoryPath = '') {
        if (!this.aiChat || !files || files.length === 0) {
            return this.basicCategorize(files);
        }

        try {
            // 准备文件信息（限制数量以避免 token 过多）
            const fileInfos = files.slice(0, 100).map(f => ({
                name: f.name || path.basename(f.path),
                extension: f.extension || path.extname(f.path),
                size: f.size,
                type: f.type || this.getFileType(path.extname(f.path))
            }));

            // 从目录路径推断用途
            const folderName = directoryPath ? path.basename(directoryPath) : '';
            const contextHint = this.inferDirectoryPurpose(folderName);

            const prompt = `请分析以下文件列表，为每个文件建议合适的分类目录。

**目录上下文：**
- 当前目录：${directoryPath || '未知'}
- 目录名称：${folderName || '未知'}
- 推断用途：${contextHint}

**文件列表（共 ${files.length} 个文件，显示前 ${fileInfos.length} 个）：**
${JSON.stringify(fileInfos, null, 2)}

请返回 JSON 格式的分类建议，格式如下：
{
  "categories": {
    "分类名1": ["文件1", "文件2"],
    "分类名2": ["文件3"],
    "分类名3": ["文件4", "文件5"]
  },
  "reasoning": "分类理由说明"
}

**分类要求：**
1. **根据目录用途分类**：如果目录名是"小说"，则按小说类型分类（玄幻、科幻、武侠等），而不是按文件格式
2. **分类名称有意义**：使用用户能理解的分类名，如"玄幻小说"而不是"TXT文件"
3. **考虑文件特征**：结合文件名、扩展名、大小等信息
4. **最多 10 个分类**：避免分类过于细碎
5. **每个文件只属于一个分类**：不要重复分类
6. **过滤无关文件**：如果文件明显不属于该目录（如在"小说"目录下的系统文件），归类到"其他/无关文件"

**示例：**
- 目录"小说" → 按小说类型分类：玄幻小说、科幻小说、武侠小说
- 目录"照片" → 按时间/事件分类：2024年旅行、家庭聚会、工作照片
- 目录"文档" → 按用途分类：工作文档、学习资料、个人笔记`;

            const response = await this.aiChat.sendMessage(prompt, []);

            if (response && response.content) {
                // 尝试解析 AI 返回的 JSON
                const jsonMatch = response.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    return this.formatCategories(result.categories, files);
                }
            }
        } catch (error) {
            console.error('AI 分类失败，使用基础分类:', error);
        }

        // 降级到基础分类
        return this.basicCategorize(files);
    }

    /**
     * 推断目录用途
     */
    inferDirectoryPurpose(folderName) {
        const purposes = {
            '小说': '存放小说电子书，应按小说类型（玄幻、科幻、武侠、言情等）分类',
            '电影': '存放电影视频，应按电影类型（动作、科幻、爱情等）或年份分类',
            '音乐': '存放音乐文件，应按歌手、专辑或音乐类型分类',
            '照片': '存放照片，应按时间、事件或人物分类',
            '文档': '存放文档，应按用途（工作、学习、个人）分类',
            '下载': '临时下载文件，应按文件类型或用途分类',
            '项目': '存放项目文件，应按项目名称或技术栈分类',
            '备份': '备份文件，应按备份时间或来源分类'
        };

        for (const [key, purpose] of Object.entries(purposes)) {
            if (folderName.includes(key)) {
                return purpose;
            }
        }

        return '通用文件夹，应根据文件类型和用途智能分类';
    }


    /**
     * AI 调整分类
     */
    async adjustCategorization(files, currentCategories, instruction) {
        if (!this.aiChat) return currentCategories;

        try {
            // 简化文件列表，只保留必要信息
            const fileInfos = files.slice(0, 100).map(f => ({
                name: f.name || path.basename(f.path),
                type: f.type || this.getFileType(path.extname(f.path))
            }));

            const prompt = `
当前分类方案：
${JSON.stringify(currentCategories, null, 2)}

用户调整指令：
"${instruction}"

请根据用户的指令重新对文件进行分类。
如果用户要求改变某个文件的分类，请移动它。
如果用户要求修改分类名称，请修改。
未提及的部分保持原样。

返回格式必须是 JSON：
{
  "categories": {
    "分类名": ["文件名1", "文件名2"]
  },
  "reasoning": "调整理由"
}`;

            const response = await this.aiChat.sendMessage(prompt, []);
            if (response && response.content) {
                const jsonMatch = response.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    return this.formatCategories(result.categories, files);
                }
            }
        } catch (error) {
            console.error('AI 调整分类失败:', error);
        }
        return currentCategories;
    }

    /**
     * 基础分类（不使用 AI）
     */
    basicCategorize(files) {
        const categories = {
            '文档': [],
            '图片': [],
            '视频': [],
            '音频': [],
            '代码': [],
            '压缩包': [],
            '其他': []
        };

        for (const file of files) {
            const ext = (file.extension || path.extname(file.path)).toLowerCase();
            const fileName = file.name || path.basename(file.path);

            if (this.supportedTypes.document.includes(ext) || this.supportedTypes.text.includes(ext)) {
                categories['文档'].push(fileName);
            } else if (this.supportedTypes.image.includes(ext)) {
                categories['图片'].push(fileName);
            } else if (this.supportedTypes.video.includes(ext)) {
                categories['视频'].push(fileName);
            } else if (this.supportedTypes.audio.includes(ext)) {
                categories['音频'].push(fileName);
            } else if (this.supportedTypes.code.includes(ext)) {
                categories['代码'].push(fileName);
            } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
                categories['压缩包'].push(fileName);
            } else {
                categories['其他'].push(fileName);
            }
        }

        // 移除空分类
        Object.keys(categories).forEach(key => {
            if (categories[key].length === 0) {
                delete categories[key];
            }
        });

        return categories;
    }

    /**
     * AI 智能重命名
     */
    async suggestRename(file) {
        if (!this.aiChat) {
            return this.basicRename(file);
        }

        try {
            const fileInfo = {
                currentName: file.name || path.basename(file.path),
                extension: file.extension || path.extname(file.path),
                size: file.size,
                modified: file.modified,
                type: file.type || this.getFileType(path.extname(file.path)),
                content: file.content ? file.content.substring(0, 500) : null
            };

            const prompt = `请为以下文件建议一个更有意义的文件名。

文件信息：
${JSON.stringify(fileInfo, null, 2)}

要求：
1. 文件名要简洁明了，体现文件内容
2. 使用中文或英文，避免特殊字符
3. 保持原有扩展名
4. 长度不超过 50 个字符
5. 返回 JSON 格式：{"suggestedName": "新文件名.扩展名", "reason": "重命名理由"}`;

            const response = await this.aiChat.sendMessage(prompt, []);

            if (response && response.content) {
                const jsonMatch = response.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    return {
                        original: fileInfo.currentName,
                        suggested: result.suggestedName,
                        reason: result.reason
                    };
                }
            }
        } catch (error) {
            console.error('AI 重命名失败，使用基础重命名:', error);
        }

        return this.basicRename(file);
    }

    /**
     * 基础重命名（不使用 AI）
     */
    basicRename(file) {
        const fileName = file.name || path.basename(file.path);
        const ext = file.extension || path.extname(file.path);
        const baseName = path.basename(fileName, ext);

        // 简单的清理：移除特殊字符，添加日期
        const cleaned = baseName
            .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 40);

        const date = new Date(file.modified || Date.now());
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

        return {
            original: fileName,
            suggested: `${cleaned}_${dateStr}${ext}`,
            reason: '清理文件名并添加日期'
        };
    }

    /**
     * 批量重命名建议
     */
    async suggestBatchRename(files, progressCallback) {
        const suggestions = [];
        let processed = 0;

        for (const file of files) {
            const suggestion = await this.suggestRename(file);
            suggestions.push(suggestion);

            processed++;
            if (progressCallback) {
                progressCallback({
                    current: processed,
                    total: files.length,
                    file: file.name || path.basename(file.path),
                    percentage: Math.round((processed / files.length) * 100)
                });
            }
        }

        return suggestions;
    }

    /**
     * 执行重命名
     */
    async executeRename(filePath, newName) {
        try {
            const dir = path.dirname(filePath);
            const newPath = path.join(dir, newName);

            // 检查目标文件是否已存在
            if (fs.existsSync(newPath)) {
                throw new Error('目标文件已存在');
            }

            fs.renameSync(filePath, newPath);
            return { success: true, newPath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 批量执行重命名
     */
    async executeBatchRename(renamePairs, progressCallback) {
        const results = [];
        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        for (const pair of renamePairs) {
            const result = await this.executeRename(pair.oldPath, pair.newName);
            results.push({
                oldPath: pair.oldPath,
                newName: pair.newName,
                ...result
            });

            if (result.success) succeeded++;
            else failed++;

            processed++;
            if (progressCallback) {
                progressCallback({
                    current: processed,
                    total: renamePairs.length,
                    succeeded,
                    failed,
                    percentage: Math.round((processed / renamePairs.length) * 100)
                });
            }
        }

        return {
            total: renamePairs.length,
            succeeded,
            failed,
            results
        };
    }

    /**
     * 创建分类目录结构
     */
    async createCategoryStructure(basePath, categories) {
        const created = [];
        const errors = [];

        for (const category of Object.keys(categories)) {
            const categoryPath = path.join(basePath, category);
            try {
                if (!fs.existsSync(categoryPath)) {
                    fs.mkdirSync(categoryPath, { recursive: true });
                    created.push(categoryPath);
                }
            } catch (error) {
                errors.push({ category, error: error.message });
            }
        }

        return { created, errors };
    }

    /**
     * 移动文件到分类目录
     */
    async moveFilesToCategories(basePath, categorizedFiles, progressCallback) {
        const results = [];
        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        for (const [category, files] of Object.entries(categorizedFiles)) {
            const categoryPath = path.join(basePath, category);

            // 确保目录存在
            if (!fs.existsSync(categoryPath)) {
                fs.mkdirSync(categoryPath, { recursive: true });
            }

            for (const file of files) {
                try {
                    const sourcePath = file.path || file;
                    const fileName = path.basename(sourcePath);
                    const targetPath = path.join(categoryPath, fileName);

                    // 检查目标是否已存在
                    if (fs.existsSync(targetPath)) {
                        // 添加序号
                        const ext = path.extname(fileName);
                        const base = path.basename(fileName, ext);
                        let counter = 1;
                        let newTargetPath = targetPath;

                        while (fs.existsSync(newTargetPath)) {
                            newTargetPath = path.join(categoryPath, `${base}_${counter}${ext}`);
                            counter++;
                        }

                        fs.renameSync(sourcePath, newTargetPath);
                    } else {
                        fs.renameSync(sourcePath, targetPath);
                    }

                    results.push({
                        source: sourcePath,
                        target: targetPath,
                        category,
                        success: true
                    });
                    succeeded++;
                } catch (error) {
                    results.push({
                        source: file.path || file,
                        category,
                        success: false,
                        error: error.message
                    });
                    failed++;
                }

                processed++;
                if (progressCallback) {
                    progressCallback({
                        current: processed,
                        total: Object.values(categorizedFiles).flat().length,
                        succeeded,
                        failed,
                        percentage: Math.round((processed / Object.values(categorizedFiles).flat().length) * 100)
                    });
                }
            }
        }

        return {
            total: processed,
            succeeded,
            failed,
            results
        };
    }

    /**
     * 获取文件类型
     */
    getFileType(ext) {
        ext = ext.toLowerCase();
        for (const [type, extensions] of Object.entries(this.supportedTypes)) {
            if (extensions.includes(ext)) {
                return type;
            }
        }
        return 'other';
    }

    /**
     * 格式化分类结果
     */
    formatCategories(aiCategories, files) {
        const formatted = {};
        const fileMap = new Map(files.map(f => [f.name || path.basename(f.path), f]));

        for (const [category, fileNames] of Object.entries(aiCategories)) {
            formatted[category] = fileNames
                .map(name => fileMap.get(name))
                .filter(Boolean);
        }

        return formatted;
    }
}

module.exports = { AIFileAssistantService };
