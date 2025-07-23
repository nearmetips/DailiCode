# API 错误快速修复指南

## 🚨 当前错误
```
[API Error: request to https://cloudcode-pa.googleapis.com/v1internal:countTokens failed, reason: ]
```

## 🔍 问题分析

这个错误表明无法连接到 Google Code Assist API。可能的原因包括：

1. **网络连接问题** - 无法访问 Google 服务
2. **认证问题** - OAuth 凭据配置错误或过期
3. **防火墙/代理阻止** - 企业网络限制
4. **服务暂时不可用** - Google API 临时故障

## ⚡ 立即解决方案：使用 DailiCode

我们已经为你集成了 DailiCode 作为替代方案！

### 1. 配置 DailiCode 凭据

在 `.env` 文件中添加：

```env
# DailiCode OAuth Configuration
DAILICODE_CLIENT_ID="your-dailicode-client-id-here"
DAILICODE_CLIENT_SECRET="your-dailicode-client-secret-here"
```

### 2. 切换到 DailiCode 认证

```typescript
import { AuthType, createContentGeneratorConfig, createContentGenerator } from 'daili-code-core';

// 使用 DailiCode 替代 Google Code Assist
const config = await createContentGeneratorConfig(
  'gemini-1.5-flash',
  AuthType.DAILICODE_OAUTH  // 使用 DailiCode 认证
);

const generator = await createContentGenerator(config);

// 正常使用所有功能
const response = await generator.generateContent({
  model: 'gemini-1.5-flash',
  contents: [{
    role: 'user',
    parts: [{ text: '你的问题' }]
  }]
});
```

### 3. 验证连接

运行诊断工具检查连接状态：

```bash
node scripts/diagnose-api.js
```

## 🔧 Google API 故障排除

如果你想继续使用 Google Code Assist，尝试以下步骤：

### 1. 检查网络连接

```bash
# 测试基本连接
curl -I https://cloudcode-pa.googleapis.com

# 测试 DNS 解析
nslookup cloudcode-pa.googleapis.com
```

### 2. 验证环境变量

确保 `.env` 文件中有正确的 Google 凭据：

```env
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
```

### 3. 检查代理设置

如果在企业网络中，可能需要配置代理：

```bash
# 设置代理环境变量
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
```

### 4. 清除缓存凭据

```bash
# 删除缓存的认证信息
rm -rf ~/.gemini/oauth_creds.json
rm -rf ~/.gemini/google_account_id
```

## 🎯 推荐方案

### 方案 A：立即使用 DailiCode（推荐）

✅ **优势：**
- 稳定可靠的连接
- 完整功能支持
- 简单配置
- 已通过测试

```typescript
// 立即可用的解决方案
const config = await createContentGeneratorConfig(
  'gemini-1.5-flash',
  AuthType.DAILICODE_OAUTH
);
```

### 方案 B：双重备份策略

```typescript
async function createRobustGenerator() {
  try {
    // 首先尝试 Google Code Assist
    const googleConfig = await createContentGeneratorConfig(
      'gemini-1.5-flash',
      AuthType.LOGIN_WITH_GOOGLE
    );
    return await createContentGenerator(googleConfig);
  } catch (error) {
    console.log('Google API 不可用，切换到 DailiCode...');
    
    // 备用方案：使用 DailiCode
    const dailicodeConfig = await createContentGeneratorConfig(
      'gemini-1.5-flash',
      AuthType.DAILICODE_OAUTH
    );
    return await createContentGenerator(dailicodeConfig);
  }
}
```

### 方案 C：使用 Gemini API Key

如果两个服务都不可用：

```typescript
const config = await createContentGeneratorConfig(
  'gemini-1.5-flash',
  AuthType.USE_GEMINI
);
```

需要设置：
```env
GEMINI_API_KEY="your-gemini-api-key"
```

## 📊 功能对比

| 功能 | Google Code Assist | DailiCode | Gemini API |
|------|-------------------|-----------|------------|
| 内容生成 | ✅ | ✅ | ✅ |
| 流式生成 | ✅ | ✅ | ✅ |
| 令牌计数 | ✅ | ✅ | ✅ |
| 内容嵌入 | ❌ | ✅ | ✅ |
| 网络稳定性 | ⚠️ | ✅ | ✅ |
| 配置复杂度 | 高 | 中 | 低 |

## 🚀 快速开始

1. **立即修复**：
   ```bash
   # 配置 DailiCode 凭据
   echo 'DAILICODE_CLIENT_ID="your-id"' >> .env
   echo 'DAILICODE_CLIENT_SECRET="your-secret"' >> .env
   ```

2. **测试连接**：
   ```bash
   node scripts/diagnose-api.js
   ```

3. **更新代码**：
   ```typescript
   // 将 AuthType.LOGIN_WITH_GOOGLE 改为
   AuthType.DAILICODE_OAUTH
   ```

## 📞 获取支持

- 📖 详细文档：`docs/dailicode-integration.md`
- 🔧 示例代码：`examples/dailicode-example.ts`
- 🧪 运行测试：`npm test src/code_assist/dailicode-*.test.ts`

**DailiCode 集成已经完全准备就绪，可以立即使用！** 🎉