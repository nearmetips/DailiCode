#!/usr/bin/env node

/**
 * 测试不同认证方式的脚本
 * 
 * 用于验证各种认证方法是否正常工作
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取环境变量
function loadEnvVars() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim().replace(/['"]/g, '');
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('⚠️ 无法读取 .env 文件');
    return {};
  }
}

function checkAuthMethod(name, requiredVars, envVars) {
  console.log(`\n🔍 检查 ${name}:`);
  
  const missing = [];
  const configured = [];
  
  for (const varName of requiredVars) {
    if (envVars[varName] && envVars[varName] !== 'your-' + varName.toLowerCase().replace(/_/g, '-') + '-here') {
      configured.push(varName);
      console.log(`  ✅ ${varName}: 已配置`);
    } else {
      missing.push(varName);
      console.log(`  ❌ ${varName}: 未配置或使用占位符`);
    }
  }
  
  const isReady = missing.length === 0;
  console.log(`  📊 状态: ${isReady ? '✅ 可用' : '❌ 需要配置'}`);
  
  if (!isReady) {
    console.log(`  💡 需要配置: ${missing.join(', ')}`);
  }
  
  return { name, isReady, configured, missing };
}

async function main() {
  console.log('🔐 认证方式检查工具');
  console.log('='.repeat(50));
  
  const envVars = loadEnvVars();
  console.log(`📁 环境变量加载: ${Object.keys(envVars).length} 个变量`);
  
  // 检查各种认证方式
  const results = [];
  
  // Google OAuth
  results.push(checkAuthMethod(
    'Google OAuth',
    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    envVars
  ));
  
  // DailiCode OAuth
  results.push(checkAuthMethod(
    'DailiCode OAuth',
    ['DAILICODE_CLIENT_ID', 'DAILICODE_CLIENT_SECRET'],
    envVars
  ));
  
  // Gemini API Key
  results.push(checkAuthMethod(
    'Gemini API Key',
    ['GEMINI_API_KEY'],
    envVars
  ));
  
  // 生成建议
  console.log('\n💡 建议和下一步');
  console.log('='.repeat(50));
  
  const readyMethods = results.filter(r => r.isReady);
  const notReadyMethods = results.filter(r => !r.isReady);
  
  if (readyMethods.length > 0) {
    console.log('✅ 可用的认证方式:');
    readyMethods.forEach(method => {
      console.log(`   • ${method.name}`);
    });
    
    console.log('\n🚀 推荐使用顺序:');
    if (readyMethods.find(m => m.name === 'DailiCode OAuth')) {
      console.log('   1. DailiCode OAuth (推荐 - 稳定可靠)');
    }
    if (readyMethods.find(m => m.name === 'Gemini API Key')) {
      console.log('   2. Gemini API Key (简单直接)');
    }
    if (readyMethods.find(m => m.name === 'Google OAuth')) {
      console.log('   3. Google OAuth (功能完整但配置复杂)');
    }
  } else {
    console.log('❌ 没有可用的认证方式');
    console.log('\n🔧 快速配置建议:');
    console.log('   选择以下任一方式进行配置:');
    console.log('');
    console.log('   方式 1: DailiCode (推荐)');
    console.log('   • 访问 https://www.dailicode.com/developer');
    console.log('   • 创建应用获取凭据');
    console.log('   • 在 .env 中配置 DAILICODE_CLIENT_ID 和 DAILICODE_CLIENT_SECRET');
    console.log('');
    console.log('   方式 2: Gemini API Key (最简单)');
    console.log('   • 访问 https://makersuite.google.com/app/apikey');
    console.log('   • 创建 API Key');
    console.log('   • 在 .env 中配置 GEMINI_API_KEY');
  }
  
  if (notReadyMethods.length > 0) {
    console.log('\n⚠️ 需要配置的认证方式:');
    notReadyMethods.forEach(method => {
      console.log(`   • ${method.name}: ${method.missing.join(', ')}`);
    });
  }
  
  // 代码示例
  if (readyMethods.length > 0) {
    console.log('\n📝 代码示例:');
    console.log('-'.repeat(30));
    
    if (readyMethods.find(m => m.name === 'DailiCode OAuth')) {
      console.log('// 使用 DailiCode OAuth');
      console.log('const config = await createContentGeneratorConfig(');
      console.log('  "gemini-1.5-flash",');
      console.log('  AuthType.DAILICODE_OAUTH');
      console.log(');');
      console.log('');
    }
    
    if (readyMethods.find(m => m.name === 'Gemini API Key')) {
      console.log('// 使用 Gemini API Key');
      console.log('const config = await createContentGeneratorConfig(');
      console.log('  "gemini-1.5-flash",');
      console.log('  AuthType.USE_GEMINI');
      console.log(');');
      console.log('');
    }
    
    console.log('// 创建生成器并使用');
    console.log('const generator = await createContentGenerator(config);');
    console.log('const response = await generator.generateContent({...});');
  }
  
  console.log('\n📚 更多帮助:');
  console.log('   • Google OAuth 问题: GOOGLE_OAUTH_FIX.md');
  console.log('   • API 连接问题: API_ERROR_QUICK_FIX.md');
  console.log('   • DailiCode 文档: docs/dailicode-integration.md');
  console.log('   • 测试连接: node scripts/quick-api-test.js');
}

main().catch(console.error);