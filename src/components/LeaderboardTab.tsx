import React, { useState } from 'react';
import { Trophy, Shield, HelpCircle, Star, Flame, Sparkles, Award } from 'lucide-react';
import { User } from '../types';

interface LeaderboardTabProps {
  users: User[];
  currentUser: User;
  onSelectUser?: (user: User) => void;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  users,
  currentUser,
  onSelectUser,
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('7d');

  // To simulate different points for different timeframes, let's adjust them dynamically in mock render
  const getSimulatedUsers = () => {
    return [...users]
      .map((u) => {
        let pts = u.points;
        if (timeframe === '7d') {
          // Keep points as-is or scale down
          pts = Math.round(u.points * 0.45);
        } else if (timeframe === '30d') {
          pts = Math.round(u.points * 0.8);
        }
        return { ...u, points: pts };
      })
      .sort((a, b) => b.points - a.points);
  };

  const sortedUsers = getSimulatedUsers();

  const getRankBadge = (idx: number) => {
    switch (idx) {
      case 0:
        return <span className="h-6 w-6 rounded-full bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center text-xs font-bold font-mono shadow-sm dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-400">🥇</span>;
      case 1:
        return <span className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold font-mono shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">🥈</span>;
      case 2:
        return <span className="h-6 w-6 rounded-full bg-amber-50 border border-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold font-mono shadow-sm dark:bg-amber-900/10 dark:border-amber-900/30 dark:text-amber-500">🥉</span>;
      default:
        return <span className="h-6 w-6 text-zinc-400 flex items-center justify-center text-xs font-bold font-mono">{idx + 1}</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6" id="leaderboard-view">
      
      {/* Tab and Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Ranked Leaderboard */}
        <div className="col-span-1 lg:col-span-8 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
          
          {/* Header & Filter Controls */}
          <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:border-zinc-850">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500 fill-amber-100 dark:fill-amber-950/20" />
                Contributor Rankings
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Recognizing team members driving the cohort’s knowledge base.</p>
            </div>

            {/* Timeframe Filter */}
            <div className="flex bg-zinc-50 border border-zinc-100 p-1 rounded-lg dark:bg-zinc-900 dark:border-zinc-800">
              <button
                onClick={() => setTimeframe('7d')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  timeframe === '7d'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-850 dark:text-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeframe('30d')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  timeframe === '30d'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-850 dark:text-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeframe('all')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  timeframe === 'all'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-850 dark:text-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
              >
                All-Time
              </button>
            </div>
          </div>

          {/* Leaderboard Table List */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {sortedUsers.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 dark:text-zinc-500" id="leaderboard-empty">
                <Trophy className="h-10 w-10 text-zinc-300 mx-auto mb-4 animate-bounce" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Leaderboard is currently empty.</h3>
                <p className="text-xs text-zinc-400 mt-2 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  Upvote constructive threads and post valuable feedback to earn karma points!
                </p>
              </div>
            ) : (
              sortedUsers.map((user, idx) => {
                const isMe = user.id === currentUser.id;
                return (
                  <div 
                    key={user.id}
                    onClick={() => onSelectUser && onSelectUser(user)}
                    className={`flex items-center justify-between p-4 transition-colors cursor-pointer group ${
                      isMe 
                        ? 'bg-indigo-50/20 dark:bg-zinc-900/40' 
                        : 'hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-8 flex items-center justify-center">
                        {getRankBadge(idx)}
                      </div>

                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full object-cover border border-zinc-100 dark:border-zinc-800 group-hover:ring-2 group-hover:ring-indigo-500/40 transition-all"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-semibold truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-950 dark:text-zinc-200'}`}>
                            {user.name} {isMe && '(You)'}
                          </span>
                          <span className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded dark:bg-zinc-800 dark:text-zinc-400">
                            {user.cohort}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 px-1 rounded dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400">
                            Lvl {user.level}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">Cohort Contributor</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-zinc-900 font-mono dark:text-zinc-50">{user.points} pts</p>
                        <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider font-mono">Karma</p>
                      </div>
                      <ChevronRightBadge idx={idx} />
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Side: How points work details */}
        <div className="col-span-1 lg:col-span-4 space-y-4 sticky top-20">
          
          {/* gamified points explanation card */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              How Points & Levels Work
            </h3>
            
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed dark:text-zinc-400">
              Work Connect operates on a fully peer-vouched merit system. Contributions boost your standing and level up your access.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="text-sm mt-0.5">⚡</span>
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Peer Recognition</h4>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">Earn 1 point whenever a peer likes or upvotes your post or helpful comment.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-sm mt-0.5">⭐</span>
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Instructor Choice</h4>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">Earn 10 points when a Mentor or Lead pins your project, win, or QA reply as recommended reading.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-sm mt-0.5">🎓</span>
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Course Tracks completion</h4>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">Earn 20 points upon completing an entire course track with lessons marked checked.</p>
                </div>
              </div>
            </div>

            {/* Level tiers breakdown */}
            <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-850">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Level Unlock Perks</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-zinc-600 dark:text-zinc-300">Lvl 1 - 3: Intern Base</span>
                  <span className="text-zinc-400">View Classroom tracks</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-zinc-600 dark:text-zinc-300">Lvl 4 - 6: Contributor Elite</span>
                  <span className="text-emerald-500">Host Calendar mixers</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-zinc-600 dark:text-zinc-300">Lvl 7+: Hub Master</span>
                  <span className="text-indigo-500">Broadcast newsletters</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current User Achievements Box */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 rounded-xl border border-indigo-100 p-5 shadow-sm dark:from-zinc-900 dark:to-zinc-900/40 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow">
                Lvl {currentUser.level}
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Your Standing</h4>
                <p className="text-[10px] text-zinc-400">Next level at 300 Karma points</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 mt-3 leading-relaxed dark:text-zinc-300">
              You’re doing great! Keep upvoting valuable replies and publish wins to accelerate your progress.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

const ChevronRightBadge: React.FC<{ idx: number }> = ({ idx }) => {
  if (idx === 0) return <span className="text-amber-500 text-xs">✨</span>;
  if (idx === 1) return <span className="text-slate-400 text-xs">⭐</span>;
  return null;
};
