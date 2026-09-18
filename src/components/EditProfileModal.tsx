import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, X } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  upName: string;
  setUpName: (name: string) => void;
  upHeadline: string;
  setUpHeadline: (headline: string) => void;
  upAvatar: string;
  setUpAvatar: (avatar: string) => void;
  prebuiltAvatars: string[];
  onSubmit: (e: React.FormEvent) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  upName,
  setUpName,
  upHeadline,
  setUpHeadline,
  upAvatar,
  setUpAvatar,
  prebuiltAvatars,
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
                <UserIcon className="h-4.5 w-4.5 text-indigo-500" />
                Your Profile Information
              </h3>
              <button 
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Alex Rivera"
                  value={upName}
                  onChange={(e) => setUpName(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Headline / Cohort Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Software Engineering Intern"
                  value={upHeadline}
                  onChange={(e) => setUpHeadline(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Select Avatar Icon</label>
                <div className="flex items-center gap-2 justify-center py-2">
                  {prebuiltAvatars.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setUpAvatar(av)}
                      className={`h-10 w-10 rounded-full overflow-hidden border-2 transition-all ${
                        upAvatar === av ? 'border-indigo-500 scale-110 shadow' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={av} alt="avatar option" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold border border-zinc-200 text-zinc-600 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-350"
                >
                  Cancel
                </button>

                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
