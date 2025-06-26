// backend/config/channels.js
// AI频道列表配置文件
module.exports = {
  // 核心AI频道列表
  AI_CHANNELS: [
    // AI新闻与评论
    { id: "UCbfYPyITQ-7l4upoX8nvctg", name: "Two Minute Papers", category: "AI News" },
    { id: "UCgBfm4GdqLzWJXP2bIQ5y8Q", name: "AI Explained", category: "AI News" },
    { id: "UCMLtBahI5DMrt0NPvDSoIRQ", name: "Yannic Kilcher", category: "AI Research" },
    
    // AI教程与技术
    { id: "UC8butISFwT-Wl7EV0hUK0BQ", name: "freeCodeCamp.org", category: "AI Tutorial" },
    { id: "UCfzlCWGWYyIQ0aLC5w48gBQ", name: "Sentdex", category: "AI Tutorial" },
    { id: "UCZHmQk67mSJgfCCTn7xBfew", name: "Corey Schafer", category: "Programming" },
    
    // AI工具评测
    { id: "UCq6VFHwMzcMXbuKyG7SQYIg", name: "Matt Wolfe", category: "AI Tools" },
    { id: "UCtYLUTtgS3k1Fg4y5tAhLbw", name: "Fireship", category: "Tech News" },
    
    // 机器学习研究
    { id: "UCYO_jab_esuFRV4b17AJtAw", name: "3Blue1Brown", category: "Math & ML" },
    { id: "UCXZCJLdBC09xxGZ6gcdrc6A", name: "Computerphile", category: "Computer Science" },
    
    // 更多AI频道
    { id: "UCgv2QDANYsj5_6dYH5EHjjg", name: "The AI Advantage", category: "AI Tools" },
    { id: "UCbS3-Hi6txxVaagsFvDcGmw", name: "AI Revolution", category: "AI News" },
  ],
  
  // 频道分类
  CATEGORIES: ["AI News", "AI Research", "AI Tutorial", "AI Tools", "Programming", "Math & ML", "Computer Science", "Tech News"],
  
  // 获取活跃频道
  getActiveChannels() {
    return this.AI_CHANNELS.filter(channel => channel.isActive !== false);
  },
  
  // 按分类获取频道
  getChannelsByCategory(category) {
    return this.AI_CHANNELS.filter(channel => channel.category === category);
  }
};

// backend/config/database.js
// 数据库配置文件
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'youtube_ranking.db');

async function getDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

module.exports = { getDb };

// backend/config/youtube.js
// YouTube API配置文件
const { google } = require('googleapis');
require('dotenv').config();

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

// API配额管理
const quotaManager = {
  used: 0,
  limit: parseInt(process.env.DAILY_QUOTA_LIMIT || 10000),
  warningThreshold: parseInt(process.env.QUOTA_WARNING_THRESHOLD || 8000),
  
  // 记录配额使用
  recordUsage(units) {
    this.used += units;
    if (this.used >= this.warningThreshold) {
      console.warn(`⚠️ API配额警告: 已使用 ${this.used}/${this.limit} 单位`);
    }
    return this.used;
  },
  
  // 检查是否还有配额
  hasQuota(requiredUnits = 1) {
    return (this.used + requiredUnits) <= this.limit;
  },
  
  // 重置配额（每日调用）
  reset() {
    this.used = 0;
    console.log('✅ API配额已重置');
  },
  
  // 获取剩余配额
  getRemaining() {
    return this.limit - this.used;
  }
};

module.exports = { youtube, quotaManager };

// backend/services/youtubeService.js
// YouTube API服务
const { youtube, quotaManager } = require('../config/youtube');
const { getDb } = require('../config/database');
const logger = require('../utils/logger');

class YouTubeService {
  // 获取频道详情
  async getChannelDetails(channelId) {
    try {
      if (!quotaManager.hasQuota(1)) {
        throw new Error('API配额不足');
      }
      
      const response = await youtube.channels.list({
        part: 'snippet,statistics,contentDetails',
        id: channelId
      });
      
      quotaManager.recordUsage(1);
      
      if (response.data.items.length === 0) {
        throw new Error(`频道未找到: ${channelId}`);
      }
      
      return response.data.items[0];
    } catch (error) {
      logger.error(`获取频道详情失败: ${error.message}`);
      throw error;
    }
  }
  
  // 获取频道的上传播放列表ID
  getUploadsPlaylistId(channel) {
    return channel.contentDetails.relatedPlaylists.uploads;
  }
  
  // 获取播放列表中的视频
  async getPlaylistVideos(playlistId, maxResults = 50) {
    try {
      if (!quotaManager.hasQuota(1)) {
        throw new Error('API配额不足');
      }
      
      const videos = [];
      let nextPageToken = null;
      
      do {
        const response = await youtube.playlistItems.list({
          part: 'contentDetails',
          playlistId: playlistId,
          maxResults: maxResults,
          pageToken: nextPageToken
        });
        
        quotaManager.recordUsage(1);
        videos.push(...response.data.items);
        nextPageToken = response.data.nextPageToken;
        
      } while (nextPageToken && videos.length < 200); // 最多获取200个视频
      
      return videos;
    } catch (error) {
      logger.error(`获取播放列表视频失败: ${error.message}`);
      throw error;
    }
  }
  
  // 批量获取视频详情
  async getVideosDetails(videoIds) {
    try {
      const batches = [];
      const batchSize = 50; // YouTube API最多支持50个ID
      
      // 分批处理
      for (let i = 0; i < videoIds.length; i += batchSize) {
        batches.push(videoIds.slice(i, i + batchSize));
      }
      
      const allVideos = [];
      
      for (const batch of batches) {
        if (!quotaManager.hasQuota(1)) {
          logger.warn('API配额不足，停止获取视频详情');
          break;
        }
        
        const response = await youtube.videos.list({
          part: 'snippet,statistics,contentDetails',
          id: batch.join(',')
        });
        
        quotaManager.recordUsage(1);
        allVideos.push(...response.data.items);
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return allVideos;
    } catch (error) {
      logger.error(`批量获取视频详情失败: ${error.message}`);
      throw error;
    }
  }
  
  // 解析视频时长
  parseDuration(duration) {
    // YouTube返回的时长格式为ISO 8601，如 "PT4M13S"
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  // 判断是否为Shorts
  isShort(video) {
    const durationInSeconds = this.parseDuration(video.contentDetails.duration);
    return durationInSeconds <= 60;
  }
  
  // 保存视频到数据库
  async saveVideo(video, channelId) {
    const db = await getDb();
    
    const isShort = this.isShort(video);
    const duration = this.parseDuration(video.contentDetails.duration);
    
    await db.run(`
      INSERT OR REPLACE INTO videos (
        id, channel_id, title, description, duration, is_short, 
        published_at, thumbnail_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      video.id,
      channelId,
      video.snippet.title,
      video.snippet.description,
      duration,
      isShort ? 1 : 0,
      video.snippet.publishedAt,
      video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url
    ]);
    
    // 保存视频统计
    await db.run(`
      INSERT INTO video_stats (
        video_id, view_count, like_count, comment_count
      ) VALUES (?, ?, ?, ?)
    `, [
      video.id,
      parseInt(video.statistics.viewCount) || 0,
      parseInt(video.statistics.likeCount) || 0,
      parseInt(video.statistics.commentCount) || 0
    ]);
  }
}

module.exports = new YouTubeService();

// backend/services/smartFetcher.js
// 智能抓取服务
const youtubeService = require('./youtubeService');
const { getDb } = require('../config/database');
const logger = require('../utils/logger');
const dayjs = require('dayjs');

class SmartFetcher {
  // 获取需要更新的视频
  async getVideosToUpdate() {
    const db = await getDb();
    
    // 获取需要更新的视频ID列表
    const sql = `
      SELECT DISTINCT v.id
      FROM videos v
      WHERE 
        -- 新视频（24小时内发布）
        (v.published_at > datetime('now', '-1 day'))
        OR
        -- 最近7天的热门视频
        (v.published_at > datetime('now', '-7 days') 
         AND v.id IN (
           SELECT video_id 
           FROM video_stats 
           WHERE captured_at > datetime('now', '-1 day')
           GROUP BY video_id
           HAVING MAX(view_count) - MIN(view_count) > 1000
         ))
        OR
        -- 当前在榜单上的视频
        (v.id IN (
          SELECT video_id 
          FROM daily_rankings 
          WHERE ranking_date = date('now')
        ))
      LIMIT 200
    `;
    
    const videos = await db.all(sql);
    return videos.map(v => v.id);
  }
  
  // 获取新视频
  async fetchNewVideosForChannel(channelId) {
    try {
      logger.info(`开始获取频道 ${channelId} 的新视频`);
      
      // 获取频道详情
      const channel = await youtubeService.getChannelDetails(channelId);
      const uploadsPlaylistId = youtubeService.getUploadsPlaylistId(channel);
      
      // 获取最近的视频
      const playlistItems = await youtubeService.getPlaylistVideos(uploadsPlaylistId, 50);
      const videoIds = playlistItems.map(item => item.contentDetails.videoId);
      
      // 过滤出新视频
      const db = await getDb();
      const existingVideos = await db.all(
        `SELECT id FROM videos WHERE id IN (${videoIds.map(() => '?').join(',')})`,
        videoIds
      );
      const existingIds = new Set(existingVideos.map(v => v.id));
      const newVideoIds = videoIds.filter(id => !existingIds.has(id));
      
      if (newVideoIds.length === 0) {
        logger.info(`频道 ${channelId} 没有新视频`);
        return [];
      }
      
      logger.info(`发现 ${newVideoIds.length} 个新视频`);
      
      // 获取新视频详情
      const newVideos = await youtubeService.getVideosDetails(newVideoIds);
      
      // 保存到数据库
      for (const video of newVideos) {
        await youtubeService.saveVideo(video, channelId);
      }
      
      return newVideos;
    } catch (error) {
      logger.error(`获取频道 ${channelId} 新视频失败: ${error.message}`);
      throw error;
    }
  }
  
  // 更新视频统计
  async updateVideoStatistics() {
    try {
      const videoIds = await this.getVideosToUpdate();
      
      if (videoIds.length === 0) {
        logger.info('没有需要更新的视频');
        return;
      }
      
      logger.info(`开始更新 ${videoIds.length} 个视频的统计数据`);
      
      const videos = await youtubeService.getVideosDetails(videoIds);
      const db = await getDb();
      
      for (const video of videos) {
        await db.run(`
          INSERT INTO video_stats (
            video_id, view_count, like_count, comment_count
          ) VALUES (?, ?, ?, ?)
        `, [
          video.id,
          parseInt(video.statistics.viewCount) || 0,
          parseInt(video.statistics.likeCount) || 0,
          parseInt(video.statistics.commentCount) || 0
        ]);
      }
      
      logger.info('视频统计更新完成');
    } catch (error) {
      logger.error(`更新视频统计失败: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new SmartFetcher();

// backend/services/rankingAlgorithm.js
// 排名算法服务
const { getDb } = require('../config/database');
const logger = require('../utils/logger');
const dayjs = require('dayjs');

class RankingAlgorithm {
  // 计算热度分数
  calculateHeatScore(video, stats24h) {
    // 基础数据
    const viewIncrement = stats24h.viewIncrement || 0;
    const viewGrowthRate = stats24h.viewGrowthRate || 0;
    const interactionRate = stats24h.interactionRate || 0;
    const hoursSincePublish = stats24h.hoursSincePublish || 1;
    
    // Shorts权重配置
    if (video.is_short) {
      const weights = {
        viewIncrement: 0.4,
        viewGrowthRate: 0.3,
        interactionRate: 0.2,
        recency: 0.1
      };
      
      return (
        viewIncrement * weights.viewIncrement +
        viewGrowthRate * 10000 * weights.viewGrowthRate +
        interactionRate * 1000 * weights.interactionRate +
        (1 / (hoursSincePublish + 1)) * 1000 * weights.recency
      );
    }
    
    // 长视频权重配置
    const weights = {
      viewIncrement: 0.35,
      viewGrowthRate: 0.25,
      interactionRate: 0.25,
      avgWatchTime: 0.15
    };
    
    // 估算平均观看时长（基于互动率）
    const estimatedWatchRatio = Math.min(interactionRate * 10, 1);
    
    return (
      viewIncrement * weights.viewIncrement +
      viewGrowthRate * 10000 * weights.viewGrowthRate +
      interactionRate * 1000 * weights.interactionRate +
      estimatedWatchRatio * 1000 * weights.avgWatchTime
    );
  }
  
  // 获取24小时统计数据
  async get24HourStats(videoId) {
    const db = await getDb();
    
    const stats = await db.get(`
      SELECT 
        v.*,
        vs1.view_count as latest_views,
        vs1.like_count as latest_likes,
        vs1.comment_count as latest_comments,
        vs2.view_count as earliest_views,
        (vs1.view_count - COALESCE(vs2.view_count, 0)) as view_increment,
        CASE 
          WHEN COALESCE(vs2.view_count, 0) > 0 
          THEN ((vs1.view_count - vs2.view_count) * 1.0 / vs2.view_count)
          ELSE 0
        END as view_growth_rate,
        CASE 
          WHEN vs1.view_count > 0 
          THEN ((vs1.like_count + vs1.comment_count) * 1.0 / vs1.view_count)
          ELSE 0
        END as interaction_rate,
        (julianday('now') - julianday(v.published_at)) * 24 as hours_since_publish
      FROM videos v
      LEFT JOIN video_stats vs1 ON v.id = vs1.video_id
        AND vs1.captured_at = (
          SELECT MAX(captured_at) FROM video_stats WHERE video_id = v.id
        )
      LEFT JOIN video_stats vs2 ON v.id = vs2.video_id
        AND vs2.captured_at = (
          SELECT MAX(captured_at) 
          FROM video_stats 
          WHERE video_id = v.id 
            AND captured_at <= datetime('now', '-1 day')
        )
      WHERE v.id = ?
    `, videoId);
    
    return stats;
  }
  
  // 生成每日榜单
  async generateDailyRankings() {
    try {
      logger.info('开始生成每日榜单');
      const db = await getDb();
      
      // 获取符合条件的视频
      const eligibleVideos = await db.all(`
        SELECT DISTINCT v.*
        FROM videos v
        JOIN video_stats vs ON v.id = vs.video_id
        WHERE v.published_at > datetime('now', '-30 days')
          AND vs.captured_at > datetime('now', '-1 day')
      `);
      
      // 计算每个视频的热度分数
      const scoredVideos = [];
      
      for (const video of eligibleVideos) {
        const stats24h = await this.get24HourStats(video.id);
        
        // 最低门槛：24小时内至少100次观看增量
        if (stats24h.view_increment >= 100) {
          const heatScore = this.calculateHeatScore(video, stats24h);
          scoredVideos.push({
            video,
            heatScore,
            stats: stats24h
          });
        }
      }
      
      // 分别排序Shorts和长视频
      const shorts = scoredVideos
        .filter(v => v.video.is_short)
        .sort((a, b) => b.heatScore - a.heatScore)
        .slice(0, 50);
      
      const longVideos = scoredVideos
        .filter(v => !v.video.is_short)
        .sort((a, b) => b.heatScore - a.heatScore)
        .slice(0, 50);
      
      // 保存榜单结果
      const today = dayjs().format('YYYY-MM-DD');
      
      // 清除今日旧榜单
      await db.run('DELETE FROM daily_rankings WHERE ranking_date = ?', today);
      
      // 保存新榜单
      await this.saveRankings(db, shorts, 'shorts', today);
      await this.saveRankings(db, longVideos, 'long', today);
      
      logger.info(`榜单生成完成: Shorts ${shorts.length} 个, 长视频 ${longVideos.length} 个`);
      
      return { shorts, longVideos };
    } catch (error) {
      logger.error(`生成榜单失败: ${error.message}`);
      throw error;
    }
  }
  
  // 保存榜单
  async saveRankings(db, videos, rankType, date) {
    for (let i = 0; i < videos.length; i++) {
      const { video, heatScore, stats } = videos[i];
      
      await db.run(`
        INSERT INTO daily_rankings (
          video_id, rank_type, rank_position, heat_score, 
          view_increment, ranking_date
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        video.id,
        rankType,
        i + 1,
        heatScore,
        stats.view_increment,
        date
      ]);
    }
  }
}

module.exports = new RankingAlgorithm();

// backend/utils/logger.js
// 日志工具
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'youtube-ranking' },
  transports: [
    // 写入文件
    new winston.transports.File({ 
      filename: path.join(__dirname, '..', '..', 'logs', 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '..', '..', 'logs', 'app.log') 
    })
  ]
});

// 开发环境下也输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;

// backend/app.js
// Express应用主文件
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');

// 创建Express应用
const app = express();

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API路由
app.get('/api/rankings/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { date } = req.query;
    
    if (!['shorts', 'long', 'all'].includes(type)) {
      return res.status(400).json({ error: '无效的榜单类型' });
    }
    
    const { getDb } = require('./config/database');
    const db = await getDb();
    
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    let sql = `
      SELECT 
        dr.*,
        v.title,
        v.thumbnail_url as thumbnail,
        v.duration,
        v.published_at,
        c.name as channel_name,
        c.id as channel_id,
        vs.view_count,
        vs.like_count,
        vs.comment_count
      FROM daily_rankings dr
      JOIN videos v ON dr.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      LEFT JOIN LATERAL (
        SELECT * FROM video_stats 
        WHERE video_id = v.id 
        ORDER BY captured_at DESC 
        LIMIT 1
      ) vs ON true
      WHERE dr.ranking_date = ?
    `;
    
    if (type !== 'all') {
      sql += ` AND dr.rank_type = ?`;
    }
    
    sql += ` ORDER BY dr.rank_position`;
    
    const params = type === 'all' ? [queryDate] : [queryDate, type];
    const rankings = await db.all(sql, params);
    
    res.json({
      success: true,
      type,
      date: queryDate,
      count: rankings.length,
      rankings
    });
  } catch (error) {
    logger.error(`获取榜单失败: ${error.message}`);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取统计信息
app.get('/api/stats', async (req, res) => {
  try {
    const { getDb } = require('./config/database');
    const db = await getDb();
    
    const stats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM channels WHERE is_active = 1) as active_channels,
        (SELECT COUNT(*) FROM videos) as total_videos,
        (SELECT COUNT(*) FROM videos WHERE is_short = 1) as total_shorts,
        (SELECT COUNT(*) FROM videos WHERE is_short = 0) as total_long_videos,
        (SELECT COUNT(*) FROM daily_rankings WHERE ranking_date = date('now')) as today_rankings
    `);
    
    const { quotaManager } = require('./config/youtube');
    
    res.json({
      success: true,
      stats: {
        ...stats,
        api_quota_used: quotaManager.used,
        api_quota_remaining: quotaManager.getRemaining()
      }
    });
  } catch (error) {
    logger.error(`获取统计信息失败: ${error.message}`);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

module.exports = app;

// backend/server.js
// 服务器启动文件
const app = require('./app');
const cron = require('node-cron');
const logger = require('./utils/logger');
const { quotaManager } = require('./config/youtube');

const PORT = process.env.PORT || 3000;

// 导入定时任务
const fetchNewVideos = require('./jobs/fetchNewVideos');
const updateVideoStats = require('./jobs/updateVideoStats');
const generateRankings = require('./jobs/generateRankings');

// 设置定时任务
if (process.env.ENABLE_CRON_JOBS === 'true') {
  // 每小时获取新视频
  cron.schedule('0 * * * *', async () => {
    logger.info('执行定时任务: 获取新视频');
    await fetchNewVideos();
  });
  
  // 每4小时更新视频统计
  cron.schedule('0 */4 * * *', async () => {
    logger.info('执行定时任务: 更新视频统计');
    await updateVideoStats();
  });
  
  // 每天凌晨2点生成榜单
  cron.schedule('0 2 * * *', async () => {
    logger.info('执行定时任务: 生成每日榜单');
    await generateRankings();
  });
  
  // 每天凌晨重置API配额
  cron.schedule('0 0 * * *', () => {
    logger.info('执行定时任务: 重置API配额');
    quotaManager.reset();
  });
}

// 启动服务器
app.listen(PORT, () => {
  logger.info(`🚀 服务器已启动: http://localhost:${PORT}`);
  logger.info(`📊 API配额限制: ${quotaManager.limit} 单位/天`);
  logger.info(`⏰ 定时任务: ${process.env.ENABLE_CRON_JOBS === 'true' ? '已启用' : '已禁用'}`);
});