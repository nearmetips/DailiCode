# DailiCode API 集成指南

本文档介绍如何在项目中集成 DailiCode API 服务提供商。

## 概述

DailiCode 是一个新的 API 密钥服务提供商，提供代码生成和 AI 辅助功能。本集成支持 OAuth2 认证流程，允许用户安全地连接到 DailiCode 服务。

## 功能特性

- **OAuth2 认证**: 安全的用户认证流程
- **令牌管理**: 自动处理访问令牌的刷新和缓存
- **内容生成**: 支持文本生成和流式响应
- **令牌计数**: 计算输入内容的令牌数量
- **内容嵌入**: 生成文本嵌入向量

## 配置步骤

### 1. 环境变量配置

在项目根目录的 `.env` 文件中添加以下配置：

```env
# DailiCode OAuth Configuration
DAILICODE_CLIENT_ID="你的DailiCode客户端ID"
DAILICODE_CLIENT_SECRET="你的DailiCode客户端密钥"
```

### 2. 获取 DailiCode 凭据

1. 访问 [DailiCode 开发者控制台](https://www.dailicode.com/developer)
2. 创建新的应用程序
3. 获取客户端 ID 和客户端密钥
4. 配置重定向 URI 为 `http://localhost:PORT/oauth2callback`（PORT 会自动分配）

### 3. 使用 DailiCode 认证

在代码中使用新的认证类型：

```typescript
import { AuthType } from './core/contentGenerator.js';

// 使用 DailiCode OAuth 认证
const authType = AuthType.DAILICODE_OAUTH;
```

## API 端点

DailiCode 集成使用以下 API 端点：

- **认证**: `https://www.dailicode.com/oauth/authorize`
- **令牌交换**: `https://www.dailicode.com/oauth/token`
- **用户信息**: `https://www.dailicode.com/api/user`
- **内容生成**: `https://www.dailicode.com/api/generate`
- **流式生成**: `https://www.dailicode.com/api/generate/stream`
- **令牌计数**: `https://www.dailicode.com/api/count-tokens`
- **内容嵌入**: `https://www.dailicode.com/api/embed`

## 认证流程

1. **初始化**: 检查本地缓存的凭据
2. **验证**: 尝试使用缓存的令牌进行 API 调用
3. **重新认证**: 如果令牌无效，启动 OAuth2 流程
4. **浏览器授权**: 自动打开浏览器进行用户授权
5. **令牌交换**: 使用授权码获取访问令牌
6. **缓存**: 将令牌保存到本地文件系统

## 文件结构

集成添加了以下新文件：

```
packages/core/src/code_assist/
├── dailicode-oauth2.ts          # OAuth2 客户端实现
├── dailicode-content-generator.ts # 内容生成器实现
└── oauth2.ts                    # 原有的 Google OAuth2 实现
```

## 缓存文件

认证信息缓存在用户主目录下：

```
~/.gemini/
├── dailicode_oauth_creds.json   # DailiCode 访问令牌
├── dailicode_user_id            # DailiCode 用户 ID
├── oauth_creds.json             # Google 访问令牌（原有）
└── google_account_id            # Google 账户 ID（原有）
```

## 使用示例

### 基本使用

```typescript
import { createContentGeneratorConfig, createContentGenerator, AuthType } from './core/contentGenerator.js';

async function useDailiCode() {
  // 创建配置
  const config = await createContentGeneratorConfig(
    'gemini-1.5-flash', // 模型名称
    AuthType.DAILICODE_OAUTH
  );

  // 创建内容生成器
  const generator = await createContentGenerator(config);

  // 生成内容
  const response = await generator.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{
      role: 'user',
      parts: [{ text: '请帮我写一个 Hello World 程序' }]
    }]
  });

  console.log(response.candidates[0].content.parts[0].text);
}
```

### 流式生成

```typescript
async function streamGeneration() {
  const config = await createContentGeneratorConfig(
    'gemini-1.5-flash',
    AuthType.DAILICODE_OAUTH
  );
  
  const generator = await createContentGenerator(config);
  
  const stream = await generator.generateContentStream({
    model: 'gemini-1.5-flash',
    contents: [{
      role: 'user',
      parts: [{ text: '请详细解释什么是机器学习' }]
    }]
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.candidates[0].content.parts[0].text);
  }
}
```

## 错误处理

集成包含完善的错误处理机制：

- **网络错误**: 自动重试和错误报告
- **认证错误**: 自动清除无效凭据并重新认证
- **API 错误**: 详细的错误信息和状态码
- **令牌过期**: 自动刷新访问令牌

## 安全考虑

- 客户端密钥存储在环境变量中
- 访问令牌安全缓存在本地文件系统
- 支持令牌自动刷新机制
- 使用 HTTPS 进行所有 API 通信
- 实现 CSRF 保护（state 参数）

## 故障排除

### 常见问题

1. **认证失败**
   - 检查环境变量配置
   - 确认客户端 ID 和密钥正确
   - 验证重定向 URI 配置

2. **令牌过期**
   - 删除缓存文件：`rm ~/.gemini/dailicode_*`
   - 重新运行认证流程

3. **网络连接问题**
   - 检查防火墙设置
   - 确认可以访问 dailicode.com
   - 验证代理配置

### 调试模式

启用调试模式查看详细日志：

```bash
DEBUG=dailicode:* npm start
```

## 贡献

如需改进 DailiCode 集成，请：

1. Fork 项目仓库
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

本集成遵循项目的 Apache 2.0 许可证。