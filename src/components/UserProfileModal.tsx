import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Award, 
  Trophy, 
  Flame, 
  Shield, 
  Globe, 
  Github, 
  Linkedin, 
  Calendar, 
  Sparkles,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { User } from '../types';

interface UserProfileModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  isCurrentUser?: boolean;
  onEditProfile?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  isCurrentUser,
  onEditProfile,
}) => {
  if (!user) return null;

  // Level XP calculations (each level is 300 points)
  const currentPoints = user.points || 0;
  const currentLevel = user.level || 1;
  const currentLevelBasePoints = (currentLevel - 1) * 300;
  const nextLevelPoints = currentLevel * 300;
  const pointsInCurrentLevel = Math.max(0, currentPoints - currentLevelBasePoints);
  const progressPercent = Math.min(100, Math.round((pointsInCurrentLevel / 300) * 100));
  const pointsNeeded = Math.max(0, nextLevelPoints - currentPoints);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 w-[92%] max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header Banner */}
            <div className="relative h-32 w-full overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shrink-0">
              {user.bannerUrl && (
                <img 
                  src={user.bannerUrl} 
                  alt="Profile Banner" 
                  className="w-full h-full object-cover opacity-60" 
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center transition-colors"
                aria-label="Close Profile"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Edit Shortcut for Current User */}
              {isCurrentUser && onEditProfile && (
                <button
                  onClick={() => {
                    onClose();
                    onEditProfile();
                  }}
                  className="absolute top-3 right-13 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 pt-0 overflow-y-auto space-y-6">
              
              {/* Avatar + Main Title Row */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 gap-3 relative">
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white dark:ring-zinc-900 shadow-xl bg-white dark:bg-zinc-900"
                  />
                  <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black h-7 w-7 rounded-xl flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow">
                    L{user.level}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:mb-1">
                  {user.role && (
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      user.role === 'owner'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400'
                        : user.role === 'admin'
                        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30 dark:text-indigo-400'
                        : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                    }`}>
                      {user.role}
                    </span>
                  )}
                  {user.cohort && (
                    <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
                      {user.cohort}
                    </span>
                  )}
                </div>
              </div>

              {/* User Identity Info */}
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  {user.name}
                  {user.points >= 500 && (
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  )}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                  {user.cohort || 'Work Connect Cohort Member'}
                </p>
                {user.bio && (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-2.5 leading-relaxed">
                    {user.bio}
                  </p>
                )}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2.5 bg-zinc-50 dark:bg-zinc-850/60 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Karma Points</span>
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1 mt-0.5">
                    <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                    {user.points}
                  </span>
                </div>
                <div className="border-x border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Level Tier</span>
                  <span className="text-base font-black text-zinc-900 dark:text-white flex items-center justify-center gap-1 mt-0.5">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Level {user.level}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Global Rank</span>
                  <span className="text-base font-black text-zinc-900 dark:text-white flex items-center justify-center gap-1 mt-0.5">
                    <Shield className="h-4 w-4 text-teal-500" />
                    {user.rank ? `#${user.rank}` : 'Top 10%'}
                  </span>
                </div>
              </div>

              {/* Level XP Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-zinc-600 dark:text-zinc-300">Level {currentLevel} Progress</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {pointsInCurrentLevel} / 300 XP ({pointsNeeded} XP to Level {currentLevel + 1})
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                  />
                </div>
              </div>

              {/* Skills & Expertise */}
              {user.skills && user.skills.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                    Expertise & Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {user.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Badges & Accolades */}
              {user.badges && user.badges.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                    Unlocked Badges
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {user.badges.map((badge) => (
                      <div
                        key={badge}
                        className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 border border-zinc-100 dark:bg-zinc-850/50 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200"
                      >
                        <Award className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="truncate">{badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Social and Portfolio Links */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-3">
                {user.githubUrl && (
                  <a
                    href={user.githubUrl.startsWith('http') ? user.githubUrl : `https://${user.githubUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    <span>GitHub</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {user.linkedinUrl && (
                  <a
                    href={user.linkedinUrl.startsWith('http') ? user.linkedinUrl : `https://${user.linkedinUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  >
                    <Linkedin className="h-4 w-4 text-sky-600" />
                    <span>LinkedIn</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {user.websiteUrl && (
                  <a
                    href={user.websiteUrl.startsWith('http') ? user.websiteUrl : `https://${user.websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  >
                    <Globe className="h-4 w-4 text-teal-600" />
                    <span>Portfolio</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {user.joinedAt && (
                  <div className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Joined {user.joinedAt}</span>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
