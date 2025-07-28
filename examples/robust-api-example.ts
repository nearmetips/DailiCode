#!/usr/bin/env node

/**
 * 健壮 API 客户端使用示例
 * 
 * 展示如何使用健壮的 API 客户端来避免常见的 API 错误
 * 包括自动重试、备用服务切换等功能
 */

import { createRobustApiClient, createRecommendedClient } from '../packages/core/src/utils/robust-api-client.js';
import { AuthType } from '../packages/core/src/core/contentGenerator.js';

async function demonstrateRobustApiUsage() {
  console.log('🛡️ 健壮 API 客户端示例');
  console.log('='.repeat(60));
  console.log('此示例展示如何使用健壮的 API 客户端避免常见错误\n');

  try {
    // 方案 1：使用推荐配置（DailiCode + Gemini 备用）
    console.log('📋 方案 1: 使用推荐配置');
    console.log('-'.repeat(40));
    
    const recommendedClient = await createRecommendedClient();
    
    // 检查服务状态
    const status = recommendedClient.getStatus();
    console.log('📊 服务状态:');
    console.log(`   主要服务 (${status.primary.type}): ${status.primary.available ? '✅ 可用' : '❌ 不可用'}`);
    console.log(`   备用服务 (${status.fallback.type}): ${status.fallback.available ? '✅ 可用' : '❌ 不可用'}`);
    console.log('');

    // 测试内容生成
    console.log('🧪 测试内容生成...');
    const response1 = await recommendedClient.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: '请简单介绍一下人工智能' }]
      }]
    });
    
    console.log('✅ 内容生成成功');
    console.log('📄 生成结果:', response1.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100) + '...');
    console.log('');

    // 测试令牌计数
    console.log('🔢 测试令牌计数...');
    const tokenResponse = await recommendedClient.countTokens({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: '这是一个测试文本，用于计算令牌数量。' }]
      }]
    });
    
    console.log('✅ 令牌计数成功');
    console.log('📊 令牌数量:', tokenResponse.totalTokens);
    console.log('');

  } catch (error) {
    console.error('❌ 推荐配置失败:', error.message);
    console.log('💡 建议检查环境变量配置\n');
  }

  try {
    // 方案 2：自定义配置（Gemini 主要 + DailiCode 备用）
    console.log('📋 方案 2: 自定义配置');
    console.log('-'.repeat(40));
    
    const customClient = await createRobustApiClient(
      AuthType.USE_GEMINI,  // 主要服务
      'gemini-1.5-flash',
      {
        enableFallback: true,
        fallbackAuthType: AuthType.DAILICODE_OAUTH,  // 备用服务
        maxRetries: 2,
        retryDelay: 500,
        timeout: 15000
      }
    );

    const customStatus = customClient.getStatus();
    console.log('📊 自定义客户端状态:');
    console.log(`   主要服务 (${customStatus.primary.type}): ${customStatus.primary.available ? '✅ 可用' : '❌ 不可用'}`);
    console.log(`   备用服务 (${customStatus.fallback.type}): ${customStatus.fallback.available ? '✅ 可用' : '❌ 不可用'}`);
    console.log('');

    // 测试流式生成
    console.log('🌊 测试流式生成...');
    const streamGenerator = await customClient.generateContentStream({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: '请逐步解释什么是机器学习' }]
      }]
    });

    console.log('📄 流式结果:');
    let chunkCount = 0;
    for await (const chunk of streamGenerator) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) {
        process.stdout.write(text);
        chunkCount++;
      }
      
      // 限制输出长度
      if (chunkCount > 5) {
        console.log('\n... (输出已截断)');
        break;
      }
    }
    console.log('\n✅ 流式生成成功\n');

  } catch (error) {
    console.error('❌ 自定义配置失败:', error.message);
    console.log('💡 这可能是由于网络问题或 API 配置错误\n');
  }

  // 方案 3：错误处理演示
  console.log('📋 方案 3: 错误处理演示');
  console.log('-'.repeat(40));
  
  try {
    // 创建一个故意会失败的客户端（使用无效的认证类型）
    const faultyClient = await createRobustApiClient(
      'invalid-auth-type' as AuthType,  // 故意使用无效类型
      'gemini-1.5-flash',
      {
        enableFallback: true,
        fallbackAuthType: AuthType.DAILICODE_OAUTH,
        maxRetries: 1
      }
    );

    await faultyClient.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: '测试错误处理' }]
      }]
    });

  } catch (error) {
    console.log('✅ 错误处理正常工作');
    console.log('📝 错误信息:', error.message);
    console.log('💡 系统会自动尝试备用服务或重试\n');
  }

  // 使用建议
  console.log('💡 使用建议');
  console.log('='.repeat(60));
  console.log('1. 推荐使用 DailiCode 作为主要服务（稳定可靠）');
  console.log('2. 配置 Gemini API Key 作为备用服务');
  console.log('3. 启用自动重试和超时保护');
  console.log('4. 监控服务状态，及时切换');
  console.log('');
  console.log('📝 环境变量配置:');
  console.log('   DAILICODE_CLIENT_ID="your-dailicode-client-id"');
  console.log('   DAILICODE_CLIENT_SECRET="your-dailicode-client-secret"');
  console.log('   GEMINI_API_KEY="your-gemini-api-key"');
  console.log('');
  console.log('🔧 故障排除:');
  console.log('   • 运行: node scripts/test-auth-methods.js');
  console.log('   • 运行: node scripts/quick-api-test.js');
  console.log('   • 查看: GEMINI_API_ERROR_FIX.md');
}

// 简单的使用示例
async function simpleUsageExample() {
  console.log('\n🚀 简单使用示例');
  console.log('='.repeat(60));
  
  try {
    // 一行代码创建健壮的客户端
    const client = await createRecommendedClient();
    
    // 正常使用，无需担心错误处理
    const response = await client.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: '你好！' }]
      }]
    });
    
    console.log('✅ 简单使用成功');
    console.log('📄 响应:', response.candidates?.[0]?.content?.parts?.[0]?.text);
    
  } catch (error) {
    console.error('❌ 简单使用失败:', error.message);
    console.log('💡 请检查环境变量配置或网络连接');
  }
}

// 运行示例
async function main() {
  await demonstrateRobustApiUsage();
  await simpleUsageExample();
  
  console.log('\n🎉 示例演示完成！');
  console.log('现在你可以在项目中使用健壮的 API 客户端来避免常见错误。');
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { demonstrateRobustApiUsage, simpleUsageExample };