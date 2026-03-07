import React from 'react';
import AppLayout from '../layouts/AppLayout';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Clock, Star, PlayCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Games() {
    const navigate = useNavigate();


    const games = [
        {
            id: 'tic-tac-toe',
            title: 'تيك تاك تو الذكية',
            desc: 'تحدي الذكاء الاصطناعي في لعبة XO الشهيرة، هل يمكنك الفوز أم سيكون التعادل؟',
            icon: <Zap className="w-8 h-8 text-yellow-400" />,
            color: 'from-yellow-400 to-orange-500',
            category: 'fun',
            difficulty: 'سهل',
            time: '3 دقائق',
            path: '/games/tic-tac-toe'
        }
    ];

    const filteredGames = games;

    return (
        <AppLayout>
            <div className="flex flex-col gap-8 mt-4 lg:mt-6">

                {/* Header Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-widget p-10 rounded-3xl relative overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xl shadow-secondary/5"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-secondary/30 bg-secondary/10 text-xs font-bold text-secondary mb-4">
                                <Gamepad2 className="w-4 h-4" />
                                تعمل بدون إنترنت (Offline)
                            </div>
                            <h1 className="text-3xl font-display font-bold mb-3 text-[var(--text-main)]">استرح قليلا واستمتع 🎮</h1>
                            <p className="text-[var(--text-muted)] font-bold text-lg max-w-xl">
                                استرح قليلاً وتحدى الذكاء الاصطناعي في الألعاب!
                            </p>
                        </div>
                        <div className="hidden md:flex flex-col items-center justify-center p-6 bg-[var(--widget-bg)] rounded-3xl border border-[var(--border-color)] min-w-[200px]">
                            <Trophy className="w-12 h-12 text-[#ffca28] mb-2 drop-shadow-[0_0_15px_rgba(255,202,40,0.5)]" />
                            <span className="text-2xl font-black text-[var(--text-main)]">1,250</span>
                            <span className="text-sm font-bold text-[var(--text-muted)]">إجمالي النقاط</span>
                        </div>
                    </div>
                </motion.div>


                {/* Games Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredGames.map((game, idx) => (
                        <motion.div
                            key={game.id}
                            onClick={() => (game as any).path && navigate((game as any).path)}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="glass-widget rounded-3xl p-6 group cursor-pointer hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
                            style={{ "--hover-shadow-color": "rgba(123, 47, 255, 0.15)" } as React.CSSProperties}
                        >
                            <div className={`absolute -right-16 -top-16 w-48 h-48 bg-gradient-to-br ${game.color} opacity-10 blur-3xl rounded-full group-hover:opacity-30 transition-opacity duration-500`} />

                            <div className="flex items-start gap-6 relative z-10">
                                <div className="w-20 h-20 shrink-0 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-md flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    {game.icon}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-xl font-bold text-[var(--text-main)]">{game.title}</h3>
                                        <div className="w-8 h-8 rounded-full bg-[var(--hover-bg)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                            <PlayCircle className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">{game.desc}</p>

                                    <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-muted)]">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-[#ffca28]" />
                                            <span>{game.difficulty}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{game.time}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </AppLayout>
    );
}
