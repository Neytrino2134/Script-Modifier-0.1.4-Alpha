
import React, { useState, useEffect, useRef } from 'react';
import { GlobalGoal } from './types'; // Updated import
import { ActionButton } from '../../ActionButton';
import CustomCheckbox from '../../ui/CustomCheckbox';

interface Task {
    id: string;
    channelId?: string; // Optional, might be global
    title: string;
    status: 'idea' | 'scripting' | 'filming' | 'published';
    isCompleted?: boolean;
}

interface PlannerProps {
    channels: { id: string; name: string }[];
    activeChannelIds: string[];
    schedule: Record<string, Task[]>;
    onUpdateActiveChannels: (ids: string[]) => void;
    onUpdateSchedule: (schedule: Record<string, Task[]>) => void;
    // New Props for Gamification
    disciplinePoints: number;
    globalGoals: GlobalGoal[];
    habitCompletions: Record<string, Record<string, boolean>>; // date -> { goalId-habitIdx: true }
    onUpdatePoints: (newPoints: number) => void;
    onUpdateGoals: (newGoals: GlobalGoal[]) => void;
    onUpdateHabitCompletions: (newCompletions: Record<string, Record<string, boolean>>) => void;
    t: (key: string, options?: any) => string;
}

const STATUS_COLORS = {
    idea: 'bg-gray-600',
    scripting: 'bg-yellow-600',
    filming: 'bg-cyan-600',
    published: 'bg-emerald-600'
};

const COLORS = ['indigo', 'orange', 'emerald', 'cyan', 'pink', 'red'];

// Simple Confetti Canvas Overlay
const ConfettiOverlay: React.FC<{ active: boolean; x: number; y: number; onComplete: () => void }> = ({ active, x, y, onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        if (!active || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        let particles: any[] = [];
        const colors = ['#FFD700', '#FFC107', '#3498DB', '#2980B9', '#FFFFFF'];
        
        // Init
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 1) * 10 - 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 5 + 2,
                life: 100
            });
        }

        let animationFrameId: number;
        const animate = () => {
            if (!ctx || !canvasRef.current) return;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            let alive = false;
            particles.forEach(p => {
                if (p.life > 0) {
                    alive = true;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.5; // Gravity
                    p.life -= 2;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, p.size, p.size);
                }
            });

            if (alive) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                onComplete();
            }
        };

        animate();

        return () => cancelAnimationFrame(animationFrameId);
    }, [active, x, y, onComplete]);

    if (!active) return null;
    return (
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 pointer-events-none z-50"
            width={window.innerWidth} 
            height={window.innerHeight}
        />
    );
};

export const YouTubePlanner: React.FC<PlannerProps> = ({ 
    channels, activeChannelIds, schedule, onUpdateActiveChannels, onUpdateSchedule,
    disciplinePoints, globalGoals, habitCompletions, onUpdatePoints, onUpdateGoals, onUpdateHabitCompletions,
    t 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
    
    // Confetti State
    const [confetti, setConfetti] = useState<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
    const [justEarned, setJustEarned] = useState(0);

    // Goal Creation State
    const [isCreatingGoal, setIsCreatingGoal] = useState(false);
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newGoalDuration, setNewGoalDuration] = useState(180); // Days
    const [newGoalHabits, setNewGoalHabits] = useState<string[]>([]);
    const [newHabitInput, setNewHabitInput] = useState('');
    const [newGoalColor, setNewGoalColor] = useState('indigo');

    // --- Helpers ---
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    const paddingDays = Array.from({ length: startDay }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    // --- Goal Handlers ---
    const addHabit = () => {
        if (newHabitInput.trim()) {
            setNewGoalHabits([...newGoalHabits, newHabitInput.trim()]);
            setNewHabitInput('');
        }
    };
    
    const saveGoal = () => {
        if (!newGoalTitle.trim()) return;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + newGoalDuration);

        const newGoal: GlobalGoal = {
            id: `goal-${Date.now()}`,
            title: newGoalTitle,
            color: newGoalColor,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            habits: newGoalHabits
        };
        onUpdateGoals([...globalGoals, newGoal]);
        
        // Don't close immediately to allow adding habits if user used Enter on Title
        // But since we removed buttons, we reset for next entry or close if complete
        setNewGoalTitle('');
        setNewGoalHabits([]);
        setIsCreatingGoal(false);
        setJustEarned(20); // Small reward for goal setting
        setTimeout(() => setJustEarned(0), 1000);
    };
    
    const deleteGoal = (id: string) => {
         onUpdateGoals(globalGoals.filter(g => g.id !== id));
    };

    // --- Task Handlers ---
    const handleDateClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDateStr(dateStr);
    };

    const toggleActiveChannel = (channelId: string) => {
        // Enforce Single Channel Selection
        onUpdateActiveChannels([channelId]);
    };

    // Task & Habit Completion Logic
    const triggerReward = (x: number, y: number, points: number) => {
        setConfetti({ active: true, x, y });
        onUpdatePoints(disciplinePoints + points);
        setJustEarned(points);
        setTimeout(() => setJustEarned(0), 1000);
    };

    const toggleHabit = (e: React.MouseEvent, goalId: string, habitIdx: number) => {
        const key = `${goalId}-${habitIdx}`;
        const dayCompletions = habitCompletions[selectedDateStr] || {};
        const isDone = !!dayCompletions[key];
        
        const newDayCompletions = { ...dayCompletions, [key]: !isDone };
        onUpdateHabitCompletions({ ...habitCompletions, [selectedDateStr]: newDayCompletions });
        
        if (!isDone) {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            triggerReward(rect.left + rect.width/2, rect.top + rect.height/2, 10);
        }
    };

    const toggleTaskCompletion = (taskId: string, newStatus: boolean) => {
        const dayTasks = schedule[selectedDateStr] || [];
        const newDayTasks = dayTasks.map(t => t.id === taskId ? { ...t, isCompleted: newStatus } : t);
        onUpdateSchedule({ ...schedule, [selectedDateStr]: newDayTasks });
        
        if (newStatus) {
            // Center screen confetti for tasks
            triggerReward(window.innerWidth / 2, window.innerHeight / 2, 50);
        }
    };

    const addTask = () => {
        const newTask: Task = {
            id: `task-${Date.now()}`,
            channelId: activeChannelIds.length > 0 ? activeChannelIds[0] : undefined, // Can be global
            title: '',
            status: 'idea',
            isCompleted: false
        };
        const dayTasks = schedule[selectedDateStr] || [];
        onUpdateSchedule({ ...schedule, [selectedDateStr]: [...dayTasks, newTask] });
    };

    const updateTask = (taskId: string, updates: Partial<Task>) => {
        const dayTasks = schedule[selectedDateStr] || [];
        const newDayTasks = dayTasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
        onUpdateSchedule({ ...schedule, [selectedDateStr]: newDayTasks });
    };

    const removeTask = (taskId: string) => {
        const dayTasks = schedule[selectedDateStr] || [];
        const newDayTasks = dayTasks.filter(t => t.id !== taskId);
        onUpdateSchedule({ ...schedule, [selectedDateStr]: newDayTasks });
    };

    return (
        <div className="flex h-full bg-gray-900/50 overflow-hidden border-t border-gray-700 relative">
            <ConfettiOverlay 
                active={confetti.active} 
                x={confetti.x} 
                y={confetti.y} 
                onComplete={() => setConfetti({ ...confetti, active: false })} 
            />

            {/* LEFT: Context (Channels & Goals) */}
            <div className="w-56 bg-gray-800/50 border-r border-gray-700 flex flex-col flex-shrink-0">
                
                {/* 1. Channels */}
                <div className="p-2 border-b border-gray-700 max-h-[150px] overflow-y-auto custom-scrollbar">
                     <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider flex justify-between">
                         {t('planner.activeChannels')}
                     </h4>
                     <div className="space-y-1">
                        {channels.length === 0 ? (
                            <div className="text-[10px] text-gray-600">{t('planner.noChannels')}</div>
                        ) : (
                            channels.map(ch => (
                                <div 
                                    key={ch.id}
                                    className={`flex items-center space-x-2 p-1.5 rounded cursor-pointer transition-colors border ${activeChannelIds.includes(ch.id) ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-gray-800 border-transparent hover:border-gray-600'}`}
                                    onClick={() => toggleActiveChannel(ch.id)}
                                >
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeChannelIds.includes(ch.id) ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                                    <span className={`text-xs truncate ${activeChannelIds.includes(ch.id) ? 'text-white' : 'text-gray-400'}`}>{ch.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. Global Goals */}
                <div className="flex-grow flex flex-col p-2 min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('planner.globalGoals')}</h4>
                        <button onClick={() => setIsCreatingGoal(!isCreatingGoal)} className="text-emerald-400 hover:text-white font-bold text-lg leading-none transition-transform hover:scale-110">+</button>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                        {isCreatingGoal && (
                            <div className="bg-gray-700/50 p-2 rounded border border-gray-600 mb-2 shadow-lg animate-fade-in-up">
                                <div className="flex gap-1 mb-1">
                                    <input 
                                        className="w-full bg-gray-900 p-1 text-xs text-white rounded border border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-400" 
                                        placeholder={t('planner.newGoalTitle')} 
                                        value={newGoalTitle} 
                                        onChange={e => setNewGoalTitle(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && saveGoal()}
                                        autoFocus
                                    />
                                    <button onClick={saveGoal} className="text-emerald-400 hover:text-white p-1" title="Save Goal">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                </div>
                                
                                <div className="flex gap-1 mb-2 justify-between">
                                    {COLORS.map(c => (
                                        <div key={c} onClick={() => setNewGoalColor(c)} className={`w-3 h-3 rounded-full cursor-pointer bg-${c}-500 ${newGoalColor === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`} />
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-[10px] text-gray-400">Days:</span>
                                    <input 
                                        type="number" 
                                        className="flex-grow bg-gray-900 p-1 text-xs text-white rounded border border-emerald-500 focus:outline-none" 
                                        value={newGoalDuration} 
                                        onChange={e => setNewGoalDuration(parseInt(e.target.value))} 
                                        onKeyDown={e => e.key === 'Enter' && saveGoal()}
                                    />
                                </div>
                                <div className="flex gap-1 mb-1 mt-2 border-t border-gray-600 pt-2">
                                    <input 
                                        className="flex-grow bg-gray-900 p-1 text-xs text-white rounded border border-emerald-500 focus:outline-none" 
                                        placeholder={t('planner.addHabit')} 
                                        value={newHabitInput} 
                                        onChange={e => setNewHabitInput(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && addHabit()} 
                                    />
                                    <button onClick={addHabit} className="text-gray-400 hover:text-white px-1">+</button>
                                </div>
                                <div className="space-y-0.5">
                                    {newGoalHabits.map((h, i) => <div key={i} className="text-[9px] text-gray-300 bg-gray-800/50 px-1 rounded flex items-center gap-1"><div className={`w-1 h-1 rounded-full bg-${newGoalColor}-500`}></div>{h}</div>)}
                                </div>
                            </div>
                        )}

                        {globalGoals.map(goal => {
                            // Calculate Progress
                            const start = new Date(goal.startDate).getTime();
                            const end = new Date(goal.endDate).getTime();
                            const now = new Date().getTime();
                            const total = end - start;
                            const current = Math.min(total, Math.max(0, now - start));
                            const percent = Math.floor((current / total) * 100);
                            const daysPassed = Math.floor(current / (1000 * 60 * 60 * 24));
                            const totalDays = Math.floor(total / (1000 * 60 * 60 * 24));

                            return (
                                <div key={goal.id} className={`bg-gray-800/80 p-2 rounded border border-${goal.color}-500/30 group`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold text-${goal.color}-400`}>{goal.title}</span>
                                        <button onClick={() => deleteGoal(goal.id)} className="text-[10px] text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100">&times;</button>
                                    </div>
                                    
                                    {/* Timer */}
                                    <div className="w-full bg-gray-900 h-1.5 rounded-full mb-1 overflow-hidden">
                                        <div className={`h-full bg-${goal.color}-500`} style={{ width: `${percent}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[9px] text-gray-500 font-mono mb-2">
                                        <span>{t('planner.dayProgress', { current: daysPassed })}</span>
                                        <span>{t('planner.totalDays', { total: totalDays })}</span>
                                    </div>

                                    {/* Static Habit List */}
                                    <div className="space-y-0.5">
                                        {goal.habits.map((h, i) => (
                                            <div key={i} className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <div className={`w-1 h-1 rounded-full bg-${goal.color}-500`}></div>
                                                {h}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* CENTER: Calendar */}
            <div className="flex-grow flex flex-col border-r border-gray-700 min-w-0 bg-gray-800/20">
                 <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-gray-800 flex-shrink-0">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">&lt;</button>
                    <span className="font-bold text-gray-200 capitalize">{monthName} {year}</span>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">&gt;</button>
                </div>
                
                <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-800/30 flex-shrink-0">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-center text-[10px] text-gray-500 py-1 font-bold">{d}</div>)}
                </div>

                <div className="grid grid-cols-7 grid-rows-6 flex-grow bg-gray-900/20">
                    {paddingDays.map(d => <div key={`pad-${d}`} className="border-r border-b border-gray-700/30 bg-gray-900/40"></div>)}
                    {days.map(day => {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = dateStr === selectedDateStr;
                        const tasks = schedule[dateStr] || [];
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const habitsDoneCount = globalGoals.reduce((acc, goal) => {
                            return acc + goal.habits.reduce((hAcc, _, idx) => hAcc + (habitCompletions[dateStr]?.[`${goal.id}-${idx}`] ? 1 : 0), 0);
                        }, 0);

                        return (
                            <div 
                                key={day} 
                                onClick={() => handleDateClick(day)}
                                className={`
                                    border-r border-b border-gray-700/30 relative cursor-pointer transition-colors flex flex-col p-1 min-h-[60px]
                                    ${isSelected ? 'bg-emerald-900/10 shadow-[inset_0_0_0_2px_#10b981]' : 'hover:bg-gray-800/50'}
                                    ${isToday ? 'bg-gray-800' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-[10px] font-mono mb-1 ${isToday ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>{day}</span>
                                    {habitsDoneCount > 0 && <span className="text-[9px] text-yellow-500 font-bold">★{habitsDoneCount}</span>}
                                </div>
                                
                                <div className="flex flex-col gap-1 overflow-hidden">
                                    {tasks.slice(0, 3).map(t => (
                                        <div key={t.id} className={`text-[8px] px-1 py-0.5 rounded truncate flex items-center gap-1 ${t.isCompleted ? 'bg-gray-700 text-gray-500 line-through' : `${STATUS_COLORS[t.status]} text-white`}`}>
                                            <div className={`w-1 h-1 rounded-full bg-white/50 flex-shrink-0`} />
                                            <span className="truncate">{t.title || 'Untitled'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT: Daily Detail (Habits & Tasks) */}
            <div className="w-80 bg-gray-800/80 flex flex-col min-w-0 flex-shrink-0 backdrop-blur-sm">
                <div className="p-3 border-b border-gray-700 bg-gray-900/50 font-bold text-gray-200 text-sm flex justify-between items-center">
                    <span>{selectedDateStr}</span>
                    <span className="text-xs text-gray-500 font-normal">{t('planner.dailyOverview')}</span>
                </div>
                
                <div className="flex-grow overflow-y-auto p-3 space-y-4 custom-scrollbar">
                    
                    {/* SECTION 1: DAILY ROUTINE (HABITS) */}
                    <div>
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700/50 pb-1">{t('planner.dailyRoutine')}</h5>
                        {globalGoals.length > 0 ? (
                            <div className="space-y-2">
                                {globalGoals.map(goal => (
                                    <div key={goal.id} className={`space-y-1 pl-2 border-l-2 border-${goal.color}-500/50`}>
                                        <div className={`text-[10px] font-bold text-${goal.color}-400 mb-1`}>{goal.title}</div>
                                        {goal.habits.map((habit, idx) => {
                                            const isDone = !!habitCompletions[selectedDateStr]?.[`${goal.id}-${idx}`];
                                            return (
                                                <div key={`${goal.id}-${idx}`} 
                                                     className={`flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-700/50 transition-all ${isDone ? 'opacity-50' : ''}`}
                                                     onClick={(e) => toggleHabit(e, goal.id, idx)}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isDone ? `bg-${goal.color}-600 border-${goal.color}-500` : 'bg-gray-800 border-gray-600'}`}>
                                                        {isDone && <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                    </div>
                                                    <span className={`text-xs ${isDone ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{habit}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center text-xs text-gray-600 py-4 italic">Add a Goal to track habits</div>
                        )}
                    </div>

                    {/* SECTION 2: SPECIFIC TASKS */}
                    <div>
                        <div className="flex justify-between items-center mb-2 border-b border-gray-700/50 pb-1">
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('planner.specificTasks')}</h5>
                            <button onClick={addTask} className="text-emerald-400 hover:text-white font-bold text-lg leading-none">+</button>
                        </div>
                        
                        <div className="space-y-2">
                             {(schedule[selectedDateStr] || []).map(task => (
                                <div key={task.id} className={`rounded border p-2 flex flex-col gap-2 transition-all ${task.isCompleted ? 'bg-gray-800/50 border-gray-700 opacity-60' : 'bg-gray-700/80 border-gray-600 shadow-md'}`}>
                                     <div className="flex items-start gap-2">
                                         <div className="pt-1">
                                             <CustomCheckbox 
                                                 checked={!!task.isCompleted} 
                                                 onChange={(checked) => toggleTaskCompletion(task.id, checked)} 
                                                 className="h-4 w-4"
                                             />
                                         </div>
                                         <div className="flex-grow min-w-0 space-y-2">
                                             <textarea value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })} placeholder={t('planner.taskPlaceholder')} className={`w-full bg-transparent border-none p-0 text-xs focus:ring-0 resize-none leading-snug ${task.isCompleted ? 'text-gray-500 line-through' : 'text-white'}`} rows={2} />
                                             <div className="flex justify-between items-center gap-1">
                                                 <select value={task.channelId || ''} onChange={(e) => updateTask(task.id, { channelId: e.target.value })} className="bg-gray-900/50 text-[9px] text-gray-400 border border-gray-600 rounded px-1 py-0.5 max-w-[90px] outline-none truncate" disabled={!!task.isCompleted}>
                                                    <option value="">{t('genre.general')}</option>
                                                    {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                 </select>
                                                 <select value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as any })} className={`text-[9px] font-bold uppercase rounded px-2 py-0.5 border border-transparent outline-none text-white ${task.isCompleted ? 'bg-gray-600' : STATUS_COLORS[task.status]}`} disabled={!!task.isCompleted}>
                                                    <option value="idea">Idea</option>
                                                    <option value="scripting">Script</option>
                                                    <option value="filming">Film</option>
                                                    <option value="published">Done</option>
                                                 </select>
                                             </div>
                                         </div>
                                         <button onClick={() => removeTask(task.id)} className="text-gray-500 hover:text-red-400 -mt-1 -mr-1">&times;</button>
                                     </div>
                                </div>
                            ))}
                             {(!schedule[selectedDateStr] || schedule[selectedDateStr].length === 0) && (
                                <div className="text-center text-xs text-gray-600 py-4 italic">{t('planner.noTasks')}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
