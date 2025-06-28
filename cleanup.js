const fs = require('fs');
const path = require('path');

console.log('🧹 开始清理项目...\n');

// 需要删除的文件和文件夹
const filesToDelete = [
  // 如果有这些文件，删除它们
  'backend/controllers',  // 空文件夹
  'backend/models',       // 空文件夹
  'backend/routes',       // 空文件夹
  'backend/middleware',   // 空文件夹
  'tests',               // 测试文件夹（如果暂时不需要）
  'docs',                // 文档文件夹（如果为空）
  '.env.example',        // 示例文件
  'yarn.lock',           // 如果使用npm
  'pnpm-lock.yaml',      // 如果使用npm
];

// 需要保留的核心文件
const coreFiles = {
  backend: [
    'server.js',
    'package.json',
    'package-lock.json',
    '.env',
    'node_modules',
    'database',
    'config',
    'services',
    'jobs',
    'utils'
  ],
  frontend: [
    'index.html'
  ],
  root: [
    '.gitignore',
    'README.md',
    'package.json'
  ]
};

// 删除文件或文件夹
function deleteItem(itemPath) {
  try {
    if (fs.existsSync(itemPath)) {
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        // 检查是否为空文件夹
        const files = fs.readdirSync(itemPath);
        if (files.length === 0) {
          fs.rmdirSync(itemPath);
          console.log(`✅ 删除空文件夹: ${itemPath}`);
        } else {
          console.log(`⏭️  跳过非空文件夹: ${itemPath}`);
        }
      } else {
        fs.unlinkSync(itemPath);
        console.log(`✅ 删除文件: ${itemPath}`);
      }
    }
  } catch (error) {
    console.error(`❌ 删除失败 ${itemPath}: ${error.message}`);
  }
}

// 执行清理
filesToDelete.forEach(item => {
  deleteItem(path.join(__dirname, item));
});

console.log('\n📋 项目结构优化建议：');
console.log(`
保留以下核心结构：
├── backend/
│   ├── server.js          # 主服务器文件
│   ├── database/          # 数据库文件
│   ├── package.json       # 后端依赖
│   └── .env              # 环境变量
├── frontend/
│   └── index.html        # 前端页面
├── logs/                 # 日志文件夹
├── scripts/              # 脚本文件
├── .gitignore           # Git忽略配置
└── README.md            # 项目说明
`);

console.log('✅ 清理完成！');