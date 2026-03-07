import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../layouts/AppLayout';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type Board = number[][];

const SIZE = 4;

export default function Game2048() {
    const navigate = useNavigate();
    const [board, setBoard] = useState<Board>(() => getInitialBoard());
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('2048HighScore');
        if (stored) setHighScore(parseInt(stored, 10));
    }, []);

    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('2048HighScore', score.toString());
        }
    }, [score, highScore]);

    function getInitialBoard(): Board {
        let newBoard = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
        newBoard = spawnRandom(newBoard);
        newBoard = spawnRandom(newBoard);
        return newBoard;
    }

    function spawnRandom(currentBoard: Board): Board {
        const emptyCells = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (currentBoard[r][c] === 0) emptyCells.push({ r, c });
            }
        }
        if (emptyCells.length === 0) return currentBoard;

        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const newBoard = currentBoard.map(row => [...row]);
        newBoard[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
        return newBoard;
    }

    const moveLeft = (currentBoard: Board) => {
        let newBoard = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
        let points = 0;
        let moved = false;

        for (let r = 0; r < SIZE; r++) {
            let row = currentBoard[r].filter(val => val !== 0);
            for (let c = 0; c < row.length - 1; c++) {
                if (row[c] === row[c + 1]) {
                    row[c] *= 2;
                    points += row[c];
                    row.splice(c + 1, 1);
                }
            }
            const newRow = row.concat(Array(SIZE - row.length).fill(0));
            newBoard[r] = newRow;
            if (currentBoard[r].join(',') !== newRow.join(',')) moved = true;
        }
        return { newBoard, points, moved };
    };

    const rotateRight = (matrix: Board) => {
        const result = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                result[c][SIZE - 1 - r] = matrix[r][c];
            }
        }
        return result;
    };

    const moveRight = (board: Board) => {
        let rotated = rotateRight(rotateRight(board));
        let { newBoard, points, moved } = moveLeft(rotated);
        return { newBoard: rotateRight(rotateRight(newBoard)), points, moved };
    };

    const moveUp = (board: Board) => {
        let rotated = rotateRight(rotateRight(rotateRight(board))); // Rotate 270 (or left 90)
        let { newBoard, points, moved } = moveLeft(rotated);
        return { newBoard: rotateRight(newBoard), points, moved }; // Rotate back 90
    };

    const moveDown = (board: Board) => {
        let rotated = rotateRight(board); // Rotate 90
        let { newBoard, points, moved } = moveLeft(rotated);
        return { newBoard: rotateRight(rotateRight(rotateRight(newBoard))), points, moved }; // Rotate back 270
    };

    const checkGameOver = (currentBoard: Board) => {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (currentBoard[r][c] === 0) return false;
                if (c < SIZE - 1 && currentBoard[r][c] === currentBoard[r][c + 1]) return false;
                if (r < SIZE - 1 && currentBoard[r][c] === currentBoard[r + 1][c]) return false;
            }
        }
        return true;
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (isGameOver) return;

        // Prevent default scrolling for arrows
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }

        let result = null;
        switch (e.key) {
            case 'ArrowLeft': result = moveLeft(board); break;
            case 'ArrowRight': result = moveRight(board); break;
            case 'ArrowUp': result = moveUp(board); break;
            case 'ArrowDown': result = moveDown(board); break;
            default: return;
        }

        if (result && result.moved) {
            let nextBoard = spawnRandom(result.newBoard);
            setBoard(nextBoard);
            setScore(s => s + result!.points);
            if (checkGameOver(nextBoard)) {
                setIsGameOver(true);
            }
        }
    }, [board, isGameOver]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        // Handle swipe for mobile (basic implementation omitted for brevity, focusing on keyboard/desktop first)
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const getColor = (value: number) => {
        const colors: Record<number, string> = {
            0: 'bg-[var(--hover-bg)]', // Empty
            2: 'bg-[#eee4da] text-[#776e65]',
            4: 'bg-[#ede0c8] text-[#776e65]',
            8: 'bg-[#f2b179] text-white',
            16: 'bg-[#f59563] text-white',
            32: 'bg-[#f67c5f] text-white',
            64: 'bg-[#f65e3b] text-white',
            128: 'bg-[#edcf72] text-white shadow-[0_0_15px_rgba(237,207,114,0.5)]',
            256: 'bg-[#edcc61] text-white shadow-[0_0_20px_rgba(237,204,97,0.6)]',
            512: 'bg-[#edc850] text-white shadow-[0_0_25px_rgba(237,200,80,0.7)]',
            1024: 'bg-[#edc53f] text-white shadow-[0_0_30px_rgba(237,197,63,0.8)]',
            2048: 'bg-[#edc22e] text-white shadow-[0_0_35px_rgba(237,194,46,0.9)]',
        };
        return colors[value] || 'bg-[#3c3a32] text-[#f9f6f2] shadow-[0_0_40px_rgba(255,255,255,0.5)]';
    };

    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center min-h-[80vh] py-8">
                <div className="w-full max-w-lg glass-widget p-8 rounded-3xl border border-[var(--border-color)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                    <button onClick={() => navigate('/games')} className="text-[var(--text-muted)] hover:text-[var(--text-main)] mb-6 flex items-center gap-2 transition-colors relative z-10 w-fit">
                        <ArrowRight className="w-5 h-5" />
                        العودة للألعاب
                    </button>

                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                            <h1 className="text-4xl font-display font-black text-[var(--text-main)] mb-1">2048</h1>
                            <p className="text-sm font-bold text-[var(--text-muted)]">ادمج الأرقام لتصل إلى 2048!</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="glass-widget px-4 py-2 rounded-xl border-[var(--border-color)] text-center shadow-lg">
                                <span className="block text-xs text-[var(--text-muted)] font-bold">النقاط</span>
                                <span className="font-bold text-lg text-[var(--text-main)]">{score}</span>
                            </div>
                            <div className="glass-widget px-4 py-2 rounded-xl border-[var(--border-color)] text-center bg-yellow-400/10 shadow-lg">
                                <span className="block text-xs text-[#ffca28] font-bold">أفضل رقم</span>
                                <span className="font-bold text-lg text-[#ffca28]">{highScore}</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 bg-[#bbada0] dark:bg-[#3d3a33] p-3 rounded-2xl w-fit mx-auto touch-none shadow-2xl border-4 border-[#bbada0] dark:border-[#3d3a33]">
                        <div className="grid grid-cols-4 gap-3 relative">
                            {board.map((row, r) =>
                                row.map((cell, c) => (
                                    <div
                                        key={`${r}-${c}`}
                                        className={`w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center text-xl sm:text-3xl font-black transition-all duration-150 ${getColor(cell)}`}
                                    >
                                        <AnimatePresence>
                                            {cell !== 0 && (
                                                <motion.span
                                                    key={`${r}-${c}-${cell}`}
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                    className="w-full h-full flex items-center justify-center"
                                                >
                                                    {cell}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
