/**
 * 游戏配置常量
 */

// 游戏难度配置
export const DIFFICULTY = {
    beginner: { rows: 9, cols: 9, mines: 10, name: '初级' },
    intermediate: { rows: 16, cols: 16, mines: 40, name: '中级' },
    expert: { rows: 16, cols: 30, mines: 99, name: '高级' }
};

// 游戏状态
export const GAME_STATUS = {
    WAITING: 'waiting',    // 等待开始
    PLAYING: 'playing',    // 游戏中
    WON: 'won',            // 胜利
    LOST: 'lost'           // 失败
};

// 格子状态
export const CELL_STATUS = {
    HIDDEN: 'hidden',      // 未揭开
    REVEALED: 'revealed',  // 已揭开
    FLAGGED: 'flagged',    // 已标记
    QUESTION: 'question'   // 问号标记
};

// 数字颜色
export const NUMBER_COLORS = {
    1: '#0000ff',
    2: '#008000',
    3: '#ff0000',
    4: '#000080',
    5: '#800000',
    6: '#008080',
    7: '#000000',
    8: '#808080'
};
