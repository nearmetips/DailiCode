#!/usr/bin/env node

/**
 * 快速 API 连接测试工具
 * 
 * 用于快速诊断 API 连接问题
 */

async function testGoogleCodeAssist() {
  console.log('🔍 测试 Google Code Assist API...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://cloudcode-pa.googleapis.com/v1internal:countTokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'test' }] }]
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('✅ Google Code Assist API 连接成功');
      return true;
    } else {
      console.log(`❌ Google Code Assist API 错误: HTTP ${response.status} - ${response.statusText}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏱️ Google Code Assist API 连接超时');
    } else {
      console.log(`❌ Google Code Assist API 连接失败: ${error.message}`);
    }
    return false;
  }
}

async function testDailicodeApi() {
  console.log('🔍 测试 DailiCode API...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://www.dailicode.com', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok || response.status === 404) {
      console.log('✅ DailiCode API 连接成功');
      return true;
    } else {
      console.log(`⚠️ DailiCode API 响应: HTTP ${response.status} - ${response.statusText}`);
      return true; // 服务器响应表示连接正常
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏱️ DailiCode API 连接超时');
    } else {
      console.log(`❌ DailiCode API 连接失败: ${error.message}`);
    }
    return false;
  }
}

async function testNetworkConnectivity() {
  console.log('📡 测试基本网络连接...');
  
  const testUrls = [
    'https://www.google.com',
    'https://www.github.com'
  ];
  
  let successCount = 0;
  
  for (const url of testUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ ${new URL(url).hostname} 连接成功`);
        successCount++;
      } else {
        console.log(`⚠️ ${new URL(url).hostname} 响应异常: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${new URL(url).hostname} 连接失败: ${error.message}`);
    }
  }
  
  return successCount > 0;
}

async function main() {
  console.log('🚀 API 连接快速测试');
  console.log('='.repeat(50));
  console.log('正在测试各项服务的连接状态...\n');
  
  // 测试网络连接
  const networkOk = await testNetworkConnectivity();
  console.log('');
  
  // 测试 Google Code Assist
  const googleOk = await testGoogleCodeAssist();
  console.log('');
  
  // 测试 DailiCode
  const dailicodeOk = await testDailicodeApi();
  console.log('');
  
  // 生成建议
  console.log('💡 建议和解决方案');
  console.log('='.repeat(50));
  
  if (!networkOk) {
    console.log('❌ 网络连接存在问题');
    console.log('   • 检查网络设置');
    console.log('   • 检查防火墙和代理配置');
    console.log('');
  }
  
  if (!googleOk && dailicodeOk) {
    console.log('🎯 推荐使用 DailiCode 作为主要服务');
    console.log('   • Google Code Assist 不可用');
    console.log('   • DailiCode 连接正常');
    console.log('   • 在代码中使用 AuthType.DAILICODE_OAUTH');
    console.log('');
    console.log('📝 配置步骤:');
    console.log('   1. 在 .env 文件中添加:');
    console.log('      DAILICODE_CLIENT_ID="your-client-id"');
    console.log('      DAILICODE_CLIENT_SECRET="your-client-secret"');
    console.log('');
    console.log('   2. 在代码中使用:');
    console.log('      AuthType.DAILICODE_OAUTH');
    console.log('');
  } else if (googleOk && !dailicodeOk) {
    console.log('✅ Google Code Assist 可用');
    console.log('   • 继续使用 AuthType.LOGIN_WITH_GOOGLE');
    console.log('   • DailiCode 暂时不可用');
    console.log('');
  } else if (googleOk && dailicodeOk) {
    console.log('🎉 两个服务都可用！');
    console.log('   • 可以选择任一服务');
    console.log('   • 建议使用 DailiCode 作为主要服务（更稳定）');
    console.log('   • Google Code Assist 作为备用');
    console.log('');
  } else {
    console.log('⚠️ 两个服务都不可用');
    console.log('   • 检查网络连接');
    console.log('   • 考虑使用 AuthType.USE_GEMINI（需要 API Key）');
    console.log('   • 或使用 AuthType.CUSTOM_LLM_API');
    console.log('');
  }
  
  console.log('📚 更多信息:');
  console.log('   • 详细文档: docs/dailicode-integration.md');
  console.log('   • 快速修复: API_ERROR_QUICK_FIX.md');
  console.log('   • 示例代码: examples/dailicode-example.ts');
}

main().catch(console.error);