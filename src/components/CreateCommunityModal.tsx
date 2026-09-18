import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Globe, UserCheck, Lock, X } from 'lucide-react';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  newCommName: string;
  newCommSlug: string;
  newCommDesc: string;
  newCommPrivacy: 'public' | 'gated' | 'private';
  onNameChange: (name: string) => void;
  onSlugChange: (slug: string) => void;
  onDescChange: (desc: string) => void;
  onPrivacyChange: (privacy: 'public' | 'gated' | 'private') => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  isOpen,
  onClose,
  newCommName,
  newCommSlug,
  newCommDesc,
  newCommPrivacy,
  onNameChange,
  onSlugChange,
  onDescChange,
  onPrivacyChange,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50"
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500 fill-indigo-100 dark:fill-indigo-950/40" />
                Create a Community
              </h3>
              <button 
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Community Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Interns Summer 2026, Frontend Guild"
                  value={newCommName}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Handle Slug URL</label>
                <div className="flex rounded-xl bg-zinc-50 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 overflow-hidden text-xs">
                  <span className="px-3.5 py-2.5 text-zinc-400 border-r border-zinc-200 bg-zinc-100 dark:bg-zinc-850 dark:border-zinc-700 select-none font-medium">
                    workconnect.com/
                  </span>
                  <input 
                    type="text" 
                    required
                    placeholder="slug"
                    value={newCommSlug}
                    onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                    className="flex-1 px-3.5 py-2.5 bg-transparent focus:outline-none font-semibold text-zinc-700 dark:text-zinc-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Hub Description</label>
                <textarea 
                  rows={3}
                  placeholder="Briefly describe the purpose of this community space..."
                  value={newCommDesc}
                  onChange={(e) => onDescChange(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Privacy Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'public' as const, label: 'Public', icon: Globe },
                    { val: 'gated' as const, label: 'Gated', icon: UserCheck },
                    { val: 'private' as const, label: 'Private', icon: Lock }
                  ].map((mode) => (
                    <button
                      key={mode.val}
                      type="button"
                      onClick={() => onPrivacyChange(mode.val)}
                      className={`p-2.5 border rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        newCommPrivacy === mode.val
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:border-indigo-500 dark:text-indigo-400 dark:bg-zinc-850'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:bg-zinc-850 dark:border-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <mode.icon className="h-4 w-4" />
                      <span>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-350"
                >
                  Cancel
                </button>

                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all"
                >
                  Launch Community
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
