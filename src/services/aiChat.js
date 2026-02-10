const https = require('https');
const http = require('http');

/**
 * AI 聊天服务 - 支持多种大模型供应商
 */
class AIChatService {
    constructor() {
        // 预设供应商配置
        this.providers = {
            openai: {
                name: 'OpenAI',
                baseUrl: 'https://api.openai.com/v1',
                models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                defaultModel: 'gpt-4o-mini'
            },
            claude: {
                name: 'Claude (Anthropic)',
                baseUrl: 'https://api.anthropic.com/v1',
                models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
                defaultModel: 'claude-3-5-sonnet-20241022'
            },
            deepseek: {
                name: 'DeepSeek',
                baseUrl: 'https://api.deepseek.com/v1',
                models: ['deepseek-chat', 'deepseek-coder'],
                defaultModel: 'deepseek-chat'
            },
            qwen: {
                name: '通义千问 (Qwen)',
                baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
                defaultModel: 'qwen-turbo'
            },
            zhipu: {
                name: '智谱 AI (ChatGLM)',
                baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
                models: ['glm-4-flash', 'glm-4', 'glm-4-plus'],
                defaultModel: 'glm-4-flash'
            },
            xai: {
                name: 'xAI (Grok)',
                baseUrl: 'https://api.x.ai/v1',
                models: ['grok-beta', 'grok-2'],
                defaultModel: 'grok-beta'
            },
            moonshot: {
                name: 'Moonshot (Kimi)',
                baseUrl: 'https://api.moonshot.cn/v1',
                models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
                defaultModel: 'moonshot-v1-8k'
            },
            // 渠道商
            openrouter: {
                name: 'OpenRouter (中转)',
                baseUrl: 'https://openrouter.ai/api/v1',
                models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-pro'],
                defaultModel: 'anthropic/claude-3.5-sonnet'
            },
            cloudflare: {
                name: 'Cloudflare AI (中转)',
                baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1',
                models: ['@cf/meta/llama-3-8b-instruct', '@cf/mistral/mistral-7b-instruct'],
                defaultModel: '@cf/meta/llama-3-8b-instruct'
            },
            // 本地服务
            ollama: {
                name: 'Ollama (本地)',
                baseUrl: 'http://localhost:11434/v1',
                models: ['llama3.2', 'llama3.1', 'qwen2.5', 'gemma2', 'phi3', 'mistral'],
                defaultModel: 'llama3.2',
                isLocal: true,
                defaultPort: 11434
            },
            lmstudio: {
                name: 'LM Studio (本地)',
                baseUrl: 'http://localhost:1234/v1',
                models: ['local-model'],
                defaultModel: 'local-model',
                isLocal: true,
                defaultPort: 1234
            },
            textgen: {
                name: 'Text Generation WebUI (本地)',
                baseUrl: 'http://localhost:5000/v1',
                models: ['local-model'],
                defaultModel: 'local-model',
                isLocal: true,
                defaultPort: 5000
            },
            llamacpp: {
                name: 'llama.cpp Server (本地)',
                baseUrl: 'http://localhost:8080/v1',
                models: ['local-model'],
                defaultModel: 'local-model',
                isLocal: true,
                defaultPort: 8080
            },
            vllm: {
                name: 'vLLM (本地)',
                baseUrl: 'http://localhost:8000/v1',
                models: ['local-model'],
                defaultModel: 'local-model',
                isLocal: true,
                defaultPort: 8000
            },
            custom: {
                name: '自定义接口',
                baseUrl: '',
                models: [],
                defaultModel: ''
            }
        };

        // 当前配置
        this.config = {
            provider: 'openai',
            apiKey: '',
            baseUrl: '',
            model: '',
            customModels: ''
        };

        // 系统提示词
        this.systemPrompt = '';
        this.platform = process.platform; // 默认平台
        this.setPlatform(this.platform); // 初始化提示词
    }

    /**
     * 设置平台信息并更新提示词
     */
    setPlatform(platform) {
        this.platform = platform;
        const isMac = platform === 'darwin';
        const osName = isMac ? 'macOS' : 'Windows';
        const appName = isMac ? '智能文件整理助手' : 'Windows 清理大师';
        const homeDir = isMac ? '/Users/{username}' : 'C:\\Users\\{username}';
        const driveExample = isMac ? '/' : 'C:';
        const trashName = isMac ? '废纸篓' : '回收站';

        this.systemPrompt = `你是一个高效的 AI 文件助手，当前运行在 **${osName}** 系统上。

**任务：**
根据用户的自然语言需求，快速识别意图并生成对应的 JSON 操作指令。

**环境信息 (${osName}):**
- 根目录: \`${isMac ? '/' : 'C:\\'}\`
- 用户主目录: \`${homeDir}\`
- 关键目录: 桌面(Desktop), 下载(Downloads)
- 垃圾清理: 包含系统缓存、临时文件及**${trashName}**

**操作类型及指令格式：**
1. **整理文件** (归类/移动): \`{"action": "organize_files", "path": "目标路径"}\`
2. **扫描大文件**: \`{"action": "scan_large", "path": "扫描路径"}\`
3. **扫描垃圾文件** (清理/瘦身): \`{"action": "scan_junk"}\`
4. **扫描重复文件**: \`{"action": "scan_duplicates", "path": "扫描路径"}\`

**原则：**
- **拒绝废话**：回复要极简，直接告诉用户你要做什么。
- **路径推断**：如果用户未指定完整路径，根据 ${osName} 习惯推断（如 "${isMac ? '下载' : 'D盘'}" -> "${isMac ? '/Users/{username}/Downloads' : 'D:\\'}"）。
- **指令优先**：在回复文本末尾且必须附加 JSON 指令。

**示例对话 (${osName}):**
用户: "帮我清理下"
回复: "好的，立即开始扫描系统垃圾及${trashName} 🧹\n{\"action\": \"scan_junk\"}"

用户: "${isMac ? '看看下载文件夹里的大文件' : '看看D盘的大文件'}"
回复: "已定位${isMac ? '下载' : 'D盘'}目录，正在扫描大文件... �\n{\"action\": \"scan_large\", \"path\": \"${isMac ? '/Users/{username}/Downloads' : 'D:\\'}\"}"`;
    }

    /**
     * 设置配置
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * 获取当前配置
     */
    getConfig() {
        return this.config;
    }

    /**
     * 获取供应商列表
     */
    getProviders() {
        return Object.entries(this.providers).map(([key, value]) => ({
            key,
            name: value.name,
            models: value.models,
            defaultModel: value.defaultModel,
            baseUrl: value.baseUrl,
            isLocal: value.isLocal || false
        }));
    }

    /**
     * 从 API 获取可用模型列表
     */
    async fetchAvailableModels(provider, apiKey, baseUrl) {
        try {
            const providerConfig = this.providers[provider];
            const url = baseUrl || providerConfig?.baseUrl;

            if (!url) {
                throw new Error('无效的 API 地址');
            }

            // 本地服务特殊处理（不需要 API 密钥）
            const isLocal = providerConfig?.isLocal || provider === 'ollama' || provider === 'lmstudio' ||
                provider === 'textgen' || provider === 'llamacpp' || provider === 'vllm';

            // Ollama 特殊处理
            if (provider === 'ollama') {
                try {
                    const response = await this.httpRequest(url.replace('/v1', '') + '/api/tags', {
                        method: 'GET'
                    });
                    return response.models?.map(m => m.name) || [];
                } catch (error) {
                    console.error('Ollama 获取模型失败:', error);
                    return providerConfig.models || [];
                }
            }

            // LM Studio 和其他本地服务
            if (isLocal) {
                try {
                    const response = await this.httpRequest(url + '/models', {
                        method: 'GET'
                    });

                    if (response.data && Array.isArray(response.data)) {
                        const models = response.data.map(m => m.id);
                        return models.length > 0 ? models : providerConfig.models || ['local-model'];
                    }

                    // 如果没有返回模型，使用预设
                    return providerConfig.models || ['local-model'];
                } catch (error) {
                    console.error('本地服务获取模型失败:', error);
                    return providerConfig.models || ['local-model'];
                }
            }

            // OpenAI 兼容接口（需要 API 密钥）
            if (!apiKey) {
                // 如果没有 API 密钥，返回预设模型
                return providerConfig?.models || [];
            }

            const response = await this.httpRequest(url + '/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (response.data && Array.isArray(response.data)) {
                return response.data.map(m => m.id);
            }

            return [];
        } catch (error) {
            console.error('获取模型列表失败:', error);
            // 返回预设模型列表作为降级方案
            return this.providers[provider]?.models || [];
        }
    }

    /**
     * 测试连接
     */
    async testConnection() {
        try {
            const response = await this.sendMessage('你好，请简单回复"连接成功"', []);
            if (response && response.content) {
                return { success: true, message: response.content };
            }
            return { success: false, message: '未收到有效响应' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * 发送消息
     */
    async sendMessage(userMessage, history = []) {
        const { provider, apiKey, baseUrl, model, customModels } = this.config;

        if (!apiKey && !this.providers[provider]?.isLocal) {
            throw new Error('请先配置 API 密钥');
        }

        // 确定 baseUrl
        let finalBaseUrl = baseUrl;
        if (!finalBaseUrl && provider !== 'custom') {
            finalBaseUrl = this.providers[provider]?.baseUrl;
        }
        if (!finalBaseUrl) {
            throw new Error('请配置 API 地址');
        }

        // 自动处理 /v1 路径
        finalBaseUrl = this.normalizeBaseUrl(finalBaseUrl);

        // 确定模型
        let finalModel = model;
        if (!finalModel && provider !== 'custom') {
            finalModel = this.providers[provider]?.defaultModel;
        }
        if (!finalModel) {
            throw new Error('请选择模型');
        }

        // 构建消息
        const messages = [
            { role: 'system', content: this.systemPrompt },
            ...history.slice(-10), // 保留最近 10 条历史
            { role: 'user', content: userMessage }
        ];

        // 发送请求
        const requestBody = {
            model: finalModel,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        };

        const response = await this.httpRequest(finalBaseUrl + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (response.error) {
            throw new Error(response.error.message || JSON.stringify(response.error));
        }

        const content = response.choices?.[0]?.message?.content || '';

        // 尝试解析 AI 返回的指令
        const action = this.parseAction(content);

        return {
            content,
            action,
            usage: response.usage
        };
    }

    /**
     * 智能标准化 baseUrl
     * 自动识别已包含版本路径的 URL，只在需要时添加 /v1
     */
    normalizeBaseUrl(url) {
        if (!url) return '';

        // 1. 去除首尾空格和末尾多余斜杠
        url = url.trim().replace(/\/+$/, '');

        // 2. 检查是否已经包含了版本号或特定的 API 路径 (不局限于末尾)
        // 支持模式: /v1, /v1/, /api/v1, /compatible-mode/v1, /completions 等
        const versionPatterns = [
            /\/v\d+($|\/)/,                  // /v1 或 /v1/
            /\/api\/v\d+($|\/)/,             // /api/v1
            /\/compatible-mode\/v\d+($|\/)/, // 通义千问
            /\/paas\/v\d+($|\/)/,            // 智谱
            /\/client\/v\d+/                 // Cloudflare
        ];

        const hasVersion = versionPatterns.some(pattern => pattern.test(url));

        // 3. 如果已经包含 /chat/completions 或 /completions，先清理掉，因为后面会统一加
        if (url.endsWith('/chat/completions')) {
            url = url.replace(/\/chat\/completions$/, '');
        } else if (url.endsWith('/completions')) {
            url = url.replace(/\/completions$/, '');
        }

        // 4. 特殊：如果清理后已经带有版本号，直接返回
        if (versionPatterns.some(pattern => pattern.test(url))) {
            return url;
        }

        // 5. 检查是否是已知不需要 /v1 的地址 (如 Anthropic)
        const noV1Needed = [
            'anthropic.com',
            'api.anthropic'
        ];
        if (noV1Needed.some(domain => url.includes(domain))) {
            return url;
        }

        // 6. 核心优化：如果 URL 中没有明显的版本标识，自动补全 /v1
        // 我们改用正则更精确地检查是否已经存在 /v1 或 /api/ 这种关键路径
        const alreadyHasApiOrVersion = /\/(v\d+|api)\//i.test(url + '/');

        if (!alreadyHasApiOrVersion) {
            // 对于大多数中转站和本地服务，如果用户只提供了根地址，我们需要补全 /v1
            url += '/v1';
        }

        return url;
    }

    /**
     * 解析 AI 返回的指令
     */
    parseAction(content) {
        try {
            // 尝试从内容中提取 JSON
            const jsonMatch = content.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // 解析失败，返回 null
        }
        return null;
    }

    /**
     * 发送消息 - 流式响应
     */
    async sendMessageStream(userMessage, history = [], onChunk) {
        const { provider, apiKey, baseUrl, model } = this.config;

        if (!apiKey && !this.providers[provider]?.isLocal) {
            throw new Error('请先配置 API 密钥');
        }

        let finalBaseUrl = this.normalizeBaseUrl(baseUrl || this.providers[provider]?.baseUrl);
        let finalModel = model || this.providers[provider]?.defaultModel;

        const messages = [
            { role: 'system', content: this.systemPrompt },
            ...history.slice(-10),
            { role: 'user', content: userMessage }
        ];

        const requestBody = {
            model: finalModel,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000,
            stream: true
        };

        let fullContent = '';
        let lineBuffer = '';

        try {
            await this.httpRequest(finalBaseUrl + '/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': apiKey ? `Bearer ${apiKey}` : ''
                },
                body: JSON.stringify(requestBody),
                isStream: true,
                onChunk: (chunk) => {
                    lineBuffer += chunk;
                    let lines = lineBuffer.split('\n');
                    lineBuffer = lines.pop(); // 保持最后的（可能不完整的）行

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

                        if (trimmedLine.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(trimmedLine.slice(6));
                                // 兼容不同供应商的字段名 (delta.content 或 text)
                                const text = data.choices?.[0]?.delta?.content || data.choices?.[0]?.text || '';
                                if (text) {
                                    fullContent += text;
                                    if (onChunk) onChunk(text);
                                }
                            } catch (e) {
                                // 只有当行内容看起来像完整的 JSON 但解析失败时才报错
                                if (trimmedLine.endsWith('}')) {
                                    console.error('[AI Stream] Parse error:', e.message, trimmedLine);
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('[AI Stream] Request error:', error);
            throw error;
        }

        const action = this.parseAction(fullContent);
        return { content: fullContent, action };
    }

    /**
     * HTTP 请求
     */
    httpRequest(url, options) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const lib = isHttps ? https : http;

            const req = lib.request(url, {
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: 60000
            }, (res) => {
                if (res.statusCode >= 400) {
                    let errorData = '';
                    res.on('data', chunk => errorData += chunk);
                    res.on('end', () => {
                        reject(new Error(`请求失败 (${res.statusCode}): ${errorData.substring(0, 200)}`));
                    });
                    return;
                }

                let data = '';
                if (options.isStream) {
                    res.on('data', chunk => {
                        const chunkStr = chunk.toString();
                        if (options.onChunk) options.onChunk(chunkStr);
                    });
                    res.on('end', () => resolve({}));
                } else {
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error(`响应解析失败: ${data.substring(0, 200)}`));
                        }
                    });
                }
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时'));
            });

            if (options.body) {
                req.write(options.body);
            }
            req.end();
        });
    }

    /**
     * 生成清理建议
     */
    async generateCleaningSuggestion(context) {
        const prompt = `根据以下系统状态，给出清理建议：
${JSON.stringify(context, null, 2)}

请给出简洁的清理建议。`;

        return this.sendMessage(prompt, []);
    }
}

module.exports = { AIChatService };
