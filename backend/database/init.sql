-- 创建频道表
CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    subscriber_count INTEGER,
    video_count INTEGER,
    is_active BOOLEAN DEFAULT 1,
    added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME
);

-- 创建视频表
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER,
    is_short BOOLEAN,
    published_at DATETIME,
    thumbnail_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);

-- 创建视频统计表
CREATE TABLE IF NOT EXISTS video_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- 创建日榜单表
CREATE TABLE IF NOT EXISTS daily_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    rank_type TEXT NOT NULL,
    rank_position INTEGER,
    heat_score DECIMAL(10,2),
    view_increment INTEGER,
    ranking_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- 创建系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_type TEXT,
    message TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_videos_channel ON videos(channel_id);
CREATE INDEX idx_video_stats_video ON video_stats(video_id);
CREATE INDEX idx_video_stats_captured ON video_stats(captured_at);
CREATE INDEX idx_rankings_date ON daily_rankings(ranking_date);
CREATE INDEX idx_rankings_type ON daily_rankings(rank_type);