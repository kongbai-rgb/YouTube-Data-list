// 修改 backend/app.js 中的 /api/rankings/:type 路由
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
        v.id as video_id,
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
      LEFT JOIN (
        SELECT video_id, 
               MAX(captured_at) as latest_capture,
               view_count,
               like_count,
               comment_count
        FROM video_stats
        GROUP BY video_id
      ) vs ON vs.video_id = v.id
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