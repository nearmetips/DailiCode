#!/usr/bin/env node

/**
 * API 连接诊断工具
 * 
 * 用于诊断 Google Code Assist API 和 DailiCode API 的连接问题
 * 
 * 使用方法:
 * node scripts/diagnose-api.js
 */

import { ApiDiagnostics, getRecommendedAuthType } from '../packages/core/src/utils/api-diagnostics.js';

async function main() {
  console.log('🚀 API 连接诊断工具');
  console.log('='.repeat(60));
  console.log('此工具将帮助诊断 API 连接问题并提供解决建议\n');

  try {
    // 运行完整诊断
    const diagnostics = await ApiDiagnostics.runFullDiagnostics();
    
    // 打印结果
    ApiDiagnostics.printDiagnosticResults(diagnostics);
    
    // 获取推荐的认证类型
    console.log('\n🎯 推荐配置');
    console.log('-'.repeat(50));
    
    const recommendation = await getRecommendedAuthType();
    console.log(`主要认证方式: ${recommendation.primary}`);
    console.log(`备用认证方式: ${recommendation.fallback}`);
    console.log(`原因: ${recommendation.reason}`);
    
    // 提供具体的解决方案
    console.log('\n🔧 解决方案');
    console.log('-'.repeat(50));
    
    if (recommendation.primary === 'dailicode-oauth') {
      console.log('推荐使用 DailiCode 作为主要服务:');
      console.log('');
      console.log('1. 在 .env 文件中配置 DailiCode 凭据:');
      console.log('   DAILICODE_CLIENT_ID="your-dailicode-client-id"');
      console.log('   DAILICODE_CLIENT_SECRET="your-dailicode-client-secret"');
      console.log('');
      console.log('2. 在代码中使用 DailiCode 认证:');
      console.log('   const config = await createContentGeneratorConfig(');
      console.log('     "gemini-1.5-flash",');
      console.log('     AuthType.DAILICODE_OAUTH');
      console.log('   );');
      console.log('');
      console.log('3. DailiCode 的优势:');
      console.log('   • 稳定的网络连接');
      console.log('   • 完整的功能支持');
      console.log('   • 良好的性能表现');
    } else if (diagnostics.results.find(r => r.service === 'Google Code Assist' && r.status === 'error')) {
      console.log('Google Code Assist API 连接问题的可能解决方案:');
      console.log('');
      console.log('1. 检查网络连接:');
      console.log('   • 确保可以访问 https://cloudcode-pa.googleapis.com');
      console.log('   • 检查防火墙和代理设置');
      console.log('');
      console.log('2. 验证认证配置:');
      console.log('   • 检查 .env 文件中的 Google OAuth 凭据');
      console.log('   • 确保 OAuth 客户端配置正确');
      console.log('');
      console.log('3. 使用 DailiCode 作为替代方案:');
      console.log('   • DailiCode 提供相同的功能');
      console.log('   • 更稳定的网络连接');
      console.log('   • 简单的配置过程');
    }
    
    console.log('\n📞 获取帮助');
    console.log('-'.repeat(50));
    console.log('如果问题持续存在，请:');
    console.log('• 检查项目文档: docs/dailicode-integration.md');
    console.log('• 查看示例代码: examples/dailicode-example.ts');
    console.log('• 确保环境变量正确配置');
    
  } catch (error) {
    console.error('❌ 诊断过程中出现错误:', error.message);
    console.log('\n🔧 基本故障排除:');
    console.log('1. 检查网络连接');
    console.log('2. 验证环境变量配置');
    console.log('3. 尝试使用 DailiCode 作为替代方案');
  }
}

// 运行诊断
main().catch(console.error);