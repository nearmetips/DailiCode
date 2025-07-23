import { AuthType } from 'daili-code-core';

export interface AgentResult {
  type: 'content' | 'thought' | 'tool_call' | 'error' | 'user_cancelled';
  content?: string;
  thought?: {
    summary: string;
    details?: string;
  };
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  };
  error?: string;
  timestamp: number;
}

export interface AgentConfig {
  model?: string;
  endpoint?: string;
  apiKey?: string;
  authType?: AuthType;
  provider?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  log?: boolean;
  readonly?: boolean;
  systemPrompt?: string;
  rootPath?: string;
  extension?: any;
}
