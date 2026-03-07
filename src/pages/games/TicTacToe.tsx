import { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout';
import { motion } from 'framer-motion';
import { RefreshCcw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Player = 'X' | 'O' | null;

export default function TicTacToe() {
    const navigate = useNavigate();
    const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState<boolean>(true); // User is X, AI is O
    const [winner, setWinner] = useState<Player | 'Draw'>(null);
    const [isThinking, setIsThinking] = useState(false);

    const checkWinner = (squares: Player[]) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        if (!squares.includes(null)) return 'Draw';
        return null;
    };

    // Minimax Algorithm for unbeatable AI
    const minimax = (tempBoard: Player[], depth: number, isMaximizing: boolean): number => {
        const result = checkWinner(tempBoard);
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        if (result === 'Draw') return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (tempBoard[i] === null) {
                    tempBoard[i] = 'O';
                    let score = minimax(tempBoard, depth + 1, false);
                    tempBoard[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (tempBoard[i] === null) {
                    tempBoard[i] = 'X';
                    let score = minimax(tempBoard, depth + 1, true);
                    tempBoard[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    };

    const getBestMove = (currentBoard: Player[]) => {
        let bestScore = -Infinity;
        let move = -1;
        for (let i = 0; i < 9; i++) {
            if (currentBoard[i] === null) {
                currentBoard[i] = 'O';
                let score = minimax(currentBoard, 0, false);
                currentBoard[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    };

    const handleBack = () => navigate('/games');

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);
    };

    const handleClick = (index: number) => {
        if (board[index] || winner || !isXNext) return;

        const newBoard = [...board];
        newBoard[index] = 'X';
        setBoard(newBoard);
        setIsXNext(false);
    };

    // AI Move
    useEffect(() => {
        const currentWinner = checkWinner(board);
        if (currentWinner) {
            setWinner(currentWinner);
            return;
        }

        if (!isXNext && !winner) {
            setIsThinking(true);
            const timer = setTimeout(() => {
                const bestMove = getBestMove([...board]);
                if (bestMove !== -1) {
                    const newBoard = [...board];
                    newBoard[bestMove] = 'O';
                    setBoard(newBoard);
                    setIsXNext(true);
                }
                setIsThinking(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [board, isXNext, winner]);

    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center min-h-[80vh] py-8">
                <div className="w-full max-w-md w-full glass-widget p-8 rounded-3xl border border-[var(--border-color)] relative overflow-hidden">
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-yellow-400/10 blur-[100px] rounded-full pointer-events-none" />

                    <button onClick={handleBack} className="text-[var(--text-muted)] hover:text-[var(--text-main)] mb-6 flex items-center gap-2 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                        العودة للألعاب
                    </button>

                    <div className="text-center mb-8 relative z-10">
                        <h1 className="text-3xl font-display font-bold text-[var(--text-main)] mb-2">تيك تاك تو الذكية ⚡</h1>
                        <p className="text-[var(--text-muted)]">أنت (X) ضد الذكاء الاصطناعي (O)</p>
                    </div>

                    <div className="bg-[var(--bg-background)] p-4 rounded-2xl mb-8 border border-[var(--border-color)] shadow-inner">
                        <div className="grid grid-cols-3 gap-3">
                            {board.map((cell, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleClick(index)}
                                    disabled={!!cell || !!winner || !isXNext}
                                    className={`h-24 rounded-xl text-4xl font-bold flex items-center justify-center transition-all duration-300
                                        ${cell ? 'glass-widget shadow-md border border-[var(--border-color)]' : 'bg-[var(--hover-bg)] hover:bg-black/5 dark:hover:bg-white/5'}
                                        ${cell === 'X' ? 'text-primary' : 'text-accent'}
                                    `}
                                >
                                    {cell && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                            {cell}
                                        </motion.span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-center h-16 relative z-10">
                        {winner ? (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <h2 className="text-2xl font-bold text-[var(--text-main)] mb-4">
                                    {winner === 'Draw' ? 'تعادل! 🤝' : (winner === 'X' ? 'لقد فزت! 🎉' : 'الذكاء الاصطناعي فاز! 🤖')}
                                </h2>
                                <button onClick={resetGame} className="btn-primary px-8 py-2 mx-auto flex items-center gap-2 text-white">
                                    <RefreshCcw className="w-4 h-4" />
                                    إعادة اللعب
                                </button>
                            </motion.div>
                        ) : (
                            <div className="text-lg font-bold text-[var(--text-muted)]">
                                {isThinking ? 'الذكاء يفكر...' : 'دورك الآن!'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
