// backend/jobs/fetchNewVideos.js
// 获取新视频的定时任务
const smartFetcher = require('../services/smartFetcher');
const { AI_CHANNELS } = require('../config/channels');
const logger = require('../utils/logger');
const { quotaManager } = require('../config/youtube');

async function fetchNewVideos() {
  try {
    logger.info('开始执行: 获取新视频任务');
    
    // 检查配额
    if (quotaManager.getRemaining() < 1000) {
      logger.warn('API配额不足1000，跳过获取新视频');
      return;
    }
    
    const activeChannels = AI_CHANNELS.filter(ch => ch.isActive !== false);
    let totalNewVideos = 0;
    
    for (const channel of activeChannels) {
      try {
        const newVideos = await smartFetcher.fetchNewVideosForChannel(channel.id);
        totalNewVideos += newVideos.length;
        
        if (newVideos.length > 0) {
          logger.info(`频道 ${channel.name} 发现 ${newVideos.length} 个新视频`);
        }
        
        // 添加延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error(`处理频道 ${channel.name} 时出错: ${error.message}`);
      }
    }
    
    logger.info(`获取新视频任务完成，共发现 ${totalNewVideos} 个新视频`);
    logger.info(`剩余API配额: ${quotaManager.getRemaining()}`);
    
  } catch (error) {
    logger.error(`获取新视频任务失败: ${error.message}`);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  fetchNewVideos().then(() => {
    console.log('任务完成');
    process.exit(0);
  }).catch(error => {
    console.error('任务失败:', error);
    process.exit(1);
  });
}

module.exports = fetchNewVideos;

// backend/jobs/updateVideoStats.js
// 更新视频统计的定时任务
const smartFetcher = require('../services/smartFetcher');
const logger = require('../utils/logger');
const { quotaManager } = require('../config/youtube');

async function updateVideoStats() {
  try {
    logger.info('开始执行: 更新视频统计任务');
    
    // 检查配额
    if (quotaManager.getRemaining() < 2000) {
      logger.warn('API配额不足2000，跳过更新视频统计');
      return;
    }
    
    await smartFetcher.updateVideoStatistics();
    
    logger.info('更新视频统计任务完成');
    logger.info(`剩余API配额: ${quotaManager.getRemaining()}`);
    
  } catch (error) {
    logger.error(`更新视频统计任务失败: ${error.message}`);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  updateVideoStats().then(() => {
    console.log('任务完成');
    process.exit(0);
  }).catch(error => {
    console.error('任务失败:', error);
    process.exit(1);
  });
}

module.exports = updateVideoStats;

// backend/jobs/generateRankings.js
// 生成榜单的定时任务
const rankingAlgorithm = require('../services/rankingAlgorithm');
const logger = require('../utils/logger');
const { getDb } = require('../config/database');

async function generateRankings() {
  try {
    logger.info('开始执行: 生成每日榜单任务');
    
    const result = await rankingAlgorithm.generateDailyRankings();
    
    // 记录榜单生成结果
    const db = await getDb();
    await db.run(`
      INSERT INTO system_logs (log_type, message, details)
      VALUES ('ranking_generation', '每日榜单生成完成', ?)
    `, JSON.stringify({
      shorts_count: result.shorts.length,
      long_videos_count: result.longVideos.length,
      generated_at: new Date().toISOString()
    }));
    
    logger.info(`生成榜单任务完成: Shorts ${result.shorts.length} 个, 长视频 ${result.longVideos.length} 个`);
    
  } catch (error) {
    logger.error(`生成榜单任务失败: ${error.message}`);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  generateRankings().then(() => {
    console.log('任务完成');
    process.exit(0);
  }).catch(error => {
    console.error('任务失败:', error);
    process.exit(1);
  });
}

module.exports = generateRankings;