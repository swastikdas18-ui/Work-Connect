import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  ThumbsUp, 
  Bookmark, 
  Code, 
  Image as ImageIcon, 
  Send, 
  Sparkles, 
  Plus, 
  Search, 
  Layers, 
  Megaphone, 
  Trophy, 
  TrendingUp, 
  Clock, 
  Heart,
  Share2,
  MoreVertical,
  Info,
  ChevronRight,
  Flame,
  Globe,
  Lock,
  UserCheck,
  Loader2,
  X as CloseIcon,
  AlertCircle
} from 'lucide-react';
import { Post, User, CalendarEvent, Community } from '../types';
import { compressImage, fileToDataUrl, formatFileSize } from '../utils/imageCompressor';

interface CommunityTabProps {
  activeCommunity: Community;
  posts: Post[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onUpvotePost: (postId: string) => void;
  onAddPost: (postData: { title: string; content: string; codeSnippet?: string; mediaUrl?: string; mediaFile?: File; category: string }, sendAsNewsletter: boolean) => Promise<void> | void;
  onAddComment: (postId: string, content: string) => Promise<void> | void;
  onToggleBookmark: (postId: string) => void;
  currentUser: User;
  leaderboardUsers: User[];
  onOpenNewsletterComposeWithContent?: (subject: string, content: string) => void;
  onSelectUser?: (user: User) => void;
  showToast?: (message: string) => void;
}

export const CommunityTab: React.FC<CommunityTabProps> = ({
  activeCommunity,
  posts,
  categories,
  selectedCategory,
  onSelectCategory,
  onUpvotePost,
  onAddPost,
  onAddComment,
  onToggleBookmark,
  currentUser,
  leaderboardUsers,
  onOpenNewsletterComposeWithContent,
  onSelectUser,
  showToast
}) => {
  const [sortBy, setSortBy] = useState<'activity' | 'newest' | 'top'>('activity');
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [category, setCategory] = useState('All');
  const [sendAsNewsletter, setSendAsNewsletter] = useState(false);

  // Zero-cost image compression state
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    previewUrl: string;
    originalSize: number;
    compressedSize: number;
    reductionPercentage: number;
    dataUrl?: string;
  } | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [compressionError, setCompressionError] = useState<string | null>(null);

  // Client-side cooldown ref to track last successful post timestamp
  const lastPostTimestampRef = useRef<number>(0);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setCompressionError(null);
    setIsCompressingImage(true);

    try {
      // Compress with 1400px maximum dimension and 0.8 WebP quality
      const result = await compressImage(file, { maxDimension: 1400, quality: 0.8 });
      const dataUrl = await fileToDataUrl(result.blob);
      setSelectedImage({
        ...result,
        dataUrl
      });
    } catch (err) {
      console.error('Image compression failed:', err);
      setCompressionError('Image processing failed. Try another file.');
    } finally {
      setIsCompressingImage(false);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  const handleRemoveSelectedImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
    setCompressionError(null);
  };
  
  // Active comment drawer
  const [activePostForComments, setActivePostForComments] = useState<Post | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Filter posts belonging to active community AND search query AND category
  const filteredPosts = posts
    .filter(post => {
      // Must match communityId
      const matchesCommunity = post.communityId === activeCommunity.id;
      // Category match (All maps to any)
      const matchesCategory = selectedCategory === 'All' || post.category?.toLowerCase() === selectedCategory?.toLowerCase();
      // Search term match
      const matchesSearch = searchQuery === '' || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCommunity && matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return 0; // Maintain feed array order (newly prepended posts stay on top)
      if (sortBy === 'top') return b.upvotes - a.upvotes;
      return (b.upvotes + b.comments.length * 3) - (a.upvotes + a.comments.length * 3); // activity weight
    });

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || isCompressingImage) return;

    // Client-side 2-second cooldown guard — always show feedback
    const now = Date.now();
    const COOLDOWN_MS = 2000;
    if (now - lastPostTimestampRef.current < COOLDOWN_MS || isSubmitting) {
      showToast?.('You are doing that a bit too fast. Please wait a few seconds.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddPost({
        title,
        content,
        codeSnippet: codeSnippet.trim() ? codeSnippet : undefined,
        mediaUrl: selectedImage?.dataUrl || selectedImage?.previewUrl || undefined,
        mediaFile: selectedImage?.file || undefined,
        category: category === 'All' ? 'Discussions' : category
      }, sendAsNewsletter);

      // Mark successful post timestamp for cooldown tracking
      lastPostTimestampRef.current = Date.now();

      // Reset Form State
      setTitle('');
      setContent('');
      setCodeSnippet('');
      setSelectedImage(null);
      setCategory('All');
      setSendAsNewsletter(false);
      setShowCreateBox(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitComment = async (postId: string) => {
    if (!newCommentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await onAddComment(postId, newCommentText);
      setNewCommentText('');
      
      // Refresh open drawer post data
      const updatedPost = posts.find(p => p.id === postId);
      if (updatedPost) {
        setActivePostForComments(updatedPost);
      }
    } catch (err) {
      console.error(err);
    } finally {
      // 2-second client-side submission cooldown
      setTimeout(() => {
        setIsSubmittingComment(false);
      }, 2000);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="streamlined-community-view">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Central Feed - Generous breathing room, max-width ~700px */}
        <div className="col-span-1 lg:col-span-8 space-y-5 max-w-[700px] mx-auto w-full">
          
          {/* Streamlined Horizontal Category Pills with Fade Indicator */}
          <div className="relative overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pr-14 scrollbar-hide select-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Subtle Right Edge Fade for Horizontal Scroll Discovery (Prominent on Mobile) */}
            <div 
              aria-hidden="true" 
              className="absolute right-0 top-0 bottom-2 w-14 pointer-events-none bg-gradient-to-l from-zinc-50 via-zinc-50/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80" 
            />
          </div>

          {/* Clean Composer Trigger Placeholder */}
          {!showCreateBox ? (
            <button 
              type="button"
              id="post-composer-trigger"
              data-testid="post-composer-trigger"
              onClick={() => setShowCreateBox(true)}
              className="w-full text-left bg-white rounded-xl border border-zinc-200/80 p-4 shadow-sm cursor-pointer flex items-center gap-3 hover:border-zinc-300 transition-all dark:bg-zinc-950 dark:border-zinc-850"
            >
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-9 h-9 rounded-full object-cover"
              />
              <div className="flex-1 text-zinc-400 text-xs font-medium bg-zinc-50 dark:bg-zinc-900/60 rounded-lg px-4 py-2 border border-zinc-100 dark:border-zinc-800">
                Write a thought, question, or win...
              </div>
            </button>
          ) : (
            <motion.form 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmitPost}
              className="bg-white rounded-xl border border-zinc-200/80 p-5 shadow-md space-y-4 dark:bg-zinc-950 dark:border-zinc-850"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">New Publication</span>
                <button 
                  type="button" 
                  onClick={() => setShowCreateBox(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3">
                <input 
                  type="text" 
                  required
                  placeholder="Post title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-base font-bold bg-transparent focus:outline-none dark:text-zinc-100"
                />
                
                <textarea 
                  required
                  rows={4}
                  placeholder="What is on your mind? Share the details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none resize-none dark:text-zinc-200 leading-relaxed"
                />

                {/* Optional code snippet container */}
                <div className="border border-zinc-100 rounded-lg overflow-hidden dark:border-zinc-850">
                  <div className="bg-zinc-50 px-3 py-1 text-[10px] font-bold text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800">
                    TypeScript Snippet (Optional)
                  </div>
                  <textarea 
                    rows={3}
                    placeholder="// Paste syntax block here..."
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    className="w-full font-mono text-xs p-3 bg-zinc-950 text-emerald-400 focus:outline-none"
                  />
                </div>

                {/* Media Upload & Inline Compression Preview */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-850 transition-all">
                      <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{selectedImage ? 'Change Image' : 'Attach Image'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageFileChange}
                        disabled={isCompressingImage || isSubmitting}
                      />
                    </label>
                    <span className="text-[10px] text-zinc-400">
                      Auto-compressed (WebP • max 1400px • zero storage cost)
                    </span>
                  </div>

                  {/* Compression In-Progress Indicator */}
                  {isCompressingImage && (
                    <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-900/50 flex items-center gap-2.5 animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                      <div className="text-xs">
                        <span className="font-bold text-indigo-900 dark:text-indigo-200">Optimizing image...</span>
                        <span className="text-indigo-600 dark:text-indigo-400 ml-1.5 text-[11px]">Resizing on canvas & converting to WebP</span>
                      </div>
                    </div>
                  )}

                  {/* Compression Error Notice */}
                  {compressionError && (
                    <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{compressionError}</span>
                    </div>
                  )}

                  {/* Compressed Image Preview Card */}
                  {selectedImage && !isCompressingImage && (
                    <div className="relative rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 p-2.5 flex items-center gap-3">
                      <img 
                        src={selectedImage.previewUrl} 
                        alt="Upload preview" 
                        className="w-16 h-16 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {selectedImage.file.name}
                          </span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            -{selectedImage.reductionPercentage}% smaller
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                          <span className="line-through">{formatFileSize(selectedImage.originalSize)}</span>
                          <span>→</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatFileSize(selectedImage.compressedSize)}</span>
                          <span>•</span>
                          <span>WebP 0.8 Quality</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleRemoveSelectedImage} 
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors"
                        title="Remove image"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="text-xs font-bold border border-zinc-200 rounded-lg bg-white px-2.5 py-1.5 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 focus:outline-none"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={sendAsNewsletter}
                      onChange={(e) => setSendAsNewsletter(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <span className="text-[11px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                      Include in Weekly Newsletter
                    </span>
                  </label>
                </div>

                <button 
                  type="submit"
                  className={`bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 flex items-center gap-1.5 ${isSubmitting ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Post'}</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* Search bar & Sorting bar */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200/80 shadow-sm dark:bg-zinc-950 dark:border-zinc-850">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg focus:outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortBy('activity')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'activity' ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => setSortBy('newest')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'newest' ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                New
              </button>
            </div>
          </div>

          {/* Chronological Post Cards */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 dark:bg-zinc-950 dark:border-zinc-850 max-w-xl mx-auto" id="feed-empty">
                <MessageSquare className="h-10 w-10 text-zinc-300 mx-auto mb-4 animate-pulse" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">This feed is silent.</h3>
                <p className="text-xs text-zinc-400 mt-2 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  Be the first to share an announcement, ask a question, or post a win!
                </p>
                <button
                  onClick={() => setShowCreateBox(true)}
                  className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Publish First Post</span>
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    layoutId={`post-${post.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-white rounded-xl border border-zinc-200/80 p-5 shadow-sm hover:border-zinc-300 transition-all dark:bg-zinc-950 dark:border-zinc-850"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div 
                        onClick={() => onSelectUser && onSelectUser(post.author)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <img 
                          src={post.author.avatar} 
                          alt={post.author.name} 
                          className="w-9 h-9 rounded-full object-cover group-hover:ring-2 group-hover:ring-indigo-500/40 transition-all"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{post.author.name}</span>
                            <span className="text-[10px] font-bold bg-zinc-50 text-zinc-500 px-1.5 py-0.2 rounded dark:bg-zinc-900 dark:text-zinc-400">{post.author.cohort}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                            <span>{post.timestamp}</span>
                            <span>•</span>
                            <span className="font-bold text-zinc-500">{post.category}</span>
                            {post.isNewsletter && (
                              <span className="text-rose-500 font-bold bg-rose-50 px-1 py-0.1 rounded dark:bg-rose-950/20">Broadcast</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => onToggleBookmark(post.id)}
                        className={`p-1 rounded-lg transition-colors ${
                          post.isBookmarked ? 'text-amber-500' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${post.isBookmarked ? 'fill-amber-500' : ''}`} />
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="mt-3">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-snug">{post.title}</h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                      {post.mediaUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950/5 dark:bg-zinc-900/50 max-h-[480px] flex items-center justify-center">
                          <img 
                            src={post.mediaUrl} 
                            alt={post.title} 
                            loading="lazy"
                            className="w-full h-auto max-h-[480px] object-contain rounded-lg"
                            onError={(e) => {
                              // Hide broken image icons silently (e.g. expired base64 or 400 storage URLs)
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {post.codeSnippet && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-zinc-850 bg-zinc-950 p-3">
                          <pre className="font-mono text-[11px] text-emerald-400 overflow-x-auto">
                            <code>{post.codeSnippet}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Action Panel */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onUpvotePost(post.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            post.hasUpvoted
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-zinc-900 dark:border-indigo-850 dark:text-indigo-400'
                              : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:text-zinc-400'
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          <span>{post.upvotes}</span>
                        </button>

                        <button 
                          onClick={() => setActivePostForComments(post)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>{post.comments.length}</span>
                        </button>
                      </div>

                      {onOpenNewsletterComposeWithContent && (
                        <button 
                          onClick={() => onOpenNewsletterComposeWithContent(post.title, post.content)}
                          className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
                        >
                          <Share2 className="h-3 w-3" />
                          <span>Curate</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

        </div>

        {/* Compact Right Sidebar - About Community, Member info & Mini Leaderboard */}
        <div className="hidden lg:block lg:col-span-4 space-y-4 sticky top-24">
          
          {/* About Hub Card */}
          <div className="bg-white rounded-xl border border-zinc-200/80 p-4 shadow-sm dark:bg-zinc-950 dark:border-zinc-850">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              About Hub
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {activeCommunity.description}
            </p>
            
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Privacy</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-200 capitalize flex items-center gap-1">
                  {activeCommunity.privacy === 'public' ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {activeCommunity.privacy}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Members</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-200">{activeCommunity.memberCount} active</span>
              </div>
            </div>
          </div>

          {/* Compact Mini Leaderboard (Top 3 contributors only) */}
          <div className="bg-white rounded-xl border border-zinc-200/80 p-4 shadow-sm dark:bg-zinc-950 dark:border-zinc-850">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                Contributors
              </h4>
              <span className="text-[10px] font-bold text-zinc-400 font-mono">7 Days</span>
            </div>

            <div className="space-y-2.5">
              {leaderboardUsers.slice(0, 3).map((user, idx) => (
                <div 
                  key={user.id} 
                  onClick={() => onSelectUser && onSelectUser(user)}
                  className="flex items-center justify-between cursor-pointer p-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-zinc-400 w-3">#{idx + 1}</span>
                    <img src={user.avatar} alt={user.name} className="w-6.5 h-6.5 rounded-full object-cover group-hover:ring-1 group-hover:ring-indigo-500/50" />
                    <span className="text-xs font-bold text-zinc-700 truncate dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user.name}</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-500 font-mono">{user.points}p</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Threaded Discussion Drawer backdrop & sliding panel */}
      <AnimatePresence>
        {activePostForComments && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePostForComments(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-white z-50 shadow-2xl flex flex-col dark:bg-zinc-950"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-850 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Comments Thread</h4>
                  <p className="text-[10px] text-zinc-400">{activePostForComments.comments.length} replies</p>
                </div>
                <button 
                  onClick={() => setActivePostForComments(null)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  Close
                </button>
              </div>

              {/* Original Post Summary sticky */}
              <div className="p-4 bg-zinc-50/50 border-b border-zinc-100 dark:bg-zinc-900/10 dark:border-zinc-850">
                <span className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded dark:bg-zinc-800 dark:text-zinc-400">{activePostForComments.category}</span>
                <h4 className="text-xs font-bold text-zinc-900 mt-1 dark:text-zinc-100 line-clamp-1">{activePostForComments.title}</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed dark:text-zinc-400">{activePostForComments.content}</p>
              </div>

              {/* Comments Scroller */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {activePostForComments.comments.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 text-zinc-300" />
                    <p className="text-xs">No comments yet. Start the conversation!</p>
                  </div>
                ) : (
                  activePostForComments.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2.5">
                      <img 
                        src={comment.author.avatar} 
                        alt={comment.author.name} 
                        onClick={() => onSelectUser && onSelectUser(comment.author)}
                        className="w-7.5 h-7.5 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-500/40 transition-all"
                      />
                      <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span 
                            onClick={() => onSelectUser && onSelectUser(comment.author)}
                            className="text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            {comment.author.name}
                          </span>
                          <span className="text-[9px] text-zinc-400">{comment.timestamp}</span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Form Input footer */}
              <div className="p-4 border-t border-zinc-100 bg-white dark:bg-zinc-950 dark:border-zinc-850">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required
                    disabled={isSubmittingComment}
                    placeholder={isSubmittingComment ? "Submitting reply..." : "Write a supportive reply..."}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmitComment(activePostForComments.id);
                    }}
                    className="flex-1 text-xs px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-lg focus:outline-none dark:bg-zinc-900 dark:border-zinc-850 dark:text-zinc-200 disabled:opacity-60"
                  />
                  <button 
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    onClick={() => handleSubmitComment(activePostForComments.id)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-lg dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                  >
                    {isSubmittingComment ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-zinc-400 dark:text-zinc-600" />
                    ) : (
                      <Send className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
