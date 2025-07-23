#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DailiCode API 集成示例
 * 
 * 本示例展示如何使用新的 DailiCode API 服务提供商进行内容生成。
 * 
 * 使用前请确保：
 * 1. 在 .env 文件中配置了 DAILICODE_CLIENT_ID 和 DAILICODE_CLIENT_SECRET
 * 2. 已安装所有依赖项
 * 
 * 运行方式：
 * npm run build && node examples/dailicode-example.js
 */

import { 
  createContentGeneratorConfig, 
  createContentGenerator, 
  AuthType 
} from '../packages/core/src/core/contentGenerator.js';

async function demonstrateDailicodeIntegration() {
  console.log('🚀 DailiCode API 集成示例');
  console.log('=' .repeat(50));

  try {
    // 1. 创建 DailiCode 配置
    console.log('📝 创建 DailiCode 配置...');
    const config = await createContentGeneratorConfig(
      'gemini-1.5-flash', // 使用的模型
      AuthType.DAILICODE_OAUTH // 使用 DailiCode OAuth 认证
    );
    console.log('✅ 配置创建成功');

    // 2. 创建内容生成器
    console.log('🔧 初始化内容生成器...');
    const generator = await createContentGenerator(config, 'example-session');
    console.log('✅ 内容生成器初始化成功');

    // 3. 基本内容生成示例
    console.log('\n📖 基本内容生成示例');
    console.log('-'.repeat(30));
    
    const basicRequest = {
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user' as const,
        parts: [{ text: '请用 TypeScript 写一个简单的 Hello World 程序，并添加注释说明' }]
      }]
    };

    console.log('🤖 正在生成内容...');
    const basicResponse = await generator.generateContent(basicRequest);
    console.log('📄 生成结果：');
    console.log(basicResponse.candidates[0].content.parts[0].text);
    console.log(`📊 使用令牌数: ${basicResponse.usageMetadata?.totalTokenCount || 'N/A'}`);

    // 4. 令牌计数示例
    console.log('\n🔢 令牌计数示例');
    console.log('-'.repeat(30));
    
    const tokenRequest = {
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user' as const,
        parts: [{ text: '这是一个用于测试令牌计数的示例文本。它包含中文和英文内容。' }]
      }]
    };

    const tokenResponse = await generator.countTokens(tokenRequest);
    console.log(`📊 令牌数量: ${tokenResponse.totalTokens}`);

    // 5. 流式生成示例
    console.log('\n🌊 流式生成示例');
    console.log('-'.repeat(30));
    
    const streamRequest = {
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user' as const,
        parts: [{ text: '请详细解释什么是机器学习，包括其主要类型和应用场景' }]
      }]
    };

    console.log('🤖 正在流式生成内容...');
    console.log('📄 流式结果：');
    
    const stream = await generator.generateContentStream(streamRequest);
    for await (const chunk of stream) {
      const text = chunk.candidates[0]?.content?.parts[0]?.text || '';
      process.stdout.write(text);
    }
    console.log('\n');

    // 6. 内容嵌入示例
    console.log('\n🎯 内容嵌入示例');
    console.log('-'.repeat(30));
    
    const embedRequest = {
      model: 'text-embedding-ada-002',
      content: { 
        parts: [{ text: '人工智能是计算机科学的一个分支' }] 
      }
    };

    const embedResponse = await generator.embedContent(embedRequest);
    console.log(`🎯 嵌入向量维度: ${embedResponse.embedding.values.length}`);
    console.log(`🎯 前5个值: [${embedResponse.embedding.values.slice(0, 5).join(', ')}...]`);

    console.log('\n🎉 所有示例执行完成！');
    
  } catch (error) {
    console.error('❌ 执行过程中出现错误：');
    console.error(error);
    
    if (error instanceof Error) {
      if (error.message.includes('DAILICODE_CLIENT_ID')) {
        console.log('\n💡 提示：请确保在 .env 文件中配置了正确的 DailiCode 凭据：');
        console.log('   DAILICODE_CLIENT_ID="你的客户端ID"');
        console.log('   DAILICODE_CLIENT_SECRET="你的客户端密钥"');
      } else if (error.message.includes('authentication')) {
        console.log('\n💡 提示：请检查网络连接和 DailiCode 服务状态');
      }
    }
    
    process.exit(1);
  }
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateDailicodeIntegration().catch(console.error);
}

export { demonstrateDailicodeIntegration };