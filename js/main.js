/**
 * 扫雷游戏主入口
 * 协调各模块，处理用户交互
 */

import { game } from './game.js';
import { board } from './board.js';
import { GAME_STATUS } from './config.js';

class Minesweeper {
    constructor() {
        // 获取DOM元素
        this.timerEl = document.getElementById('timer');
        this.minesEl = document.getElementById('mine-count');
        this.resetBtn = document.getElementById('reset-btn');
        this.messageEl = document.getElementById('game-message');
        this.boardEl = document.getElementById('game-board');
        this.difficultyBtns = document.querySelectorAll('.difficulty-btn');

        // 初始化
        this.init();
    }

    /**
     * 初始化游戏
     */
    init() {
        // 设置游戏回调
        game.on('init', (state) => this.onGameInit(state));
        game.on('status', (status) => this.onStatusChange(status));
        game.on('timer', (time) => this.onTimerUpdate(time));
        game.on('flag', (remaining) => this.onFlagUpdate(remaining));

        // 绑定难度按钮
        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const level = btn.dataset.level;
                if (level === 'custom') {
                    this.showCustomDialog();
                } else {
                    this.setDifficulty(level);
                }
            });
        });

        // 绑定重置按钮
        this.resetBtn.addEventListener('click', () => this.reset());

        // 绑定棋盘事件
        this.boardEl.addEventListener('click', (e) => this.onClick(e));
        this.boardEl.addEventListener('contextmenu', (e) => this.onRightClick(e));
        this.boardEl.addEventListener('dblclick', (e) => this.onDoubleClick(e));

        // 开始游戏
        this.setDifficulty('beginner');
    }

    /**
     * 设置难度
     */
    setDifficulty(level) {
        // 更新按钮状态
        this.difficultyBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level === level);
        });

        // 初始化游戏
        game.init(level);
    }

    /**
     * 重置当前游戏
     */
    reset() {
        game.init(game.level);
    }

    /**
     * 游戏初始化回调
     */
    onGameInit(state) {
        // 渲染棋盘
        board.init(state.rows, state.cols);

        // 更新显示
        this.updateTimer(0);
        this.updateMines(state.mineCount);
        this.updateMessage('点击格子开始游戏');
        this.updateFace('waiting');
    }

    /**
     * 状态变化回调
     */
    onStatusChange(status) {
        switch (status) {
            case GAME_STATUS.PLAYING:
                this.updateMessage('扫雷中...');
                this.updateFace('playing');
                break;
            case GAME_STATUS.WON:
                this.updateMessage('🎉 恭喜获胜！');
                this.updateFace('win');
                this.autoFlagMines();
                break;
            case GAME_STATUS.LOST:
                this.updateMessage('💥 游戏结束！');
                this.updateFace('lost');
                this.showAllMines();
                break;
        }
    }

    /**
     * 计时器更新
     */
    onTimerUpdate(time) {
        this.updateTimer(time);
    }

    /**
     * 标记更新
     */
    onFlagUpdate(remaining) {
        this.updateMines(remaining);
    }

    /**
     * 点击处理
     */
    onClick(e) {
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;

        const row = parseInt(cellEl.dataset.row);
        const col = parseInt(cellEl.dataset.col);

        const revealed = game.reveal(row, col);
        board.updateCells(revealed);
    }

    /**
     * 右键处理
     */
    onRightClick(e) {
        e.preventDefault();

        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;

        const row = parseInt(cellEl.dataset.row);
        const col = parseInt(cellEl.dataset.col);

        const result = game.toggleFlag(row, col);
        if (result) {
            board.updateCell(row, col, result);
        }
    }

    /**
     * 双击处理
     */
    onDoubleClick(e) {
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;

        const row = parseInt(cellEl.dataset.row);
        const col = parseInt(cellEl.dataset.col);

        const revealed = game.chord(row, col);
        board.updateCells(revealed);
    }

    /**
     * 显示自定义对话框
     */
    showCustomDialog() {
        const html = `
            <div class="modal-overlay">
                <div class="modal-box">
                    <h3>自定义难度</h3>
                    <div class="form-row">
                        <label>行数 (9-24):</label>
                        <input type="number" id="custom-rows" value="9" min="9" max="24">
                    </div>
                    <div class="form-row">
                        <label>列数 (9-30):</label>
                        <input type="number" id="custom-cols" value="9" min="9" max="30">
                    </div>
                    <div class="form-row">
                        <label>地雷数:</label>
                        <input type="number" id="custom-mines" value="10" min="1" max="200">
                    </div>
                    <div class="modal-buttons">
                        <button class="btn-cancel" id="modal-cancel">取消</button>
                        <button class="btn-confirm" id="modal-confirm">确定</button>
                    </div>
                </div>
            </div>
        `;

        // 创建模态框
        const modal = document.createElement('div');
        modal.innerHTML = html;
        document.body.appendChild(modal);

        const modalEl = modal.firstElementChild;

        // 取消按钮
        modalEl.querySelector('#modal-cancel').addEventListener('click', () => {
            modal.remove();
        });

        // 确定按钮
        modalEl.querySelector('#modal-confirm').addEventListener('click', () => {
            const rows = parseInt(modalEl.querySelector('#custom-rows').value) || 9;
            const cols = parseInt(modalEl.querySelector('#custom-cols').value) || 9;
            const mines = parseInt(modalEl.querySelector('#custom-mines').value) || 10;

            // 验证并限制
            const validRows = Math.max(9, Math.min(24, rows));
            const validCols = Math.max(9, Math.min(30, cols));
            const maxMines = validRows * validCols - 9;
            const validMines = Math.max(1, Math.min(maxMines, mines));

            // 取消难度按钮选中
            this.difficultyBtns.forEach(btn => btn.classList.remove('active'));

            // 初始化自定义游戏
            this.initCustomGame(validRows, validCols, validMines);

            modal.remove();
        });

        // 点击背景关闭
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) {
                modal.remove();
            }
        });
    }

    /**
     * 初始化自定义游戏
     */
    initCustomGame(rows, cols, mines) {
        // 停止计时器
        if (game.timerId) {
            clearInterval(game.timerId);
            game.timerId = null;
        }

        // 设置配置
        game.level = 'custom';
        game.rows = rows;
        game.cols = cols;
        game.mineCount = mines;
        game.status = GAME_STATUS.WAITING;
        game.grid = [];
        game.mines = [];
        game.revealedCount = 0;
        game.flagCount = 0;
        game.startTime = null;

        // 创建网格
        for (let r = 0; r < rows; r++) {
            game.grid[r] = [];
            for (let c = 0; c < cols; c++) {
                game.grid[r][c] = {
                    row: r, col: c,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0
                };
            }
        }

        // 渲染棋盘
        board.init(rows, cols);

        // 更新显示
        this.updateTimer(0);
        this.updateMines(mines);
        this.updateMessage('点击格子开始游戏');
        this.updateFace('waiting');
    }

    /**
     * 自动标记剩余地雷
     */
    autoFlagMines() {
        const mines = game.getMines();
        for (const { row, col } of mines) {
            const cell = game.getCell(row, col);
            if (cell && !cell.isFlagged) {
                game.toggleFlag(row, col);
                board.updateCell(row, col, { cell: game.getCell(row, col) });
            }
        }
    }

    /**
     * 显示所有地雷
     */
    showAllMines() {
        const mines = game.getMines();
        board.showMines(mines);
    }

    /**
     * 更新计时器显示
     */
    updateTimer(time) {
        this.timerEl.textContent = String(Math.min(999, time)).padStart(3, '0');
    }

    /**
     * 更新地雷数显示
     */
    updateMines(count) {
        this.minesEl.textContent = String(Math.max(-99, Math.min(999, count))).padStart(3, '0').replace('-', '−');
    }

    /**
     * 更新消息
     */
    updateMessage(msg) {
        this.messageEl.textContent = msg;
    }

    /**
     * 更新表情
     */
    updateFace(status) {
        const faces = {
            waiting: '😊',
            playing: '🙂',
            win: '😎',
            lost: '😵'
        };
        this.resetBtn.textContent = faces[status] || '😊';
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new Minesweeper();
});
