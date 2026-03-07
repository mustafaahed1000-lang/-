import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../layouts/AppLayout';
import { Trophy, RefreshCcw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

// --- Game Logic Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;
const MIN_SPEED = 50;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const INITIAL_SNAKE: Point[] = [
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Direction = 'UP';

export default function SnakeGame() {
    const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
    const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
    const [food, setFood] = useState<Point>({ x: 5, y: 5 });
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeed] = useState(INITIAL_SPEED);

    // Load high score
    useEffect(() => {
        const savedScore = localStorage.getItem('snakeHighScore');
        if (savedScore) {
            setHighScore(parseInt(savedScore, 10));
        }
        generateFood(INITIAL_SNAKE);
    }, []);

    const generateFood = (currentSnake: Point[]) => {
        let newFood: Point;
        let isOccupied = true;
        while (isOccupied) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
            // eslint-disable-next-line no-loop-func
            isOccupied = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
        }
        setFood(newFood!);
    };

    const handleKeyPress = useCallback((e: KeyboardEvent) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        if (e.key === ' ') {
            setIsPaused(prev => !prev);
            return;
        }

        if (gameOver || isPaused) return;

        switch (e.key) {
            case 'ArrowUp':
                if (direction !== 'DOWN') setDirection('UP');
                break;
            case 'ArrowDown':
                if (direction !== 'UP') setDirection('DOWN');
                break;
            case 'ArrowLeft':
                if (direction !== 'RIGHT') setDirection('LEFT');
                break;
            case 'ArrowRight':
                if (direction !== 'LEFT') setDirection('RIGHT');
                break;
        }
    }, [direction, gameOver, isPaused]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);

    const checkCollision = (head: Point) => {
        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            return true;
        }
        // Self collision (skip the tail as it will move)
        for (let i = 0; i < snake.length - 1; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return true;
            }
        }
        return false;
    };

    const moveSnake = useCallback(() => {
        if (gameOver || isPaused) return;

        setSnake((prevSnake) => {
            const head = { ...prevSnake[0] };

            switch (direction) {
                case 'UP': head.y -= 1; break;
                case 'DOWN': head.y += 1; break;
                case 'LEFT': head.x -= 1; break;
                case 'RIGHT': head.x += 1; break;
            }

            if (checkCollision(head)) {
                setGameOver(true);
                if (score > highScore) {
                    setHighScore(score);
                    localStorage.setItem('snakeHighScore', score.toString());
                }
                return prevSnake;
            }

            const newSnake = [head, ...prevSnake];

            // Eat Food
            if (head.x === food.x && head.y === food.y) {
                setScore(s => s + 10);
                setSpeed(s => Math.max(MIN_SPEED, s - SPEED_INCREMENT));
                generateFood(newSnake);
            } else {
                newSnake.pop(); // Remove tail if no food eaten
            }

            return newSnake;
        });
    }, [direction, food, gameOver, isPaused, score, highScore]);

    useEffect(() => {
        const gameLoop = setInterval(moveSnake, speed);
        return () => clearInterval(gameLoop);
    }, [moveSnake, speed]);

    const resetGame = () => {
        setSnake(INITIAL_SNAKE);
        setDirection(INITIAL_DIRECTION);
        setScore(0);
        setSpeed(INITIAL_SPEED);
        setGameOver(false);
        setIsPaused(false);
        generateFood(INITIAL_SNAKE);
    };

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] py-8 relative">
                {/* Background Glows */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="text-center mb-8 relative z-10">
                    <h1 className="text-5xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">
                        SNAKE 2024
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg">العب واسترح قليلاً من الدراسة 🐍</p>
                </div>

                <div className="glass-widget p-8 rounded-3xl border border-[var(--border-color)] shadow-2xl relative z-10 flex flex-col md:flex-row gap-8 items-start">

                    {/* Game Board */}
                    <div
                        className="relative bg-black/40 border-2 border-green-500/30 rounded-xl overflow-hidden shadow-inner"
                        style={{
                            width: '300px',
                            height: '300px',
                        }}
                    >
                        {/* Grid Lines (Visual only) */}
                        <div className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: 'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)',
                                backgroundSize: `${300 / GRID_SIZE}px ${300 / GRID_SIZE}px`
                            }}>
                        </div>

                        {/* Food */}
                        <div
                            className="absolute bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"
                            style={{
                                width: `${100 / GRID_SIZE}%`,
                                height: `${100 / GRID_SIZE}%`,
                                left: `${(food.x / GRID_SIZE) * 100}%`,
                                top: `${(food.y / GRID_SIZE) * 100}%`,
                            }}
                        />

                        {/* Snake */}
                        {snake.map((segment, index) => (
                            <div
                                key={index}
                                className={`absolute rounded-sm ${index === 0 ? 'bg-green-400 z-10' : 'bg-green-500/80 z-0'}`}
                                style={{
                                    width: `${100 / GRID_SIZE}%`,
                                    height: `${100 / GRID_SIZE}%`,
                                    left: `${(segment.x / GRID_SIZE) * 100}%`,
                                    top: `${(segment.y / GRID_SIZE) * 100}%`,
                                    border: '1px solid rgba(0,0,0,0.3)',
                                    boxShadow: index === 0 ? '0 0 15px rgba(74, 222, 128, 0.6)' : 'none'
                                }}
                            >
                                {/* Eyes on head */}
                                {index === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                                        <div className="w-1 h-1 bg-black rounded-full" />
                                        <div className="w-1 h-1 bg-black rounded-full" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Overlays */}
                        {(gameOver || isPaused) && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                                {gameOver ? (
                                    <>
                                        <h2 className="text-3xl font-bold text-red-500 mb-2 drop-shadow-lg">انتهت اللعبة!</h2>
                                        <p className="text-white text-xl mb-6">النتيجة: {score}</p>
                                        <button
                                            onClick={resetGame}
                                            className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-xl flex items-center gap-2 transform hover:scale-105 transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                        >
                                            <RefreshCcw className="w-5 h-5" />
                                            إعادة اللعب
                                        </button>
                                    </>
                                ) : (
                                    <h2 className="text-3xl font-bold text-white tracking-widest animate-pulse">متوقفة</h2>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Scoreboard & Controls */}
                    <div className="flex flex-col gap-6 w-full md:w-48 text-right" dir="rtl">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 rounded-2xl flex flex-col items-center gap-2">
                            <span className="text-[var(--text-muted)] font-medium">النتيجة الحالية</span>
                            <span className="text-4xl font-display font-bold text-[var(--text-main)]">{score}</span>
                        </div>

                        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 rounded-2xl flex flex-col items-center gap-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-full h-full bg-yellow-500/5 -z-10" />
                            <span className="text-yellow-500 font-medium flex items-center gap-2">
                                <Trophy className="w-4 h-4" /> أفضل نتيجة
                            </span>
                            <span className="text-3xl font-display font-bold text-yellow-500/90">{highScore}</span>
                        </div>

                        {/* Mobile Controls (Visible mostly on small screens, but helpful as buttons) */}
                        <div className="grid grid-cols-3 gap-2 mt-4 md:hidden">
                            <div />
                            <button onClick={() => setDirection('UP')} className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 rounded-lg flex justify-center hover:bg-green-500/20 active:bg-green-500/40 text-[var(--text-main)]"><ArrowUp className="w-6 h-6" /></button>
                            <div />
                            <button onClick={() => setDirection('LEFT')} className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 rounded-lg flex justify-center hover:bg-green-500/20 active:bg-green-500/40 text-[var(--text-main)]"><ArrowLeft className="w-6 h-6" /></button>
                            <button onClick={() => setDirection('DOWN')} className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 rounded-lg flex justify-center hover:bg-green-500/20 active:bg-green-500/40 text-[var(--text-main)]"><ArrowDown className="w-6 h-6" /></button>
                            <button onClick={() => setDirection('RIGHT')} className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 rounded-lg flex justify-center hover:bg-green-500/20 active:bg-green-500/40 text-[var(--text-main)]"><ArrowRight className="w-6 h-6" /></button>
                        </div>

                        <div className="text-sm text-[var(--text-muted)] text-center mt-2 hidden md:block">
                            استخدم <kbd className="bg-black/40 px-2 py-1 rounded">الأسهم</kbd> للتحكم <br />
                            و <kbd className="bg-black/40 px-2 py-1 rounded">المسافة</kbd> للإيقاف المؤقت
                        </div>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}
