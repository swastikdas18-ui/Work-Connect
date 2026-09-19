import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  CheckCircle, 
  Lock, 
  BookOpen, 
  Download, 
  MessageSquare, 
  Send, 
  ChevronRight, 
  Layers, 
  FileText,
  User,
  ExternalLink,
  Award,
  Plus,
  X,
  Video,
  AlertTriangle
} from 'lucide-react';
import { CourseTrack, Lesson, Comment, User as UserType } from '../types';
import { parseVideoEmbed, isDirectVideoFile } from '../utils/videoEmbed';

interface ClassroomTabProps {
  courses: CourseTrack[];
  currentUser: UserType;
  isAdminOrOwner: boolean;
  onToggleLessonCompleted: (trackId: string, lessonId: string) => void;
  onAddLessonDiscussion: (trackId: string, lessonId: string, commentText: string) => void;
  onAddCourse: (title: string, description: string, bannerColor: string) => void;
  onUpdateLessonVideo?: (trackId: string, lessonId: string, videoUrl: string) => Promise<void> | void;
}

export const ClassroomTab: React.FC<ClassroomTabProps> = ({
  courses,
  currentUser,
  isAdminOrOwner,
  onToggleLessonCompleted,
  onAddLessonDiscussion,
  onAddCourse,
  onUpdateLessonVideo
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(courses[0]?.id || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(courses[0]?.lessons[0]?.id || '');
  const [commentText, setCommentText] = useState('');
  
  // Create Track Modal
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseColor, setCourseColor] = useState('from-blue-500 to-indigo-600');

  // Video Embed Modal State
  const [showVideoEmbedModal, setShowVideoEmbedModal] = useState(false);
  const [videoInputUrl, setVideoInputUrl] = useState('');
  const [videoInputError, setVideoInputError] = useState<string | null>(null);
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  // Sync state when community is switched and courses change
  React.useEffect(() => {
    if (courses.length > 0) {
      setSelectedTrackId(courses[0].id);
      setSelectedLessonId(courses[0].lessons[0]?.id || '');
    } else {
      setSelectedTrackId('');
      setSelectedLessonId('');
    }
  }, [courses]);

  const activeTrack = courses.find(c => c.id === selectedTrackId) || courses[0];
  const activeLesson = activeTrack?.lessons.find(l => l.id === selectedLessonId) || activeTrack?.lessons[0];

  const handleToggleCompleted = () => {
    if (!activeTrack || !activeLesson) return;
    onToggleLessonCompleted(activeTrack.id, activeLesson.id);
  };

  const handlePostDiscussion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeTrack || !activeLesson) return;

    onAddLessonDiscussion(activeTrack.id, activeLesson.id, commentText);
    setCommentText('');
  };

  const handleCreateCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim() || !courseDesc.trim()) return;

    onAddCourse(courseTitle, courseDesc, courseColor);
    setCourseTitle('');
    setCourseDesc('');
    setCourseColor('from-blue-500 to-indigo-600');
    setShowAddCourseModal(false);
  };

  const handleSaveVideoEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrack || !activeLesson) return;

    const trimmedUrl = videoInputUrl.trim();
    if (!trimmedUrl) {
      setVideoInputError('Please enter a video URL.');
      return;
    }

    // DISALLOW DIRECT VIDEO UPLOADS / RAW VIDEO FILES (.mp4, .mov, etc.) to maintain zero hosting cost
    if (isDirectVideoFile(trimmedUrl)) {
      setVideoInputError(
        'Direct raw video files (.mp4, .mov, .webm) are not permitted to ensure zero storage and bandwidth costs. Please host your video on YouTube, Loom, or Vimeo and paste the URL here.'
      );
      return;
    }

    // Parse and validate YouTube, Loom, Vimeo
    const parsed = parseVideoEmbed(trimmedUrl);
    if (!parsed.isValid) {
      setVideoInputError(
        'Invalid video URL. Please provide a valid YouTube, Loom, or Vimeo URL.'
      );
      return;
    }

    setIsSavingVideo(true);
    setVideoInputError(null);
    try {
      if (onUpdateLessonVideo) {
        await onUpdateLessonVideo(activeTrack.id, activeLesson.id, parsed.embedUrl);
      } else {
        // Optimistic in-memory update
        activeLesson.videoUrl = parsed.embedUrl;
      }
      setShowVideoEmbedModal(false);
      setVideoInputUrl('');
    } catch (err) {
      console.error('Failed to update lesson video:', err);
      setVideoInputError('Failed to save video embed. Please try again.');
    } finally {
      setIsSavingVideo(false);
    }
  };

  const getCompletedCount = (track: CourseTrack) => {
    return track.lessons.filter(l => l.isCompleted).length;
  };

  const colorsList = [
    { class: 'from-blue-500 to-indigo-600', name: 'Indigo Dream' },
    { class: 'from-emerald-500 to-teal-600', name: 'Emerald Forest' },
    { class: 'from-pink-500 to-rose-600', name: 'Sunset Spark' },
    { class: 'from-amber-500 to-orange-600', name: 'Amber Glow' },
    { class: 'from-slate-700 to-slate-900', name: 'Midnight Charcoal' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6" id="classroom-view">
      
      {/* Classroom Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-black text-zinc-900 dark:text-zinc-50">Classroom Hub</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Explore our structured curricula, video resources, and task checklists.</p>
        </div>

        {/* Gated Action for Admin or Owner */}
        {isAdminOrOwner && (
          <button
            onClick={() => setShowAddCourseModal(true)}
            className="bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all dark:bg-zinc-50 dark:hover:bg-zinc-250 dark:text-zinc-900 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Course</span>
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="w-full py-16 text-center" id="classroom-empty">
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 shadow-sm dark:bg-zinc-950 dark:border-zinc-850 max-w-xl mx-auto">
            <BookOpen className="h-10 w-10 text-zinc-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">No curriculum tracks available.</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-2 dark:text-zinc-400 leading-relaxed">
              Course tracks, video tutorials, and downloadable assets will appear here.
            </p>

            {/* Gated Empty State Action */}
            {isAdminOrOwner ? (
              <button
                onClick={() => setShowAddCourseModal(true)}
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Course</span>
              </button>
            ) : (
              <div className="mt-4 text-[10px] text-zinc-400">
                Ask the community owner or admin to schedule a course track!
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Track Selector Horizontal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {courses.map((track) => {
              const completedCount = getCompletedCount(track);
              const totalCount = track.lessons?.length || 0;
              const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
              const isActive = track.id === selectedTrackId;

              return (
                <div 
                  key={track.id}
                  onClick={() => {
                    setSelectedTrackId(track.id);
                    setSelectedLessonId(track.lessons?.[0]?.id || '');
                  }}
                  className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all ${
                    isActive 
                      ? 'border-zinc-900 bg-white dark:border-zinc-50 dark:bg-zinc-950' 
                      : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${track.bannerColor} text-white`}>
                      <BookOpen className="h-5 w-5" />
                    </div>
                    {completedCount === totalCount && totalCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/50 dark:text-emerald-400">
                        <Award className="h-3 w-3" />
                        Complete
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 mt-4 line-clamp-1 dark:text-zinc-50">{track.title}</h3>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed dark:text-zinc-400">{track.description}</p>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                      <span>Track Progress</span>
                      <span>{completedCount} / {totalCount} completed</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full dark:bg-zinc-900">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300 dark:bg-indigo-400" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Study Workspace Area: 2-column Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Side: Lessons List */}
            <div className="col-span-1 lg:col-span-4 bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-850">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lessons Index ({activeTrack?.lessons?.length || 0})</h4>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {(!activeTrack?.lessons || activeTrack.lessons.length === 0) ? (
                  <div className="p-6 text-center text-zinc-400 text-xs">
                    No lessons published in this course track yet.
                  </div>
                ) : (
                  activeTrack.lessons.map((lesson, idx) => {
                    const isSelected = lesson.id === selectedLessonId;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`w-full text-left p-4 transition-all flex items-start gap-3 ${
                          isSelected 
                            ? 'bg-zinc-50 dark:bg-zinc-900' 
                            : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40'
                        }`}
                      >
                        <span className="text-xs font-mono font-semibold text-zinc-400 mt-0.5">{(idx + 1).toString().padStart(2, '0')}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-300'}`}>
                            {lesson.title}
                          </p>
                          <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">{lesson.duration}</span>
                        </div>

                        <div className="mt-0.5">
                          {lesson.isCompleted ? (
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/20" />
                          ) : (
                            <div className="h-4.5 w-4.5 rounded-full border border-zinc-300 dark:border-zinc-700" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Side: Primary Content Space (Video, Description, Download, Comments) */}
            <div className="col-span-1 lg:col-span-8 space-y-6">
              {activeLesson ? (
                <>
                  {/* Active Lesson Display Card */}
                  <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
                    {/* Video Player: YouTube / Loom / Vimeo Embed or Interactive Embed Box */}
                    {(() => {
                      const videoEmbed = activeLesson.videoUrl ? parseVideoEmbed(activeLesson.videoUrl) : null;
                      if (videoEmbed && videoEmbed.isValid) {
                        return (
                          <div className="aspect-video bg-black relative overflow-hidden border-b border-zinc-800">
                            <iframe 
                              src={videoEmbed.embedUrl}
                              title={videoEmbed.title || activeLesson.title}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-semibold text-zinc-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="capitalize">{videoEmbed.provider} Embed</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="aspect-video bg-zinc-950 relative flex flex-col items-center justify-center p-6 text-center border-b border-zinc-800">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] pointer-events-none" />
                          
                          <div className="z-10 max-w-md space-y-3">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mx-auto flex items-center justify-center shadow-lg">
                              <Video className="h-7 w-7 text-indigo-400" />
                            </div>
                            <h5 className="text-sm font-bold text-white">{activeLesson.title}</h5>
                            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                              Zero-cost video hosting: Attach a YouTube, Loom, or Vimeo recording to stream directly in the workspace.
                            </p>
                            {isAdminOrOwner && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowVideoEmbedModal(true);
                                  setVideoInputUrl(activeLesson.videoUrl || '');
                                  setVideoInputError(null);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>{activeLesson.videoUrl ? 'Update Video Embed' : 'Attach Video Embed'}</span>
                              </button>
                            )}
                          </div>

                          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] font-semibold text-zinc-500 font-mono">
                            <span>EXTERNAL_STREAM_HOST</span>
                            <span>YOUTUBE • LOOM • VIMEO</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Lesson Info Header */}
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full dark:bg-zinc-900 dark:text-indigo-400">
                              Lesson {activeTrack.lessons.indexOf(activeLesson) + 1}
                            </span>
                            {isAdminOrOwner && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowVideoEmbedModal(true);
                                  setVideoInputUrl(activeLesson.videoUrl || '');
                                  setVideoInputError(null);
                                }}
                                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                              >
                                <Video className="h-3 w-3" />
                                <span>{activeLesson.videoUrl ? 'Edit Embed' : 'Add Video URL'}</span>
                              </button>
                            )}
                          </div>
                          <h2 className="text-lg font-bold text-zinc-900 mt-2 dark:text-zinc-50">{activeLesson.title}</h2>
                        </div>

                        <button
                          onClick={handleToggleCompleted}
                          className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            activeLesson.isCompleted
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400'
                              : 'bg-zinc-900 border-transparent text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>{activeLesson.isCompleted ? 'Completed ✓' : 'Mark Lesson Complete'}</span>
                        </button>
                      </div>

                      <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-4 leading-relaxed">{activeLesson.description}</p>

                      {/* Downloadable Assets */}
                      <div className="mt-6 border border-zinc-100 rounded-xl p-4 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:bg-zinc-900/30 dark:border-zinc-850">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 dark:bg-zinc-900 dark:text-indigo-400">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Classroom Asset & Checklist Pack</p>
                            <p className="text-[10px] text-zinc-400">Includes markdown summary, cheat-sheets and sandbox repos.</p>
                          </div>
                        </div>
                        <a 
                          href={activeLesson.downloadUrl || '#'}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-white border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm dark:bg-zinc-950 dark:border-zinc-880 dark:text-indigo-400 hover:scale-105 transition-transform"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download Pack</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Lesson Specific Discussion Section */}
                  <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-4">Lesson Q&A & Notes</h3>

                    <form onSubmit={handlePostDiscussion} className="flex gap-2 mb-6">
                      <input 
                        type="text"
                        required
                        placeholder="Type an observation or question about this lesson..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-lg focus:outline-none dark:bg-zinc-900 dark:border-zinc-850 dark:text-zinc-200"
                      />
                      <button 
                        type="submit"
                        className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Post Note</span>
                      </button>
                    </form>

                    <div className="space-y-4">
                      {(!activeLesson.discussion || activeLesson.discussion.length === 0) ? (
                        <div className="text-center py-6 text-zinc-400">
                          <MessageSquare className="h-6 w-6 mx-auto text-zinc-300 mb-2" />
                          <p className="text-xs">No discussion yet on this lesson. Start the chat!</p>
                        </div>
                      ) : (
                        activeLesson.discussion.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <img 
                              src={comment.author.avatar} 
                              alt={comment.author.name} 
                              className="w-7 h-7 rounded-full object-cover mt-0.5"
                            />
                            <div className="flex-1 bg-zinc-50 rounded-xl p-3 dark:bg-zinc-900">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{comment.author.name}</span>
                                <span className="text-[9px] text-zinc-400">{comment.timestamp}</span>
                              </div>
                              <p className="text-xs text-zinc-600 mt-1 leading-relaxed dark:text-zinc-300">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 dark:bg-zinc-950 dark:border-zinc-800">
                  <BookOpen className="h-10 w-10 mx-auto text-zinc-300 mb-2" />
                  <p className="text-sm">Please select a lesson to begin learning.</p>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* CREATE COURSE MODAL */}
      <AnimatePresence>
        {showAddCourseModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCourseModal(false)}
              className="fixed inset-0 bg-black z-50"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50"
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <BookOpen className="h-4.5 w-4.5 text-indigo-500" />
                  Publish Course Track
                </h3>
                <button 
                  onClick={() => setShowAddCourseModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateCourseSubmit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Course Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Intern Onboarding 101, Systems Engineering Standard"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Course Description</label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Describe the topics, resources, and expectations for this learning module..."
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Banner Theme Gradient</label>
                  <div className="grid grid-cols-1 gap-2">
                    {colorsList.map((c) => (
                      <button
                        key={c.class}
                        type="button"
                        onClick={() => setCourseColor(c.class)}
                        className={`p-3 rounded-xl border text-xs font-bold text-white bg-gradient-to-br ${c.class} text-left flex justify-between items-center transition-all ${
                          courseColor === c.class ? 'ring-2 ring-indigo-500 ring-offset-2' : 'opacity-80'
                        }`}
                      >
                        <span>{c.name}</span>
                        {courseColor === c.class && <span>Active ✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button 
                    type="button"
                    onClick={() => setShowAddCourseModal(false)}
                    className="text-xs font-bold border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:border-zinc-750 dark:text-zinc-350"
                  >
                    Cancel
                  </button>

                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all"
                  >
                    Publish Track
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* VIDEO EMBED CONFIGURATION MODAL */}
      <AnimatePresence>
        {showVideoEmbedModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVideoEmbedModal(false)}
              className="fixed inset-0 bg-black z-50"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50"
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <Video className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                      Configure Lesson Video Embed
                    </h3>
                    <p className="text-[11px] text-zinc-400">Zero-cost stream hosting via external providers</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowVideoEmbedModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Zero-Cost Hosting Notice & Restriction Warning */}
              <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <span className="font-bold block text-amber-950 dark:text-amber-100">Direct raw video files (.mp4 / .mov) disallowed</span>
                  <span>To ensure zero storage and bandwidth expenses, upload your recording to YouTube, Loom, or Vimeo and paste the link below.</span>
                </div>
              </div>

              <form onSubmit={handleSaveVideoEmbed} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Video Share URL (YouTube, Loom, Vimeo)
                  </label>
                  <input 
                    type="url" 
                    required
                    placeholder="e.g. https://youtu.be/... or https://www.loom.com/share/..."
                    value={videoInputUrl}
                    onChange={(e) => {
                      setVideoInputUrl(e.target.value);
                      if (videoInputError) setVideoInputError(null);
                    }}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  />
                  <span className="text-[10px] text-zinc-400 block">
                    Supports: YouTube (normal, Shorts), Loom recordings, and Vimeo videos.
                  </span>
                </div>

                {videoInputError && (
                  <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{videoInputError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button 
                    type="button"
                    onClick={() => setShowVideoEmbedModal(false)}
                    className="text-xs font-bold border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Cancel
                  </button>

                  <button 
                    type="submit"
                    disabled={isSavingVideo || !videoInputUrl.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {isSavingVideo ? 'Saving Embed...' : 'Save Video Embed'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
