import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  Plus, 
  FileText, 
  Send, 
  Calendar, 
  Eye, 
  Percent, 
  CheckCircle, 
  User, 
  Sparkles,
  Smartphone,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Inbox,
  Lock
} from 'lucide-react';
import { Broadcast, Post } from '../types';

interface NewsletterTabProps {
  broadcasts: Broadcast[];
  trendingPosts: Post[];
  isAdminOrOwner: boolean;
  onAddBroadcast: (broadcastData: { subject: string; cohort: string; content: string }) => void;
  onShowNotification: (message: string, type: 'success' | 'info') => void;
}

export const NewsletterTab: React.FC<NewsletterTabProps> = ({
  broadcasts,
  trendingPosts,
  isAdminOrOwner,
  onAddBroadcast,
  onShowNotification
}) => {
  const [activeView, setActiveView] = useState<'archive' | 'compose'>('archive');
  
  // Composer State
  const [subject, setSubject] = useState('');
  const [targetCohort, setTargetCohort] = useState('All Staff');
  const [content, setContent] = useState('');
  
  // Mobile rendering layout select
  const [renderMode, setRenderMode] = useState<'mobile' | 'desktop'>('mobile');

  const handleInsertPostCuration = (post: Post) => {
    const curatedSnippet = `\n---
📰 HOT TOPIC: ${post.title}
By ${post.author.name} (${post.author.cohort})

"${post.content.slice(0, 150)}..."

👉 View this post and comments inside the Work Connect hub!
--- \n`;
    setContent((prev) => prev + curatedSnippet);
    onShowNotification(`Curated "${post.title}" into newsletter!`, 'success');
  };

  const handleCurationInsertWeeklyTop = () => {
    let compiled = `✨ Weekly Cohort Round-up & Highlights ✨\n\nHello Team!\nHere is a quick digest of what went down in our active cohort Hub this week. Make sure to stay updated and support your peers!\n\n`;
    
    trendingPosts.forEach((post, idx) => {
      compiled += `🔥 #${idx + 1} ${post.title}\nBy ${post.author.name} • Upvotes: ${post.upvotes}\n"${post.content.slice(0, 120)}..."\n\n`;
    });

    compiled += `\nUpcoming Events this Week:\n📅 Tech AMA Roundtable (Wed 2:00 PM)\n📅 Summer 2026 Intern Demo Day (Fri 10:00 AM)\n\nWe hope to see you there!\n\nBest,\nYour Work Connect Studio Team`;
    
    setContent(compiled);
    onShowNotification('Generated and inserted weekly digest summary!', 'success');
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrOwner) {
      onShowNotification('Permission Denied: Only Owners or Admins can dispatch newsletters.', 'info');
      return;
    }
    if (!subject.trim() || !content.trim()) return;

    onAddBroadcast({
      subject,
      cohort: targetCohort,
      content
    });

    onShowNotification('Email newsletter broadcast sent to all subscribers successfully!', 'success');
    
    // Reset Composer
    setSubject('');
    setContent('');
    setTargetCohort('All Staff');
    setActiveView('archive');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6" id="newsletter-view">
      
      {/* Tab Select View switcher */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-zinc-100 p-1 rounded-xl dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800">
          <button
            onClick={() => setActiveView('archive')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
              activeView === 'archive'
                ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-850 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Inbox className="h-4 w-4" />
            <span>Broadcast Logs ({broadcasts.length})</span>
          </button>
          
          {isAdminOrOwner && (
            <button
              onClick={() => setActiveView('compose')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
                activeView === 'compose'
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-850 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Broadcast Composer</span>
            </button>
          )}
        </div>

        {activeView === 'archive' && isAdminOrOwner && (
          <button
            onClick={() => setActiveView('compose')}
            className="bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all dark:bg-zinc-50 dark:hover:bg-zinc-250 dark:text-zinc-900 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Broadcast</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'archive' ? (
          <motion.div
            key="archive"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {broadcasts.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 dark:bg-zinc-950 dark:border-zinc-800 max-w-xl mx-auto" id="newsletter-empty">
                <Megaphone className="h-10 w-10 text-zinc-300 mx-auto mb-4 animate-bounce" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No newsletters dispatched yet.</h3>
                <p className="text-xs text-zinc-400 mt-1 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Compile top-voted posts and publish broadcasts directly to interns and mentors.
                </p>

                {/* Gated Compose Button Inside Empty State */}
                {isAdminOrOwner ? (
                  <button
                    onClick={() => setActiveView('compose')}
                    className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Compose First Issue</span>
                  </button>
                ) : (
                  <div className="mt-4 text-[10px] text-zinc-400">
                    Stay tuned! Subscribed newsletters from your administrators will appear here.
                  </div>
                )}
              </div>
            ) : (
              /* Drafts and published list */
              <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-4">Sent Campaigns & Drafts</h3>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {broadcasts.map((b) => (
                    <div key={b.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{b.subject}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === 'sent' 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400'
                          }`}>
                            {b.status === 'sent' ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span>Target: <strong>{b.cohort}</strong></span>
                          {b.sentAt && (
                            <>
                              <span>•</span>
                              <span>Sent on {b.sentAt}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Metrics widgets */}
                      {b.status === 'sent' && (
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-end gap-1 font-mono">
                              <Percent className="h-3 w-3 text-emerald-500" />
                              {b.openRate}%
                            </p>
                            <p className="text-[9px] text-zinc-400 font-medium">Open Rate</p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-end gap-1 font-mono">
                              <Percent className="h-3 w-3 text-indigo-500" />
                              {b.clickRate}%
                            </p>
                            <p className="text-[9px] text-zinc-400 font-medium">Click Rate</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          isAdminOrOwner ? (
            <motion.div
              key="compose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left Hand: Compose Panel */}
              <div className="col-span-1 lg:col-span-7 bg-white rounded-xl border border-zinc-200 p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-850">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Create Newsletter Broadcast</h3>
                  <button 
                    type="button" 
                    onClick={handleCurationInsertWeeklyTop}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2.5 py-1.5 rounded-lg dark:bg-zinc-900 dark:text-indigo-400 hover:scale-105 transition-transform"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Auto-Curation Highlight</span>
                  </button>
                </div>

                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Target Cohort</label>
                      <select
                        value={targetCohort}
                        onChange={(e) => setTargetCohort(e.target.value)}
                        className="w-full text-xs font-semibold border border-zinc-200 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 focus:outline-none"
                      >
                        <option value="All Staff">All Staff / Subscribers</option>
                        <option value="Interns Only">Interns Only</option>
                        <option value="Engineering Hub">Engineering Hub</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Campaign Subject</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g., Weekly Digests: Top highlights from Engineering Hub..."
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full text-xs font-medium border border-zinc-200 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Newsletter Body (Markdown / Plaintext)</label>
                    <textarea 
                      rows={12}
                      required
                      placeholder="Compose your newsletter broadcast here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-300 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                    <button
                      type="button"
                      onClick={() => setActiveView('archive')}
                      className="text-xs font-bold border border-zinc-200 text-zinc-600 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-355"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Send className="h-4.5 w-4.5" />
                      <span>Send Newsletter</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Hand: Interactive Real-Time Curated Feed & Preview Selector */}
              <div className="col-span-1 lg:col-span-5 space-y-6">
                
                {/* Active Hub Posts Curations Drawer */}
                <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-850">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                      Insert Top Curation Snippets
                    </h4>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Live Hub</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {trendingPosts.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-4 text-center">No active community posts to curate.</p>
                    ) : (
                      trendingPosts.map((post) => (
                        <div 
                          key={post.id} 
                          onClick={() => handleInsertPostCuration(post)}
                          className="p-3 border border-zinc-100 rounded-xl hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer bg-zinc-50/50 flex items-start justify-between gap-3 dark:bg-zinc-900/40 dark:border-zinc-850"
                        >
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-zinc-850 truncate dark:text-zinc-200">{post.title}</h5>
                            <p className="text-[10px] text-zinc-400 mt-0.5">By {post.author.name} • {post.upvotes} upvotes</p>
                          </div>
                          <button className="text-[10px] font-bold text-indigo-600 shrink-0 hover:underline dark:text-indigo-400">
                            + Insert
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Simulated Live Newsletter Mobile Render Mockup */}
                <div className="bg-zinc-900 text-white rounded-2xl border border-zinc-800 p-5 relative overflow-hidden shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-1 text-[11px] font-bold font-mono text-zinc-400">
                      <Smartphone className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{renderMode === 'mobile' ? 'Mobile Inbox Preview' : 'Web Browser Preview'}</span>
                    </div>

                    <div className="bg-zinc-800 rounded-lg p-0.5 flex">
                      <button 
                        onClick={() => setRenderMode('mobile')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${renderMode === 'mobile' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                      >
                        Mobile
                      </button>
                      <button 
                        onClick={() => setRenderMode('desktop')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${renderMode === 'desktop' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                      >
                        Desktop
                      </button>
                    </div>
                  </div>

                  {/* Mock Device Shell */}
                  <div className={`bg-zinc-950 rounded-xl p-4 border border-zinc-800 overflow-y-auto max-h-[300px] font-sans ${renderMode === 'mobile' ? 'max-w-xs mx-auto text-[11px]' : 'text-xs'}`}>
                    <div className="border-b border-zinc-900 pb-3 mb-3 text-zinc-450 space-y-1">
                      <p><strong>From:</strong> updates@workconnect.com</p>
                      <p><strong>To:</strong> cohort-subscribers@workconnect.com</p>
                      <p><strong>Subject:</strong> {subject || '(Insert subject above...)'}</p>
                    </div>

                    <div className="whitespace-pre-wrap leading-relaxed text-zinc-300 font-mono text-[10px]">
                      {content || 'Start typing in the editor on the left to see your newsletter take shape in real time here!'}
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>
          ) : (
            <div className="p-8 text-center bg-white border border-zinc-200 rounded-xl dark:bg-zinc-950 dark:border-zinc-850">
              <Lock className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">Only community Administrators or Owners can write and send newsletters.</p>
            </div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};
