const testConnectionScript = `
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const PROXY_URL = process.env.PROXY_URL || 'http://127.0.0.1:7890';
const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyBa4HftrclnGNjRRCUCCEnnI4hF3hZdUWo';

console.log('🔍 YouTube API 连接测试\\n');
console.log('代理地址:', PROXY_URL);
console.log('API密钥:', API_KEY.substring(0, 10) + '...');
console.log('\\n开始测试...\\n');

async function testDirectConnection() {
  console.log('1. 测试直接连接...');
  try {
    const response = await axios.get(
      \`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=\${API_KEY}\`,
      { timeout: 10000 }
    );
    console.log('✅ 直接连接成功！');
    return true;
  } catch (error) {
    console.log('❌ 直接连接失败:', error.message);
    return false;
  }
}

async function testProxyConnection() {
  console.log('\\n2. 测试代理连接...');
  try {
    const agent = new HttpsProxyAgent(PROXY_URL);
    const response = await axios.get(
      \`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=\${API_KEY}\`,
      {
        timeout: 10000,
        httpsAgent: agent,
        proxy: false
      }
    );
    console.log('✅ 代理连接成功！');
    console.log('视频标题:', response.data.items[0].snippet.title);
    return true;
  } catch (error) {
    console.log('❌ 代理连接失败:', error.message);
    return false;
  }
}

async function testProxyServer() {
  console.log('\\n3. 测试本地代理服务器...');
  try {
    const response = await axios.get('http://127.0.0.1:7890', { 
      timeout: 3000,
      validateStatus: () => true 
    });
    console.log('✅ 代理服务器响应正常');
    return true;
  } catch (error) {
    console.log('❌ 无法连接到代理服务器');
    console.log('   请确保你的VPN/代理软件正在运行');
    return false;
  }
}

async function runTests() {
  // 先测试代理服务器
  const proxyServerOk = await testProxyServer();
  
  // 测试直接连接
  const directOk = await testDirectConnection();
  
  // 测试代理连接
  const proxyOk = await testProxyConnection();
  
  console.log('\n========== 测试结果 ==========');
  console.log(`代理服务器: ${proxyServerOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`直接连接: ${directOk ? '✅ 成功' : '❌ 失败'}`);
  console.log(`代理连接: ${proxyOk ? '✅ 成功' : '❌ 失败'}`);
  
  if (proxyOk) {
    console.log('\n✨ 建议使用代理模式运行服务器');
  } else if (directOk) {
    console.log('\n💡 建议使用直接连接模式（设置 USE_PROXY=false）');
  } else {
    console.log('\n⚠️  无法连接到YouTube API，请检查：');
    console.log('   1. API密钥是否有效');
    console.log('   2. 代理服务器是否正常运行');
    console.log('   3. 网络连接是否正常');
  }
}

runTests();
`;