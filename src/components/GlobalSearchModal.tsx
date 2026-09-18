import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Laptop, ChevronRight } from 'lucide-react';
import { Community, Post, CourseTrack } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (query: string) => void;
  communities: Community[];
  posts: Post[];
  courses: CourseTrack[];
  onSelectCommunity: (communityId: string) => void;
  onSelectPost: (communityId: string) => void;
  onSelectCourse: (communityId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  query,
  setQuery,
  communities,
  posts,
  courses,
  onSelectCommunity,
  onSelectPost,
  onSelectCourse,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-xs" onClick={onClose} />
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <Search className="h-4.5 w-4.5 text-zinc-400" />
              <input 
                type="text" 
                autoFocus
                placeholder="Global search posts, classes, users, events..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-xs font-medium focus:outline-none bg-transparent dark:text-zinc-200"
              />
              <button 
                onClick={onClose}
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 bg-zinc-100 px-1.5 py-1 rounded dark:bg-zinc-850"
              >
                ESC
              </button>
            </div>

            {/* Instant Search Results */}
            <div className="max-h-64 overflow-y-auto p-4 divide-y divide-zinc-50 dark:divide-zinc-850">
              {query === '' ? (
                <div className="text-center py-6 text-zinc-400">
                  <Laptop className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                  <p className="text-[11px]">Type something to browse communities, feeds, and classes instantly...</p>
                </div>
              ) : (
                <>
                  {/* Communities match */}
                  {communities.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => onSelectCommunity(c.id)}
                      className="py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded px-2 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1 rounded dark:bg-zinc-900 dark:text-indigo-400">Community</span>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">{c.name}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                    </div>
                  ))}

                  {/* Posts match */}
                  {posts.filter(p => p.title.toLowerCase().includes(query.toLowerCase())).map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => onSelectPost(p.communityId || 'interns-2026')}
                      className="py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded px-2"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1 rounded dark:bg-zinc-900 dark:text-amber-400">Post</span>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">{p.title}</p>
                    </div>
                  ))}

                  {/* Courses match */}
                  {courses.filter(c => c.title.toLowerCase().includes(query.toLowerCase())).map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => onSelectCourse(c.communityId || 'interns-2026')}
                      className="py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded px-2"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-1 rounded dark:bg-zinc-900 dark:text-teal-400">Course</span>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">{c.title}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
