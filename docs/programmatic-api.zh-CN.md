# Daili Code 程序化 API 使用指南

本文档介绍如何通过代码直接调用 Daili Code 的 Agent 功能，而不是通过命令行界面。

## 概述

Daili Code 提供了 `ElcAgent` 类，允许开发者在自己的 Node.js 应用程序中集成 AI Agent 功能。这个 API 支持多种 LLM 提供商，包括自定义端点、工具调用、扩展系统等。

## 安装

```bash
npm install daili-code
```

## 基本用法

### 导入和初始化

```typescript
import { ElcAgent, AuthType } from 'daili-code';

// 创建 Agent 实例
const agent = new ElcAgent({
  model: 'your-model-name',
  apiKey: 'your-api-key',
  endpoint: 'https://your-llm-endpoint.com/api/v3',
  log: true,
  readonly: false
});

// 运行对话
const response = await agent.run('你好，请帮我分析这个项目的结构');
console.log(response);
```

## AgentConfig 配置选项

`ElcAgent` 构造函数接受一个 `AgentConfig` 对象，包含以下配置选项：

### 必需配置

| 参数 | 类型 | 描述 |
|------|------|------|
| `model` | `string` | 自定义 LLM 名称 |
| `apiKey` | `string` | 自定义 LLM API 密钥 |
| `endpoint` | `string` | 自定义 LLM 服务 API 地址 |

### 可选配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `authType` | `AuthType` | `AuthType.CUSTOM_LLM_API` | 认证类型 |
| `provider` | `string` | - | LLM 提供商名称 |
| `temperature` | `number` | `0` | 生成温度 (0-1) |
| `topP` | `number` | `1` | Top-p 采样参数 |
| `maxTokens` | `number` | `8096` | 最大生成 token 数 |
| `log` | `boolean` | `false` | 是否显示详细日志 |
| `readonly` | `boolean` | `false` | 只读模式，禁用文件修改操作 |
| `systemPrompt` | `string` | - | 系统提示词 |
| `rootPath` | `string` | process.pwd() | 工作目录路径 |
| `extension` | `object` | - | 扩展配置 |

## 使用示例

### 示例 1: 基本对话

```typescript
import { ElcAgent } from 'daili-code';

async function basicChat() {
  const agent = new ElcAgent({
    model: 'gpt-4',
    apiKey: 'your-openai-api-key',
    endpoint: 'https://api.openai.com/v1',
    log: true
  });

  const response = await agent.run('解释一下什么是递归');
  console.log('AI 回复:', response);
}
```

### 示例 2: 文件操作（非只读模式）

```typescript
async function fileOperations() {
  const agent = new ElcAgent({
    model: 'claude-3-sonnet',
    apiKey: 'your-anthropic-api-key',
    endpoint: 'https://api.anthropic.com/v1',
    readonly: false, // 允许文件修改
    rootPath: '/path/to/your/project'
  });

  const response = await agent.run(
    '请帮我创建一个简单的 README.md 文件，包含项目介绍'
  );
  console.log(response);
}
```

### 示例 3: 使用扩展和 MCP 服务器

```typescript
async function withExtensions() {
  const agent = new ElcAgent({
    model: 'claude-3-sonnet',
    apiKey: 'your-anthropic-api-key',
    endpoint: 'https://api.anthropic.com/v1',
    log: true,
    extension: {
      mcpServers: {
        chart: {
          command: 'npx',
          args: ['-y', '@antv/mcp-server-chart'],
          trust: false
        }
      },
      excludeTools: ['run_shell_command']
    }
  });

  const response = await agent.run(
    '请帮我生成一个销售数据的柱状图'
  );
  console.log(response);
}
```

### 示例 4: 自定义系统提示词

```typescript
async function customSystemPrompt() {
  const agent = new ElcAgent({
    model: 'your-model',
    apiKey: 'your-api-key',
    endpoint: 'your-endpoint',
    systemPrompt: `你是一个专业的代码审查助手。请遵循以下规则：
1. 总是关注代码质量和最佳实践
2. 提供具体的改进建议
3. 解释为什么某些做法更好
4. 保持友好和建设性的语调`,
    log: true
  });

  const response = await agent.run(
    '请审查这个 JavaScript 函数的代码质量'
  );
  console.log(response);
}
```

## 方法说明

### `run(userInput: string): Promise<string>`

执行一次完整的任务，包括用户输入处理、工具调用、AI 响应生成等。

**参数:**：`userInput`: 用户输入的文本

**返回值:**：`Promise<string>`: AI 的最终回复文本

### `getAllResults(): AgentResult[]`

获取所有的执行结果，包括内容、工具调用、错误等。

**返回值:**：`AgentResult[]`: 包含所有结果的数组

### `getLastResult(): string`

获取最后一次的 AI 回复文本。

**返回值:**：`string`: 最后的回复内容
