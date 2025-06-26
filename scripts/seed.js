const { getDb } = require('../backend/config/database');
const { AI_CHANNELS } = require('../backend/config/channels');

async function seedChannels() {
  console.log('开始插入频道数据...');
  const db = await getDb();
  
  for (const channel of AI_CHANNELS) {
    try {
      await db.run(`
        INSERT OR IGNORE INTO channels (id, name, is_active)
        VALUES (?, ?, 1)
      `, [channel.id, channel.name]);
      console.log(`✅ 插入频道: ${channel.name}`);
    } catch (error) {
      console.error(`❌ 插入频道失败 ${channel.name}:`, error.message);
    }
  }
  
  console.log('频道数据插入完成！');
  await db.close();
}

seedChannels();