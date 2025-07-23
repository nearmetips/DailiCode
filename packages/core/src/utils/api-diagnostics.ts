/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '../core/contentGenerator.js';

export interface ApiDiagnosticResult {
  service: string;
  status: 'success' | 'error' | 'timeout';
  error?: string;
  responseTime?: number;
  details?: any;
}

export class ApiDiagnostics {
  /**
   * 诊断 Google Code Assist API 连接
   */
  static async diagnoseGoogleCodeAssist(): Promise<ApiDiagnosticResult> {
    const startTime = Date.now();
    const endpoint = 'https://cloudcode-pa.googleapis.com';
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch(`${endpoint}/v1internal:countTokens`, {
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
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'Google Code Assist',
          status: 'success',
          responseTime,
          details: { statusCode: response.status }
        };
      } else {
        return {
          service: 'Google Code Assist',
          status: 'error',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: { statusCode: response.status }
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        return {
          service: 'Google Code Assist',
          status: 'timeout',
          responseTime,
          error: 'Request timeout (10s)',
          details: { timeout: true }
        };
      }
      
      return {
        service: 'Google Code Assist',
        status: 'error',
        responseTime,
        error: error.message || 'Unknown error',
        details: { errorType: error.name }
      };
    }
  }

  /**
   * 诊断 DailiCode API 连接
   */
  static async diagnoseDailicodeApi(): Promise<ApiDiagnosticResult> {
    const startTime = Date.now();
    const endpoint = 'https://www.dailicode.com';
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      // 测试基本连接性
      const response = await fetch(`${endpoint}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok || response.status === 404) { // 404 也表示服务器可达
        return {
          service: 'DailiCode API',
          status: 'success',
          responseTime,
          details: { statusCode: response.status, note: 'Service reachable' }
        };
      } else {
        return {
          service: 'DailiCode API',
          status: 'error',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: { statusCode: response.status }
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        return {
          service: 'DailiCode API',
          status: 'timeout',
          responseTime,
          error: 'Request timeout (10s)',
          details: { timeout: true }
        };
      }
      
      return {
        service: 'DailiCode API',
        status: 'error',
        responseTime,
        error: error.message || 'Unknown error',
        details: { errorType: error.name }
      };
    }
  }

  /**
   * 诊断网络连接
   */
  static async diagnoseNetworkConnectivity(): Promise<ApiDiagnosticResult[]> {
    const testUrls = [
      'https://www.google.com',
      'https://www.github.com',
      'https://www.dailicode.com'
    ];
    
    const results: ApiDiagnosticResult[] = [];
    
    for (const url of testUrls) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        results.push({
          service: `Network (${new URL(url).hostname})`,
          status: response.ok ? 'success' : 'error',
          responseTime,
          error: response.ok ? undefined : `HTTP ${response.status}`,
          details: { statusCode: response.status }
        });
      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        results.push({
          service: `Network (${new URL(url).hostname})`,
          status: error.name === 'AbortError' ? 'timeout' : 'error',
          responseTime,
          error: error.message,
          details: { errorType: error.name }
        });
      }
    }
    
    return results;
  }

  /**
   * 运行完整的 API 诊断
   */
  static async runFullDiagnostics(): Promise<{
    summary: string;
    results: ApiDiagnosticResult[];
    recommendations: string[];
  }> {
    console.log('🔍 开始 API 连接诊断...\n');
    
    const results: ApiDiagnosticResult[] = [];
    
    // 网络连接测试
    console.log('📡 测试网络连接...');
    const networkResults = await this.diagnoseNetworkConnectivity();
    results.push(...networkResults);
    
    // Google Code Assist API 测试
    console.log('🔍 测试 Google Code Assist API...');
    const googleResult = await this.diagnoseGoogleCodeAssist();
    results.push(googleResult);
    
    // DailiCode API 测试
    console.log('🔍 测试 DailiCode API...');
    const dailicodeResult = await this.diagnoseDailicodeApi();
    results.push(dailicodeResult);
    
    // 生成摘要和建议
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const timeoutCount = results.filter(r => r.status === 'timeout').length;
    
    const summary = `诊断完成: ${successCount} 成功, ${errorCount} 错误, ${timeoutCount} 超时`;
    
    const recommendations: string[] = [];
    
    if (googleResult.status === 'error' || googleResult.status === 'timeout') {
      recommendations.push('Google Code Assist API 不可用，建议使用 DailiCode 作为替代方案');
      recommendations.push('检查网络连接和防火墙设置');
      recommendations.push('验证 Google OAuth 凭据配置');
    }
    
    if (dailicodeResult.status === 'success') {
      recommendations.push('DailiCode API 连接正常，可以作为主要或备用服务');
    }
    
    if (networkResults.some(r => r.status !== 'success')) {
      recommendations.push('检测到网络连接问题，请检查代理设置或网络配置');
    }
    
    return { summary, results, recommendations };
  }

  /**
   * 打印诊断结果
   */
  static printDiagnosticResults(diagnostics: {
    summary: string;
    results: ApiDiagnosticResult[];
    recommendations: string[];
  }): void {
    console.log('\n📊 诊断结果摘要');
    console.log('='.repeat(50));
    console.log(diagnostics.summary);
    
    console.log('\n📋 详细结果');
    console.log('-'.repeat(50));
    
    for (const result of diagnostics.results) {
      const statusIcon = result.status === 'success' ? '✅' : 
                        result.status === 'timeout' ? '⏱️' : '❌';
      
      console.log(`${statusIcon} ${result.service}`);
      console.log(`   状态: ${result.status}`);
      if (result.responseTime) {
        console.log(`   响应时间: ${result.responseTime}ms`);
      }
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
      console.log('');
    }
    
    if (diagnostics.recommendations.length > 0) {
      console.log('💡 建议');
      console.log('-'.repeat(50));
      for (const recommendation of diagnostics.recommendations) {
        console.log(`• ${recommendation}`);
      }
    }
  }
}

/**
 * 获取推荐的认证类型
 */
export async function getRecommendedAuthType(): Promise<{
  primary: AuthType;
  fallback: AuthType;
  reason: string;
}> {
  const googleResult = await ApiDiagnostics.diagnoseGoogleCodeAssist();
  const dailicodeResult = await ApiDiagnostics.diagnoseDailicodeApi();
  
  if (googleResult.status === 'success' && dailicodeResult.status === 'success') {
    return {
      primary: AuthType.LOGIN_WITH_GOOGLE,
      fallback: AuthType.DAILICODE_OAUTH,
      reason: '两个服务都可用，推荐使用 Google 作为主要服务，DailiCode 作为备用'
    };
  } else if (googleResult.status !== 'success' && dailicodeResult.status === 'success') {
    return {
      primary: AuthType.DAILICODE_OAUTH,
      fallback: AuthType.USE_GEMINI,
      reason: 'Google Code Assist 不可用，推荐使用 DailiCode 作为主要服务'
    };
  } else if (googleResult.status === 'success' && dailicodeResult.status !== 'success') {
    return {
      primary: AuthType.LOGIN_WITH_GOOGLE,
      fallback: AuthType.USE_GEMINI,
      reason: 'DailiCode 不可用，使用 Google Code Assist 作为主要服务'
    };
  } else {
    return {
      primary: AuthType.USE_GEMINI,
      fallback: AuthType.CUSTOM_LLM_API,
      reason: '外部服务都不可用，建议使用 Gemini API Key 或自定义 LLM'
    };
  }
}