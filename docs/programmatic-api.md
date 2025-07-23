# Daili Code Programmatic API Usage Guide

This document introduces how to directly invoke the Agent functionality of Daili Code through code instead of using the command-line interface.

## Overview

Daili Code provides the `ElcAgent` class, allowing developers to integrate AI Agent capabilities into their own Node.js applications. This API supports multiple LLM providers, including custom endpoints, tool invocation, and system extensions.

## Installation

```js
npm install daili-code
```

## Basic Usage

### Import and Initialization

```js
import { ElcAgent, AuthType } from 'daili-code';

// Create an Agent instance
const agent = new ElcAgent({
  model: 'your-model-name',
  apiKey: 'your-api-key',
  endpoint: 'https://your-llm-endpoint.com/api/v3',
  log: true,
  readonly: false
});

// Run a conversation
const response = await agent.run('Hello, please help me analyze the structure of this project');
console.log(response);
```


## AgentConfig Configuration Options

The `ElcAgent` constructor accepts an `AgentConfig` object with the following configuration options:

### Required Configuration

| Parameter | Type | Description |
|------|------|------|
| `model` | `string` | Custom LLM name |
| `apiKey` | `string` | Custom LLM API key |
| `endpoint` | `string` | Custom LLM service API address |

### Optional Configuration

| Parameter | Type | Default Value | Description |
|------|------|--------|------|
| `authType` | `AuthType` | `AuthType.CUSTOM_LLM_API` | Authentication type |
| `provider` | `string` | - | LLM provider name |
| `temperature` | `number` | `0` | Generation temperature (0-1) |
| `topP` | `number` | `1` | Top-p sampling parameter |
| `maxTokens` | `number` | `8096` | Maximum generated tokens |
| `log` | `boolean` | `false` | Whether to show detailed logs |
| `readonly` | `boolean` | `false` | Read-only mode, disable file modification operations |
| `systemPrompt` | `string` | - | System prompt |
| `rootPath` | `string` | process.pwd() | Working directory path |
| `extension` | `object` | - | Extension configuration |

## Usage Examples

### Example 1: Basic Conversation

```js
import { ElcAgent } from 'daili-code';

async function basicChat() {
  const agent = new ElcAgent({
    model: 'gpt-4',
    apiKey: 'your-openai-api-key',
    endpoint: 'https://api.openai.com/v1',
    log: true
  });

  const response = await agent.run('Explain what recursion is');
  console.log('AI Response:', response);
}
```

### Example 2: File Operations (Non-readonly Mode)

```js
async function fileOperations() {
  const agent = new ElcAgent({
    model: 'claude-3-sonnet',
    apiKey: 'your-anthropic-api-key',
    endpoint: 'https://api.anthropic.com/v1',
    readonly: false, // Allow file modifications
    rootPath: '/path/to/your/project'
  });

  const response = await agent.run(
    'Please create a simple README.md file with a project introduction'
  );
  console.log(response);
}
```

### Example 3: Using Extensions and MCP Servers

```js
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
    'Please generate a bar chart for sales data'
  );
  console.log(response);
}
```

### Example 4: Custom System Prompt

```js
async function customSystemPrompt() {
  const agent = new ElcAgent({
    model: 'your-model',
    apiKey: 'your-api-key',
    endpoint: 'your-endpoint',
    systemPrompt: `You are a professional code review assistant. Please follow these rules:
1. Always focus on code quality and best practices
2. Provide specific improvement suggestions
3. Explain why certain practices are better
4. Maintain a friendly and constructive tone`,
    log: true
  });

  const response = await agent.run(
    'Please review the code quality of this JavaScript function'
  );
  console.log(response);
}
```

## Method Descriptions

### `run(userInput: string): Promise<string>`

Executes a complete task, including user input processing, tool invocation, and AI response generation.

**Parameters**: `userInput`: User-input text

**Returns**: `Promise<string>`: The final response text from the AI

### `getAllResults(): AgentResult[]`

Retrieves all execution results, including content, tool invocations, errors, etc.

**Returns**: `AgentResult[]`: An array containing all results

### `getLastResult(): string`

Retrieves the text of the last AI response.

**Returns**: `string`: The last response content
  