import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Sparkles, ShieldAlert, X, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export type AuthIntent =
  | { type: 'create_community' }
  | { type: 'join_community'; communityId: string; communityName: string }
  | { type: 'rsvp_event'; eventId: string }
  | { type: 'general' };

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authMode: 'signin' | 'signup';
  setAuthMode: (mode: 'signin' | 'signup') => void;
  verificationEmail: string | null;
  setVerificationEmail: (email: string | null) => void;
  authBannerMessage: string | null;
  intent?: AuthIntent;
  errorMessage?: string | null;
  suEmail: string;
  setSuEmail: (email: string) => void;
  suPassword: string;
  setSuPassword: (password: string) => void;
  suName: string;
  setSuName: (name: string) => void;
  suHeadline: string;
  setSuHeadline: (headline: string) => void;
  handleAuthSubmit: (e: React.FormEvent) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  authMode,
  setAuthMode,
  verificationEmail,
  setVerificationEmail,
  authBannerMessage,
  intent,
  errorMessage,
  suEmail,
  setSuEmail,
  suPassword,
  setSuPassword,
  suName,
  setSuName,
  suHeadline,
  setSuHeadline,
  handleAuthSubmit,
}) => {
  const activeIntent: AuthIntent = intent || { type: 'general' };

  const getHeaderCopy = () => {
    if (activeIntent.type === 'create_community') {
      return {
        title: 'Create Your Community',
        subtitle: 'Sign in or create an account to start and manage your hub.',
      };
    }
    if (activeIntent.type === 'join_community') {
      return {
        title: `Join ${activeIntent.communityName}`,
        subtitle: 'Sign in to join this workspace and participate in discussions.',
      };
    }
    if (activeIntent.type === 'rsvp_event') {
      return {
        title: 'RSVP to Event',
        subtitle: 'Sign in to reserve your spot and receive calendar updates.',
      };
    }
    return {
      title: 'Welcome to Work Connect',
      subtitle: 'Sign in to your workplace account.',
    };
  };

  const headerCopy = getHeaderCopy();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs" onClick={onClose} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            className="fixed top-1/2 left-1/2 w-[92%] max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl z-50 space-y-5 overflow-y-auto max-h-[85vh]"
          >
            {verificationEmail ? (
              <div className="text-center space-y-5 py-4">
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto dark:bg-emerald-950/40 dark:text-emerald-450 animate-pulse">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">Verify Your Email</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    Check your email: We sent a confirmation link to <span className="font-extrabold text-zinc-850 dark:text-zinc-150">{verificationEmail}</span>. Verify your email to complete registration.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setVerificationEmail(null);
                    setAuthMode('signin');
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg transition-all"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-1 relative">
                  <button 
                    onClick={onClose}
                    className="absolute -top-1 -right-1 p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                  <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <Sparkles className="h-5.5 w-5.5" />
                  </div>
                  <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white mt-2">
                    {headerCopy.title}
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    {headerCopy.subtitle}
                  </p>
                  
                  <div className="pt-1">
                    {isSupabaseConfigured ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50">
                        <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                        Live Supabase Server Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/50">
                        <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                        Offline Sandbox Mode Active
                      </span>
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-50 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-900/60 p-3 rounded-xl flex items-start gap-2 text-left"
                  >
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-750 dark:text-rose-300 font-medium leading-relaxed">
                      {errorMessage}
                    </p>
                  </motion.div>
                )}

                {authBannerMessage && !errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-50/70 border border-indigo-100/40 dark:bg-indigo-950/20 dark:border-indigo-900/50 p-3.5 rounded-2xl flex items-start gap-2.5"
                  >
                    <ShieldAlert className="h-4.5 w-4.5 text-indigo-650 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-850 dark:text-indigo-300 font-medium leading-relaxed text-left">
                      {authBannerMessage}
                    </p>
                  </motion.div>
                )}

                {/* Tab Selector */}
                <div className="flex bg-zinc-100 p-1 rounded-xl dark:bg-zinc-800">
                  <button
                    onClick={() => setAuthMode('signin')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      authMode === 'signin'
                        ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthMode('signup')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      authMode === 'signup'
                        ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. alex@company.com"
                      value={suEmail}
                      onChange={(e) => setSuEmail(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                    />
                  </div>

                  {authMode === 'signup' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Full Name</label>
                        <input 
                          type="text" 
                          required={authMode === 'signup'}
                          placeholder="e.g. Alex Rivera"
                          value={suName}
                          onChange={(e) => setSuName(e.target.value)}
                          className="w-full text-xs font-semibold px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Headline / Title</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Software Engineering Intern"
                          value={suHeadline}
                          onChange={(e) => setSuHeadline(e.target.value)}
                          className="w-full text-xs font-semibold px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg transition-all"
                    >
                      {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-bold dark:text-indigo-400 dark:hover:text-indigo-300 transition-all"
                    >
                      {authMode === 'signin' 
                        ? "Don't have an account? Sign Up" 
                        : "Already have an account? Sign In"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
