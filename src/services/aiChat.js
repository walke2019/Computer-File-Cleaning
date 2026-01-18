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
        this.systemPrompt = `你是 Windows 清理大师的 AI 助手，专门帮助用户清理和管理电脑文件。

你的能力包括：
1. 理解用户的清理需求，给出具体建议
2. 解释各类垃圾文件的安全性
3. 推荐清理策略
4. 回答关于磁盘空间的问题

当用户描述清理需求时，你可以返回特殊的 JSON 指令格式：
- 扫描垃圾: {"action": "scan_junk"}
- 清理垃圾: {"action": "clean_junk", "categories": ["类别1", "类别2"]}
- 扫描大文件: {"action": "scan_large", "minSize": 100, "drive": "C:"}
- 搜索文件: {"action": "search", "query": "搜索词", "type": "文件类型"}

如果用户只是聊天或咨询，正常回复即可。回复请简洁友好，使用中文。`;
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
            baseUrl: value.baseUrl
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
        // 移除末尾的斜杠
        url = url.replace(/\/+$/, '');

        // 检查 URL 是否已包含 API 版本路径
        // 支持的模式: /v1, /v2, /v3, /v4, /api, /compatible-mode, /paas 等
        const versionPatterns = [
            /\/v\d+$/,                    // /v1, /v2, /v3 等
            /\/api\/v\d+$/,               // /api/v1 等
            /\/compatible-mode\/v\d+$/,   // 通义千问兼容模式
            /\/paas\/v\d+$/,              // 智谱 AI 模式
            /\/client\/v\d+\/accounts\/.+\/ai\/v\d+$/,  // Cloudflare 模式
            /\/chat\/completions$/,       // 直接指向 completions
            /\/completions$/              // 直接指向 completions
        ];

        // 检查是否匹配任意已知版本模式
        const hasVersionPath = versionPatterns.some(pattern => pattern.test(url));

        if (hasVersionPath) {
            // 如果以 /completions 结尾，移除它（因为后面会添加）
            if (url.endsWith('/chat/completions')) {
                url = url.replace(/\/chat\/completions$/, '');
            } else if (url.endsWith('/completions')) {
                url = url.replace(/\/completions$/, '');
            }
            return url;
        }

        // 检查是否是已知品牌的 API 地址（通常不需要 /v1）
        const noV1Needed = [
            'anthropic.com',  // Anthropic 使用自己的路径模式
        ];

        const needsNoV1 = noV1Needed.some(domain => url.includes(domain));

        if (needsNoV1) {
            return url;
        }

        // 默认添加 /v1（适用于大多数 OpenAI 兼容接口）
        // 但如果用户已经输入了完整路径就不要添加
        if (!url.match(/\/v\d+$/) && !url.endsWith('/api')) {
            // 只有当明确是 OpenAI 服务且没有版本号时才添加 /v1
            if (url.includes('api.openai.com')) {
                url += '/v1';
            }
            // 默认不自动添加 /v1，完全信任用户输入
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
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`响应解析失败: ${data.substring(0, 200)}`));
                    }
                });
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
