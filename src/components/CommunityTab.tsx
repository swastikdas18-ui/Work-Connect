import React, { useState, useRef, useMemo } from 'react';
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
  AlertCircle,
  Lightbulb,
  Award
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
  isLoadingPosts?: boolean;
  isAdminOrOwner?: boolean;
  isAdminOrCreator?: boolean;
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
  showToast,
  isLoadingPosts = false,
  isAdminOrOwner = false,
  isAdminOrCreator = false
}) => {
  const isUserAdminOrCreator = Boolean(
    isAdminOrCreator ||
    isAdminOrOwner ||
    (activeCommunity && currentUser && (
      activeCommunity.created_by === currentUser.id ||
      activeCommunity.createdBy === currentUser.id
    ))
  );

  const [sortBy, setSortBy] = useState<'activity' | 'newest' | 'top'>('activity');
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [category, setCategory] = useState('All');
  const [sendAsNewsletter, setSendAsNewsletter] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreateBox = (preferredCategory?: string) => {
    let initialCat = preferredCategory || (category !== 'All' ? category : selectedCategory);
    if (!initialCat || initialCat === 'All') {
      initialCat = isUserAdminOrCreator ? 'Announcements' : 'Help Wanted';
    } else if (initialCat.toLowerCase() === 'announcements' && !isUserAdminOrCreator) {
      initialCat = 'Help Wanted';
    }
    setCategory(initialCat);
    setShowCreateBox(true);
    setTimeout(() => {
      const el = document.getElementById('post-composer-form');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      titleInputRef.current?.focus();
    }, 60);
  };

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

  // Synchronous Mutex Ref to prevent race conditions during rapid double-clicks
  const isSubmittingRef = useRef<boolean>(false);
  // Client-side cooldown ref to track last post timestamp
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

  const CATEGORIES = categories && categories.length > 0
    ? categories
    : ['All', 'Announcements', 'Discussions', 'Wins & Demos', 'Help Wanted'];

  // Posts belonging to this community
  const communityPosts = useMemo(() => {
    return posts.filter((p) => p.communityId === activeCommunity.id);
  }, [posts, activeCommunity.id]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: communityPosts.length };
    CATEGORIES.slice(1).forEach((cat) => {
      counts[cat] = communityPosts.filter(
        (p) => p.category?.toLowerCase() === cat.toLowerCase()
      ).length;
    });
    return counts;
  }, [communityPosts, CATEGORIES]);

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

  const handleSubmitPost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !content.trim() || isCompressingImage) return;

    const now = Date.now();
    // Synchronous check: blocks immediately on subsequent clicks within the same or rapid ticks
    if (isSubmittingRef.current || (now - lastPostTimestampRef.current) < 2000) {
      showToast?.('You are doing that a bit too fast. Please wait a few seconds.');
      return;
    }

    // Lock immediately before any async task or state scheduling
    isSubmittingRef.current = true;
    lastPostTimestampRef.current = now;
    setIsSubmitting(true);

    try {
      let targetCategory = category && category !== 'All' ? category : (isUserAdminOrCreator ? 'Announcements' : 'Help Wanted');
      if (targetCategory.toLowerCase() === 'announcements' && !isUserAdminOrCreator) {
        showToast?.('Only community leaders and admins can publish announcements.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      await onAddPost({
        title: title.trim(),
        content: content.trim(),
        codeSnippet: codeSnippet.trim() ? codeSnippet : undefined,
        mediaUrl: selectedImage?.dataUrl || selectedImage?.previewUrl || undefined,
        mediaFile: selectedImage?.file || undefined,
        category: targetCategory
      }, sendAsNewsletter);

      // Reset Form State & close composer on success
      setTitle('');
      setContent('');
      setCodeSnippet('');
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
      setSelectedImage(null);
      setCategory('All');
      setSendAsNewsletter(false);
      setShowCreateBox(false);

      // Auto-switch to the category of the new post or "All" so it's visible immediately
      if (selectedCategory !== 'All' && selectedCategory.toLowerCase() !== targetCategory.toLowerCase()) {
        onSelectCategory('All');
      }
    } catch (err: any) {
      console.error(err);
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('rate_limit') || msg.includes('too fast')) {
        showToast?.('You are doing that a bit too fast. Please wait a few seconds.');
      } else {
        showToast?.(err?.message || 'Failed to publish post');
      }
    } finally {
      isSubmittingRef.current = false;
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
          <div className="relative overflow-hidden border-b border-white/[0.08] pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pr-14 scrollbar-hide select-none">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold shadow-xs shadow-indigo-500/10'
                        : 'bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-indigo-400/20 text-indigo-200 font-bold'
                        : 'bg-zinc-800/90 text-zinc-400'
                    }`}>
                      {categoryCounts[cat] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Subtle Right Edge Fade for Horizontal Scroll Discovery (Prominent on Mobile) */}
            <div 
              aria-hidden="true" 
              className="absolute right-0 top-0 bottom-2 w-14 pointer-events-none bg-gradient-to-l from-[#09090B] via-[#09090B]/80 to-transparent" 
            />
          </div>

          {/* Clean Executive Studio Composer Trigger Card */}
          {!showCreateBox ? (
            <div 
              id="post-composer-trigger"
              data-testid="post-composer-trigger"
              onClick={() => handleOpenCreateBox()}
              className="bg-[#141417] border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-4 transition-all duration-200 shadow-sm cursor-pointer group"
            >
              {/* Top row: Avatar + sleek input placeholder */}
              <div className="flex items-center gap-3">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-white/20 transition-all"
                />
                <div className="flex-1 text-zinc-400 text-sm font-normal bg-zinc-900/60 rounded-xl px-4 py-2.5 border border-white/[0.06] group-hover:border-white/[0.10] transition-colors">
                  Write a thought, share a win, or ask a question...
                </div>
              </div>

              {/* Bottom row divider with utility badges & primary create post action */}
              <div className="border-t border-white/[0.06] pt-3 mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateBox(selectedCategory !== 'All' ? selectedCategory : 'Discussions');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateBox('Help Wanted');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Question</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateBox('Wins & Demos');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Win</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCreateBox();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 active:bg-indigo-700 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Post</span>
                </button>
              </div>
            </div>
          ) : (
            <motion.form 
              id="post-composer-form"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmitPost}
              className="bg-[#141417] rounded-2xl border border-white/[0.08] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-4px_rgba(0,0,0,0.5)] space-y-4 scroll-mt-24"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">New Publication</span>
                <button 
                  type="button" 
                  onClick={() => setShowCreateBox(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3">
                <input 
                  ref={titleInputRef}
                  type="text" 
                  required
                  placeholder="Post title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-base font-semibold bg-transparent focus:outline-none text-zinc-100 placeholder:text-zinc-500"
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
                    {categories.filter(c => c !== 'All').map(c => {
                      const isAnnouncements = c.toLowerCase() === 'announcements';
                      const isDisabled = isAnnouncements && !isUserAdminOrCreator;
                      return (
                        <option 
                          key={c} 
                          value={c} 
                          disabled={isDisabled}
                        >
                          {c}{isDisabled ? ' (Admins Only)' : ''}
                        </option>
                      );
                    })}
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
                  onClick={handleSubmitPost}
                  aria-busy={isSubmitting}
                  className={`bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-1.5 ${
                    isSubmitting ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                  }`}
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Post'}</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* Search bar & Sorting bar */}
          <div className="flex items-center justify-between gap-3 bg-[#141417] p-3 rounded-2xl border border-white/[0.08] shadow-sm">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-zinc-900/70 border border-white/[0.06] rounded-xl focus:outline-none text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-900/60 p-0.5 rounded-xl border border-white/[0.06]">
                <button
                  onClick={() => setSortBy('activity')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sortBy === 'activity' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  Trending
                </button>
                <button
                  onClick={() => setSortBy('newest')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sortBy === 'newest' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  New
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCreateBox()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 transition cursor-pointer shrink-0"
                aria-label="Create a new post"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Post</span>
              </button>
            </div>
          </div>

          {/* Chronological Post Cards */}
          <div className="space-y-4">
            {isLoadingPosts ? (
              <div className="space-y-4 my-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-[#151518] border border-white/[0.06] rounded-2xl p-5 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800/80" />
                      <div className="space-y-2 flex-1">
                        <div className="w-32 h-3.5 bg-zinc-800/80 rounded-md" />
                        <div className="w-48 h-2.5 bg-zinc-800/80 rounded-md" />
                      </div>
                    </div>
                    <div className="w-3/4 h-4 bg-zinc-800/80 rounded-md mb-2.5" />
                    <div className="w-full h-3 bg-zinc-800/80 rounded-md mb-2" />
                    <div className="w-2/3 h-3 bg-zinc-800/80 rounded-md" />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-[#131316] border border-dashed border-white/[0.1] rounded-2xl p-10 text-center my-6" id="feed-empty">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-white/[0.08] flex items-center justify-center mx-auto text-indigo-400 mb-3.5">
                  <MessageSquare className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100">
                  {selectedCategory === 'All'
                    ? 'This feed is silent'
                    : `No ${selectedCategory.toLowerCase()} yet`}
                </h3>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto mt-1 mb-4 font-normal">
                  {selectedCategory === 'All'
                    ? 'Be the first to share an announcement, ask a question, or post a win!'
                    : `There are no posts under "${selectedCategory}" in this community yet.`}
                </p>
                {selectedCategory !== 'All' ? (
                  <div className="flex justify-center gap-2.5 mt-4">
                    <button
                      onClick={() => onSelectCategory('All')}
                      className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800/90 hover:bg-zinc-700/90 border border-white/[0.08] rounded-xl transition cursor-pointer"
                    >
                      Clear filter
                    </button>
                    <button
                      onClick={() => handleOpenCreateBox(selectedCategory)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 transition cursor-pointer"
                    >
                      + Post in {selectedCategory}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenCreateBox()}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 transition cursor-pointer"
                  >
                    + Publish First Post
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredPosts.map((post) => (
                  <motion.article
                    key={post.id}
                    layoutId={`post-${post.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="group relative bg-[#151518] hover:bg-[#18181C] border border-white/[0.08] hover:border-white/[0.14] rounded-2xl rounded-xl p-5 transition-all duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_8px_20px_-6px_rgba(0,0,0,0.4)]"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div 
                        onClick={() => onSelectUser && onSelectUser(post.author)}
                        className="flex items-center gap-3 cursor-pointer group/author"
                      >
                        <img 
                          src={post.author.avatar} 
                          alt={post.author.name} 
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 group-hover/author:ring-indigo-500/50 transition-all"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-zinc-100 text-sm hover:underline cursor-pointer transition-colors">{post.author.name}</span>
                            {post.author.cohort && (
                              <span className="text-[10px] font-medium bg-zinc-800/80 text-zinc-400 px-1.5 py-0.5 rounded border border-white/[0.04]">{post.author.cohort}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                            <span>{post.timestamp}</span>
                            <span className="text-zinc-600">·</span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-white/[0.06]">{post.category}</span>
                            {post.isNewsletter && (
                              <>
                                <span className="text-zinc-600">·</span>
                                <span className="text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 rounded text-[10px]">Broadcast</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => onToggleBookmark(post.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          post.isBookmarked ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${post.isBookmarked ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="mt-2.5">
                      <h3 className="text-base font-semibold text-zinc-100 tracking-tight mt-2.5 mb-1.5 leading-snug">{post.title}</h3>
                      <p className="text-sm text-zinc-300/90 leading-relaxed break-words whitespace-pre-wrap">{post.content}</p>

                      {post.mediaUrl && (
                        <div className="overflow-hidden rounded-xl border border-white/[0.08] mt-3.5 bg-black/40 max-h-[480px] flex items-center justify-center">
                          <img 
                            src={post.mediaUrl} 
                            alt={post.title} 
                            loading="lazy"
                            className="w-full max-h-[480px] object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                            onError={(e) => {
                              // Hide broken image icons silently (e.g. expired base64 or 400 storage URLs)
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {post.codeSnippet && (
                        <div className="mt-3.5 rounded-xl overflow-hidden border border-white/[0.08] bg-[#0C0C0E] p-3.5">
                          <pre className="font-mono text-[11px] text-emerald-400 overflow-x-auto">
                            <code>{post.codeSnippet}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Action Panel / Engagement Bar */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onUpvotePost(post.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            post.hasUpvoted
                              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 border border-transparent hover:border-white/[0.06]'
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          <span>{post.upvotes}</span>
                        </button>

                        <button 
                          onClick={() => setActivePostForComments(post)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 border border-transparent hover:border-white/[0.06] transition-all cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{post.comments.length}</span>
                        </button>
                      </div>

                      {onOpenNewsletterComposeWithContent && (
                        <button 
                          onClick={() => onOpenNewsletterComposeWithContent(post.title, post.content)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/20 border border-transparent transition-all cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Curate</span>
                        </button>
                      )}
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            )}
          </div>

        </div>

        {/* Compact Right Sidebar - About Community, Member info & Mini Leaderboard */}
        {/* Compact Right Sidebar - About Community, Member info & Mini Leaderboard */}
        <div className="hidden lg:block lg:col-span-4 space-y-4 sticky top-24">
          
          {/* About Hub Card */}
          <div className="bg-[#141417] rounded-2xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-indigo-400" />
              About Hub
            </h4>
            <p className="text-xs text-zinc-400 font-normal leading-relaxed">
              {activeCommunity.description}
            </p>
            
            <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Privacy</span>
                <span className="font-medium text-zinc-300 capitalize flex items-center gap-1">
                  {activeCommunity.privacy === 'public' ? <Globe className="h-3.5 w-3.5 text-zinc-400" /> : <Lock className="h-3.5 w-3.5 text-zinc-400" />}
                  {activeCommunity.privacy}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Members</span>
                <span className="font-medium text-zinc-300">{activeCommunity.memberCount} active</span>
              </div>
            </div>
          </div>

          {/* Compact Mini Leaderboard (Top 3 contributors only) */}
          <div className="bg-[#141417] rounded-2xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-400" />
                Contributors
              </h4>
              <span className="text-[10px] font-semibold text-zinc-500 font-mono">7 Days</span>
            </div>

            <div className="space-y-2.5">
              {leaderboardUsers.slice(0, 3).map((user, idx) => (
                <div 
                  key={user.id} 
                  onClick={() => onSelectUser && onSelectUser(user)}
                  className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-zinc-500 w-3">#{idx + 1}</span>
                    <img src={user.avatar} alt={user.name} className="w-6.5 h-6.5 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-indigo-500/50" />
                    <span className="text-xs font-medium text-zinc-300 truncate group-hover:text-indigo-400 transition-colors">{user.name}</span>
                  </div>
                  <span className="text-xs font-medium text-zinc-400 font-mono">{user.points}p</span>
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
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePostForComments(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-[#121215] border-l border-white/[0.08] z-50 shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#121215]">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Comments Thread</h4>
                  <p className="text-[10px] text-zinc-500">{activePostForComments.comments.length} replies</p>
                </div>
                <button 
                  onClick={() => setActivePostForComments(null)}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Original Post Summary sticky */}
              <div className="p-4 bg-zinc-900/40 border-b border-white/[0.06]">
                <span className="text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">{activePostForComments.category}</span>
                <h4 className="text-xs font-semibold text-zinc-100 mt-2 line-clamp-1">{activePostForComments.title}</h4>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed font-normal">{activePostForComments.content}</p>
              </div>

              {/* Comments Scroller */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {activePostForComments.comments.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 text-zinc-600" />
                    <p className="text-xs font-normal">No comments yet. Start the conversation!</p>
                  </div>
                ) : (
                  activePostForComments.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2.5">
                      <img 
                        src={comment.author.avatar} 
                        alt={comment.author.name} 
                        onClick={() => onSelectUser && onSelectUser(comment.author)}
                        className="w-7.5 h-7.5 rounded-full object-cover ring-1 ring-white/10 cursor-pointer hover:ring-2 hover:ring-indigo-500/40 transition-all"
                      />
                      <div className="flex-1 bg-[#151518] border border-white/[0.06] rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span 
                            onClick={() => onSelectUser && onSelectUser(comment.author)}
                            className="text-xs font-medium text-zinc-200 cursor-pointer hover:text-indigo-400 transition-colors"
                          >
                            {comment.author.name}
                          </span>
                          <span className="text-[9px] text-zinc-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-xs text-zinc-400 font-normal mt-1.5 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Form Input footer */}
              <div className="p-4 border-t border-white/[0.08] bg-[#121215]">
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
                    className="flex-1 text-xs px-3 py-2 bg-zinc-900/80 border border-white/[0.08] rounded-xl focus:outline-none text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/40 disabled:opacity-60"
                  />
                  <button 
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    onClick={() => handleSubmitComment(activePostForComments.id)}
                    className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-sm shadow-indigo-500/20"
                  >
                    {isSubmittingComment ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
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

      {/* Mobile Floating Action Button (FAB) for Post Creation */}
      <button
        type="button"
        onClick={() => handleOpenCreateBox()}
        className="sm:hidden fixed bottom-20 right-4 z-40 p-3.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        aria-label="Create a new post"
      >
        <Plus className="w-5 h-5" />
      </button>

    </div>
  );
};
