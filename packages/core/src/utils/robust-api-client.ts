/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GenerateContentResponse, GenerateContentParameters } from '@google/genai';
import { ContentGenerator, AuthType, createContentGeneratorConfig, createContentGenerator } from '../core/contentGenerator.js';

export interface RobustApiOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableFallback?: boolean;
  fallbackAuthType?: AuthType;
  timeout?: number;
}

export class RobustApiClient {
  private primaryGenerator: ContentGenerator | null = null;
  private fallbackGenerator: ContentGenerator | null = null;
  private options: Required<RobustApiOptions>;

  constructor(
    private primaryAuthType: AuthType,
    private model: string = 'gemini-1.5-flash',
    options: RobustApiOptions = {}
  ) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      enableFallback: options.enableFallback ?? true,
      fallbackAuthType: options.fallbackAuthType ?? AuthType.DAILICODE_OAUTH,
      timeout: options.timeout ?? 30000,
    };
  }

  async initialize(): Promise<void> {
    try {
      console.log(`🔧 初始化主要服务: ${this.primaryAuthType}`);
      const primaryConfig = await createContentGeneratorConfig(this.model, this.primaryAuthType);
      this.primaryGenerator = await createContentGenerator(primaryConfig);
      console.log('✅ 主要服务初始化成功');
    } catch (error) {
      console.warn('⚠️ 主要服务初始化失败:', error);
      
      if (this.options.enableFallback && this.options.fallbackAuthType !== this.primaryAuthType) {
        await this.initializeFallback();
      } else {
        throw error;
      }
    }

    // 如果启用了备用服务，预先初始化
    if (this.options.enableFallback && this.options.fallbackAuthType !== this.primaryAuthType) {
      await this.initializeFallback();
    }
  }

  private async initializeFallback(): Promise<void> {
    try {
      console.log(`🔄 初始化备用服务: ${this.options.fallbackAuthType}`);
      const fallbackConfig = await createContentGeneratorConfig(this.model, this.options.fallbackAuthType);
      this.fallbackGenerator = await createContentGenerator(fallbackConfig);
      console.log('✅ 备用服务初始化成功');
    } catch (error) {
      console.warn('⚠️ 备用服务初始化失败:', error);
    }
  }

  async generateContent(request: GenerateContentParameters): Promise<GenerateContentResponse> {
    return this.executeWithFallback(
      async (generator) => generator.generateContent(request),
      'generateContent'
    );
  }

  async *generateContentStream(request: GenerateContentParameters): Promise<AsyncGenerator<GenerateContentResponse>> {
    const generator = await this.executeWithFallback(
      async (gen) => gen.generateContentStream(request),
      'generateContentStream'
    );
    
    yield* generator;
  }

  async countTokens(request: any): Promise<any> {
    return this.executeWithFallback(
      async (generator) => generator.countTokens(request),
      'countTokens'
    );
  }

  async embedContent(request: any): Promise<any> {
    return this.executeWithFallback(
      async (generator) => generator.embedContent(request),
      'embedContent'
    );
  }

  private async executeWithFallback<T>(
    operation: (generator: ContentGenerator) => Promise<T>,
    operationName: string
  ): Promise<T> {
    // 首先尝试主要服务
    if (this.primaryGenerator) {
      try {
        console.log(`🚀 使用主要服务执行 ${operationName}`);
        const result = await this.executeWithRetry(operation, this.primaryGenerator, operationName);
        
        // 验证结果
        if (this.isValidResponse(result)) {
          return result;
        } else {
          throw new Error('主要服务返回无效响应');
        }
      } catch (error) {
        console.warn(`⚠️ 主要服务 ${operationName} 失败:`, error);
        
        // 如果主要服务失败，尝试备用服务
        if (this.fallbackGenerator && this.options.enableFallback) {
          console.log(`🔄 切换到备用服务执行 ${operationName}`);
          try {
            const result = await this.executeWithRetry(operation, this.fallbackGenerator, operationName);
            
            if (this.isValidResponse(result)) {
              console.log('✅ 备用服务执行成功');
              return result;
            } else {
              throw new Error('备用服务返回无效响应');
            }
          } catch (fallbackError) {
            console.error(`❌ 备用服务 ${operationName} 也失败:`, fallbackError);
            throw new Error(`主要服务和备用服务都失败: ${error.message} | ${fallbackError.message}`);
          }
        } else {
          throw error;
        }
      }
    } else {
      throw new Error('没有可用的服务生成器');
    }
  }

  private async executeWithRetry<T>(
    operation: (generator: ContentGenerator) => Promise<T>,
    generator: ContentGenerator,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        console.log(`🔄 ${operationName} 尝试 ${attempt}/${this.options.maxRetries}`);
        
        // 设置超时
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('操作超时')), this.options.timeout);
        });

        const result = await Promise.race([
          operation(generator),
          timeoutPromise
        ]);

        console.log(`✅ ${operationName} 第 ${attempt} 次尝试成功`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ ${operationName} 第 ${attempt} 次尝试失败:`, lastError.message);

        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1); // 指数退避
          console.log(`⏱️ 等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`${operationName} 在 ${this.options.maxRetries} 次尝试后失败`);
  }

  private isValidResponse(response: any): boolean {
    if (!response) {
      return false;
    }

    // 检查 GenerateContentResponse 格式
    if (typeof response === 'object' && 'candidates' in response) {
      const genResponse = response as GenerateContentResponse;
      return !!(genResponse.candidates && genResponse.candidates.length > 0);
    }

    // 检查其他类型的响应
    if (typeof response === 'object' && response !== null) {
      return true;
    }

    return false;
  }

  getStatus(): {
    primary: { available: boolean; type: AuthType };
    fallback: { available: boolean; type: AuthType };
  } {
    return {
      primary: {
        available: !!this.primaryGenerator,
        type: this.primaryAuthType
      },
      fallback: {
        available: !!this.fallbackGenerator,
        type: this.options.fallbackAuthType
      }
    };
  }
}

// 便捷函数：创建健壮的 API 客户端
export async function createRobustApiClient(
  primaryAuthType: AuthType = AuthType.USE_GEMINI,
  model: string = 'gemini-1.5-flash',
  options: RobustApiOptions = {}
): Promise<RobustApiClient> {
  const client = new RobustApiClient(primaryAuthType, model, {
    enableFallback: true,
    fallbackAuthType: AuthType.DAILICODE_OAUTH,
    ...options
  });

  await client.initialize();
  return client;
}

// 使用示例
export async function createRecommendedClient(): Promise<RobustApiClient> {
  console.log('🚀 创建推荐的健壮 API 客户端...');
  
  // 推荐配置：DailiCode 作为主要服务，Gemini API Key 作为备用
  return createRobustApiClient(
    AuthType.DAILICODE_OAUTH,  // 主要服务：稳定可靠
    'gemini-1.5-flash',
    {
      enableFallback: true,
      fallbackAuthType: AuthType.USE_GEMINI,  // 备用服务
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000
    }
  );
}