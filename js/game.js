/**
 * 游戏核心逻辑
 * 负责游戏状态管理、规则判定和核心算法
 */

import { DIFFICULTY, GAME_STATUS } from './config.js';

class Game {
    constructor() {
        this.reset();
    }

    /**
     * 重置游戏状态
     */
    reset() {
        this.level = 'beginner';
        this.rows = 9;
        this.cols = 9;
        this.mineCount = 10;
        this.status = GAME_STATUS.WAITING;
        this.grid = [];
        this.mines = [];
        this.revealedCount = 0;
        this.flagCount = 0;
        this.startTime = null;
        this.timerId = null;
        this.callbacks = {};
    }

    /**
     * 设置回调函数
     */
    on(event, callback) {
        this.callbacks[event] = callback;
    }

    /**
     * 触发回调
     */
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    /**
     * 初始化游戏
     */
    init(level = 'beginner') {
        // 停止计时器
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }

        this.level = level;
        const config = DIFFICULTY[level] || { rows: 9, cols: 9, mines: 10 };
        this.rows = config.rows;
        this.cols = config.cols;
        this.mineCount = config.mines;
        
        this.status = GAME_STATUS.WAITING;
        this.grid = [];
        this.mines = [];
        this.revealedCount = 0;
        this.flagCount = 0;
        this.startTime = null;

        // 创建网格
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = {
                    row: r,
                    col: c,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0
                };
            }
        }

        this.emit('init', this.getState());
    }

    /**
     * 放置地雷（首次点击安全）
     */
    placeMines(safeRow, safeCol) {
        // 收集所有可放置地雷的位置（排除安全区）
        const positions = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (Math.abs(r - safeRow) > 1 || Math.abs(c - safeCol) > 1) {
                    positions.push([r, c]);
                }
            }
        }

        // 随机打乱
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        // 放置地雷
        this.mines = positions.slice(0, this.mineCount);
        for (const [r, c] of this.mines) {
            this.grid[r][c].isMine = true;
        }

        // 计算每个格子的周围雷数
        this.calculateAdjacent();
    }

    /**
     * 计算周围雷数
     */
    calculateAdjacent() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c].isMine) {
                    this.grid[r][c].adjacentMines = this.countAdjacent(r, c);
                }
            }
        }
    }

    /**
     * 统计周围雷数
     */
    countAdjacent(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    if (this.grid[nr][nc].isMine) count++;
                }
            }
        }
        return count;
    }

    /**
     * 开始计时
     */
    startTimer() {
        this.startTime = Date.now();
        this.timerId = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.emit('timer', elapsed);
        }, 1000);
    }

    /**
     * 停止计时
     */
    stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    /**
     * 揭开格子
     */
    reveal(row, col) {
        // 检查坐标有效性
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return [];
        }

        const cell = this.grid[row][col];

        // 已揭开的不能再次揭开
        if (cell.isRevealed) return [];

        // 已标记的不能揭开
        if (cell.isFlagged) return [];

        // 首次点击，放置地雷
        if (this.status === GAME_STATUS.WAITING) {
            this.placeMines(row, col);
            this.status = GAME_STATUS.PLAYING;
            this.startTimer();
            this.emit('status', GAME_STATUS.PLAYING);
        }

        // 如果是游戏结束，不能操作
        if (this.status !== GAME_STATUS.PLAYING) return [];

        // 揭开当前格子
        cell.isRevealed = true;
        this.revealedCount++;

        const revealed = [{ row, col, cell: { ...cell } }];

        // 如果是地雷，游戏结束
        if (cell.isMine) {
            this.gameOver(false);
            return revealed;
        }

        // 如果周围没有雷，自动扩展
        if (cell.adjacentMines === 0) {
            const neighbors = this.getNeighbors(row, col);
            for (const n of neighbors) {
                if (!n.cell.isRevealed && !n.cell.isFlagged) {
                    const more = this.reveal(n.row, n.col);
                    revealed.push(...more);
                }
            }
        }

        // 检查胜利
        this.checkWin();

        return revealed;
    }

    /**
     * 获取邻居格子
     */
    getNeighbors(row, col) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    neighbors.push({ row: nr, col: nc, cell: this.grid[nr][nc] });
                }
            }
        }
        return neighbors;
    }

    /**
     * 标记/取消标记
     */
    toggleFlag(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }

        const cell = this.grid[row][col];

        // 已揭开的不能标记
        if (cell.isRevealed) return null;

        // 切换标记状态
        cell.isFlagged = !cell.isFlagged;
        this.flagCount += cell.isFlagged ? 1 : -1;

        this.emit('flag', this.mineCount - this.flagCount);

        return { row, col, cell: { ...cell } };
    }

    /**
     * 双击智能揭开
     */
    chord(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return [];
        }

        const cell = this.grid[row][col];

        // 只对已揭开的数字有效
        if (!cell.isRevealed || cell.adjacentMines === 0) {
            return [];
        }

        // 如果游戏未开始，不处理
        if (this.status !== GAME_STATUS.PLAYING) return [];

        // 统计周围标记数
        const neighbors = this.getNeighbors(row, col);
        let flagCount = 0;
        for (const n of neighbors) {
            if (n.cell.isFlagged) flagCount++;
        }

        // 如果标记数等于数字，揭开未标记的邻居
        if (flagCount === cell.adjacentMines) {
            const revealed = [];
            for (const n of neighbors) {
                if (!n.cell.isRevealed && !n.cell.isFlagged) {
                    const more = this.reveal(n.row, n.col);
                    revealed.push(...more);
                }
            }
            return revealed;
        }

        return [];
    }

    /**
     * 检查胜利条件
     */
    checkWin() {
        const totalCells = this.rows * this.cols;
        const safeCells = totalCells - this.mineCount;

        if (this.revealedCount === safeCells) {
            this.gameOver(true);
        }
    }

    /**
     * 游戏结束
     */
    gameOver(isWin) {
        this.stopTimer();
        this.status = isWin ? GAME_STATUS.WON : GAME_STATUS.LOST;

        this.emit('status', this.status);

        if (!isWin) {
            // 显示所有地雷
            for (const [r, c] of this.mines) {
                if (!this.grid[r][c].isFlagged) {
                    this.grid[r][c].isRevealed = true;
                }
            }
        }
    }

    /**
     * 获取当前状态
     */
    getState() {
        return {
            level: this.level,
            rows: this.rows,
            cols: this.cols,
            mineCount: this.mineCount,
            status: this.status,
            remaining: this.mineCount - this.flagCount,
            time: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0
        };
    }

    /**
     * 获取格子数据
     */
    getCell(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }
        return this.grid[row][col];
    }

    /**
     * 获取所有地雷位置
     */
    getMines() {
        return this.mines.map(([r, c]) => ({ row: r, col: c }));
    }
}

// 导出单例
export const game = new Game();
