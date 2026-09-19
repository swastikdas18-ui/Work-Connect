import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  X, 
  Sparkles, 
  Globe, 
  Github, 
  Linkedin, 
  Plus, 
  Tag, 
  Image as ImageIcon,
  Check,
  Loader2,
  Upload,
  AlertCircle
} from 'lucide-react';
import { compressImage, fileToDataUrl, formatFileSize } from '../utils/imageCompressor';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  upName: string;
  setUpName: (name: string) => void;
  upHeadline: string;
  setUpHeadline: (headline: string) => void;
  upAvatar: string;
  setUpAvatar: (avatar: string) => void;
  upBio?: string;
  setUpBio?: (bio: string) => void;
  upSkills?: string[];
  setUpSkills?: (skills: string[]) => void;
  upGithub?: string;
  setUpGithub?: (github: string) => void;
  upLinkedin?: string;
  setUpLinkedin?: (linkedin: string) => void;
  upWebsite?: string;
  setUpWebsite?: (website: string) => void;
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
  upBio = '',
  setUpBio,
  upSkills = [],
  setUpSkills,
  upGithub = '',
  setUpGithub,
  upLinkedin = '',
  setUpLinkedin,
  upWebsite = '',
  setUpWebsite,
  prebuiltAvatars,
  onSubmit,
}) => {
  const [activeSection, setActiveSection] = useState<'info' | 'avatar' | 'skills' | 'social'>('info');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [avatarUploadStats, setAvatarUploadStats] = useState<{
    originalSize: number;
    compressedSize: number;
    reductionPercentage: number;
  } | null>(null);

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploadError(null);
    setIsCompressingAvatar(true);

    try {
      // Compress with 500px max dimension suitable for profile avatars, WebP 0.8 quality
      const result = await compressImage(file, { maxDimension: 500, quality: 0.8 });
      const dataUrl = await fileToDataUrl(result.blob);
      setUpAvatar(dataUrl);
      setAvatarUploadStats({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        reductionPercentage: result.reductionPercentage
      });
    } catch (err) {
      console.error('Failed to compress avatar:', err);
      setAvatarUploadError('Failed to process image. Please try another file.');
    } finally {
      setIsCompressingAvatar(false);
      e.target.value = '';
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (!trimmed || !setUpSkills) return;
    if (!upSkills.includes(trimmed)) {
      setUpSkills([...upSkills, trimmed]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!setUpSkills) return;
    setUpSkills(upSkills.filter(s => s !== skillToRemove));
  };

  const handleApplyCustomAvatar = () => {
    if (customAvatarUrl.trim()) {
      setUpAvatar(customAvatarUrl.trim());
      setCustomAvatarUrl('');
      setAvatarUploadStats(null);
    }
  };

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
            className="fixed top-1/2 left-1/2 w-[92%] max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center">
                  <UserIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                    Edit Profile Details
                  </h3>
                  <p className="text-[11px] text-zinc-400">Personalize how other cohort members see you</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Navigation Tabs */}
            <div className="flex px-6 pt-3 border-b border-zinc-100 dark:border-zinc-800 gap-1 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-x-auto">
              {[
                { id: 'info' as const, label: 'General Info' },
                { id: 'avatar' as const, label: 'Avatar & Image' },
                { id: 'skills' as const, label: 'Skills & Bio' },
                { id: 'social' as const, label: 'Social Handles' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                    activeSection === tab.id
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Live Mini Preview Bar */}
            <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-850/40 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center gap-3 shrink-0">
              <img 
                src={upAvatar} 
                alt="Avatar Preview" 
                className="h-10 w-10 rounded-xl object-cover ring-2 ring-indigo-500/20 shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block truncate">
                  {upName || 'Your Name'}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
                  {upHeadline || 'Your Cohort / Headline'}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 px-2 py-0.5 rounded-md font-bold">
                Live Preview
              </span>
            </div>

            {/* Form Content Body */}
            <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* SECTION 1: General Info */}
              {activeSection === 'info' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Full Display Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Alex Rivera"
                      value={upName}
                      onChange={(e) => setUpName(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Headline / Cohort Role
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Software Engineering Intern"
                      value={upHeadline}
                      onChange={(e) => setUpHeadline(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      About Me / Short Bio
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Share a few sentences about your background, what you are building, or what you want to learn..."
                      value={upBio}
                      onChange={(e) => setUpBio && setUpBio(e.target.value)}
                      className="w-full text-xs font-medium px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 resize-none leading-relaxed"
                    />
                  </div>
                </motion.div>
              )}

              {/* SECTION 2: Avatar & Image */}
              {activeSection === 'avatar' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Choose From Curated Avatars
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {prebuiltAvatars.map((av) => {
                        const isSelected = upAvatar === av;
                        return (
                          <button
                            key={av}
                            type="button"
                            onClick={() => setUpAvatar(av)}
                            className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group ${
                              isSelected 
                                ? 'border-indigo-600 scale-105 shadow-md' 
                                : 'border-zinc-200 dark:border-zinc-700 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={av} alt="avatar option" className="h-full w-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white drop-shadow" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct File Upload with Auto WebP Compression */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Upload Profile Photo (Auto-Compressed)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-750 transition-all">
                        {isCompressingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        ) : (
                          <Upload className="h-4 w-4 text-indigo-500" />
                        )}
                        <span>{isCompressingAvatar ? 'Optimizing Image...' : 'Choose Local Photo'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleAvatarFileUpload}
                          disabled={isCompressingAvatar}
                        />
                      </label>
                      <span className="text-[10px] text-zinc-400">
                        Processed on device • WebP • 500px • 0-cost
                      </span>
                    </div>

                    {isCompressingAvatar && (
                      <div className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 dark:bg-indigo-950/20 dark:border-indigo-900/40 flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs text-indigo-800 dark:text-indigo-300">
                          Resizing & converting image locally...
                        </span>
                      </div>
                    )}

                    {avatarUploadError && (
                      <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{avatarUploadError}</span>
                      </div>
                    )}

                    {avatarUploadStats && !isCompressingAvatar && (
                      <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/40 flex items-center justify-between text-xs">
                        <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                          Optimized: {formatFileSize(avatarUploadStats.originalSize)} → {formatFileSize(avatarUploadStats.compressedSize)}
                        </span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                          -{avatarUploadStats.reductionPercentage}% smaller
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Or Custom Image URL
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        placeholder="https://example.com/your-photo.jpg"
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                        className="flex-1 text-xs px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomAvatar}
                        disabled={!customAvatarUrl.trim()}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SECTION 3: Skills & Bio */}
              {activeSection === 'skills' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Add Technical Skills / Tags
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="e.g. Next.js, Python, PostgreSQL, System Design"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={handleAddSkill}
                        className="flex-1 text-xs px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        disabled={!newSkillInput.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-all flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Active Skills ({upSkills.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {upSkills.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">No skills added yet. Type a skill above and press Add.</p>
                      ) : (
                        upSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SECTION 4: Social Handles */}
              {activeSection === 'social' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Github className="h-3.5 w-3.5" />
                      <span>GitHub URL</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="https://github.com/username"
                      value={upGithub}
                      onChange={(e) => setUpGithub && setUpGithub(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Linkedin className="h-3.5 w-3.5 text-sky-600" />
                      <span>LinkedIn URL</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="https://linkedin.com/in/username"
                      value={upLinkedin}
                      onChange={(e) => setUpLinkedin && setUpLinkedin(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-teal-600" />
                      <span>Personal Portfolio / Website</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="https://yourportfolio.dev"
                      value={upWebsite}
                      onChange={(e) => setUpWebsite && setUpWebsite(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                    />
                  </div>
                </motion.div>
              )}

              {/* Bottom Submit Action Bar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                <button 
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold border border-zinc-200 text-zinc-600 px-4 py-2.5 rounded-xl hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-350"
                >
                  Cancel
                </button>

                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Save Profile</span>
                </button>
              </div>

            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
