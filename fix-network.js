const fixNetworkScript = `
// 网络问题诊断和修复脚本
const axios = require('axios');
const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

console.log('🔍 诊断网络连接...\n');

async function testConnections() {
  const tests = [
    {
      name: 'DNS解析测试',
      test: async () => {
        const result = await lookup('youtube.googleapis.com');
        return \`YouTube API域名解析成功: \${result.address}\`;
      }
    },
    {
      name: 'Google连接测试',
      test: async () => {
        const response = await axios.get('https://www.google.com', { timeout: 5000 });
        return 'Google连接正常';
      }
    },
    {
      name: 'YouTube API测试',
      test: async () => {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=AIzaSyBa4HftrclnGNjRRCUCCEnnI4hF3hZdUWo', { timeout: 10000 });
        return 'YouTube API连接正常';
      }
    }
  ];

  for (const { name, test } of tests) {
    try {
      console.log(\`正在测试: \${name}...\`);
      const result = await test();
      console.log(\`✅ \${result}\`);
    } catch (error) {
      console.log(\`❌ \${name} 失败: \${error.message}\`);
      
      // 提供解决方案
      if (error.code === 'ETIMEDOUT') {
        console.log('   💡 建议: 可能需要使用代理或VPN');
      } else if (error.code === 'ENOTFOUND') {
        console.log('   💡 建议: 检查DNS设置，尝试使用 8.8.8.8');
      }
    }
    console.log('');
  }
}

testConnections().then(() => {
  console.log('诊断完成！');
  console.log('\\n如果YouTube API无法连接，可以：');
  console.log('1. 使用VPN或代理');
  console.log('2. 修改DNS为 8.8.8.8 或 1.1.1.1');
  console.log('3. 检查防火墙设置');
  console.log('4. 使用备用API密钥');
});
`;

fs.writeFileSync(path.join(__dirname, 'backend', 'fix-network.js'), fixNetworkScript);
console.log('\n✅ 已创建 backend/fix-network.js');