/**
 * 棋盘渲染模块
 * 负责游戏界面的格子渲染和更新
 */

import { NUMBER_COLORS } from './config.js';

class Board {
    constructor() {
        this.element = null;
        this.rows = 0;
        this.cols = 0;
        this.cells = [];
    }

    /**
     * 初始化棋盘
     */
    init(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.element = document.getElementById('game-board');

        if (!this.element) return;

        // 设置网格布局
        this.element.style.gridTemplateColumns = `repeat(${cols}, 32px)`;
        this.element.style.gridTemplateRows = `repeat(${rows}, 32px)`;

        // 清空并重建
        this.element.innerHTML = '';
        this.cells = [];

        for (let r = 0; r < rows; r++) {
            this.cells[r] = [];
            for (let c = 0; c < cols; c++) {
                const cell = this.createCell(r, c);
                this.element.appendChild(cell);
                this.cells[r][c] = cell;
            }
        }
    }

    /**
     * 创建单个格子
     */
    createCell(row, col) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        return cell;
    }

    /**
     * 更新单个格子显示
     */
    updateCell(row, col, data) {
        if (!this.cells[row] || !this.cells[row][col]) return;

        const cellEl = this.cells[row][col];
        const cell = data.cell || data;

        // 重置类名
        cellEl.className = 'cell';
        cellEl.textContent = '';

        if (cell.isRevealed) {
            cellEl.classList.add('revealed');

            if (cell.isMine) {
                cellEl.classList.add('mine');
                cellEl.textContent = '💣';
            } else if (cell.adjacentMines > 0) {
                cellEl.textContent = cell.adjacentMines;
                cellEl.style.color = NUMBER_COLORS[cell.adjacentMines] || '#000';
            }
        } else if (cell.isFlagged) {
            cellEl.classList.add('flagged');
            cellEl.textContent = '🚩';
        }
    }

    /**
     * 批量更新格子
     */
    updateCells(revealedCells) {
        for (const { row, col, cell } of revealedCells) {
            this.updateCell(row, col, { cell });
        }
    }

    /**
     * 显示所有地雷
     */
    showMines(mines) {
        for (const { row, col } of mines) {
            const cellEl = this.cells[row][col];
            if (cellEl && !cellEl.classList.contains('flagged')) {
                cellEl.classList.add('revealed', 'mine');
                cellEl.textContent = '💣';
            }
        }
    }

    /**
     * 高亮显示错误标记
     */
    highlightWrongFlags(wrongFlags) {
        for (const { row, col } of wrongFlags) {
            const cellEl = this.cells[row][col];
            if (cellEl) {
                cellEl.classList.add('wrong-flag');
                cellEl.textContent = '❌';
            }
        }
    }

    /**
     * 清空棋盘
     */
    clear() {
        if (this.element) {
            this.element.innerHTML = '';
        }
        this.cells = [];
    }
}

// 导出单例
export const board = new Board();
