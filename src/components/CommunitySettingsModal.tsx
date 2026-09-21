import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Users, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Loader2, 
  User as UserIcon,
  Crown
} from 'lucide-react';
import { Community } from '../types';
import { supabase, isSupabaseConfigured, dbService, getLocalData, Profile } from '../lib/supabase';

interface MemberItem {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

interface CommunitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCommunity: Community;
  currentUserId?: string;
  onCommunityDeleted?: () => void;
  showToast?: (message: string) => void;
}

export const CommunitySettingsModal: React.FC<CommunitySettingsModalProps> = ({
  isOpen,
  onClose,
  activeCommunity,
  currentUserId,
  onCommunityDeleted,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'danger'>('members');
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Delete Community State
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Members when modal is open and on Members tab
  const fetchMembers = async () => {
    if (!activeCommunity?.id) return;
    setIsLoadingMembers(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('memberships')
          .select('user_id, role, profiles(id, full_name, avatar_url)')
          .eq('community_id', activeCommunity.id);

        if (error) {
          console.warn('Failed to fetch memberships via Supabase:', error);
          throw error;
        }

        if (data) {
          const mapped: MemberItem[] = data.map((item: any) => ({
            user_id: item.user_id,
            role: item.role,
            profile: {
              id: item.profiles?.id || item.user_id,
              full_name: item.profiles?.full_name || 'Community Member',
              avatar_url: item.profiles?.avatar_url || null,
            },
          }));
          setMembers(mapped);
          return;
        }
      }

      // Fallback for local storage / test environment
      const localMemberships = getLocalData<any[]>('memberships', []).filter(
        (m) => m.community_id === activeCommunity.id
      );
      const localProfiles = getLocalData<Profile[]>('profiles', []);
      const fallbackList: MemberItem[] = localMemberships.map((m) => {
        const prof = localProfiles.find((p) => p.id === m.user_id);
        return {
          user_id: m.user_id,
          role: m.role,
          profile: {
            id: m.user_id,
            full_name: prof?.full_name || 'Community Member',
            avatar_url: prof?.avatar_url || null,
          },
        };
      });
      setMembers(fallbackList);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      // Attempt local storage fallback
      const localMemberships = getLocalData<any[]>('memberships', []).filter(
        (m) => m.community_id === activeCommunity.id
      );
      const localProfiles = getLocalData<Profile[]>('profiles', []);
      const fallbackList: MemberItem[] = localMemberships.map((m) => {
        const prof = localProfiles.find((p) => p.id === m.user_id);
        return {
          user_id: m.user_id,
          role: m.role,
          profile: {
            id: m.user_id,
            full_name: prof?.full_name || 'Community Member',
            avatar_url: prof?.avatar_url || null,
          },
        };
      });
      setMembers(fallbackList);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setConfirmName('');
    }
  }, [isOpen, activeCommunity?.id]);

  // Handle role toggle
  const handleToggleRole = async (targetMember: MemberItem) => {
    const newRole: 'admin' | 'member' = targetMember.role === 'admin' ? 'member' : 'admin';
    setUpdatingUserId(targetMember.user_id);

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.rpc('update_member_role', {
          p_community_id: activeCommunity.id,
          p_target_user_id: targetMember.user_id,
          p_new_role: newRole,
        });

        if (error) throw error;
      } else {
        await dbService.updateMembershipRole(activeCommunity.id, targetMember.user_id, newRole);
      }

      // Update local state immediately
      setMembers((prev) =>
        prev.map((m) => (m.user_id === targetMember.user_id ? { ...m, role: newRole } : m))
      );

      const actionText = newRole === 'admin' ? 'promoted to Admin' : 'changed to Member';
      showToast?.(`${targetMember.profile.full_name} has been ${actionText}.`);
    } catch (err: any) {
      console.error('Failed to update member role:', err);
      showToast?.(err?.message || 'Failed to update member role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Handle Community Deletion
  const handleDeleteCommunity = async () => {
    if (confirmName.trim() !== activeCommunity.name.trim()) {
      showToast?.('Community name does not match.');
      return;
    }

    setIsDeleting(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.rpc('delete_community', {
          p_community_id: activeCommunity.id,
        });
        if (error) throw error;
      } else {
        await dbService.deleteCommunity(activeCommunity.id);
      }

      showToast?.('Community deleted successfully.');
      onClose();
      if (onCommunityDeleted) {
        onCommunityDeleted();
      }
    } catch (err: any) {
      console.error('Failed to delete community:', err);
      showToast?.(err?.message || 'Failed to delete community.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const communityCreatorId = activeCommunity.created_by || activeCommunity.createdBy;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-hub-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-[#141417] border border-white/[0.08] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-4px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-zinc-900/40">
          <div>
            <h3 id="manage-hub-title" className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              Manage Hub: <span className="text-indigo-400 font-bold">{activeCommunity.name}</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Configure member roles or manage community lifecycle.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/[0.06] px-6 bg-zinc-950/40">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Member Management</span>
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'danger'
                ? 'border-red-500 text-red-400 bg-red-500/5'
                : 'border-transparent text-zinc-400 hover:text-red-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Danger Zone</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'members' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Community Members ({members.length})
                </span>
                <button
                  onClick={fetchMembers}
                  disabled={isLoadingMembers}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer disabled:opacity-50"
                >
                  {isLoadingMembers ? 'Refreshing...' : 'Refresh List'}
                </button>
              </div>

              {isLoadingMembers ? (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs">Loading membership roster...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 border border-dashed border-white/[0.08] rounded-xl">
                  <UserIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2 opacity-50" />
                  <p className="text-xs">No members found in this community.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden bg-zinc-950/40">
                  {members.map((m) => {
                    const isOwner = m.role === 'owner' || m.user_id === communityCreatorId;
                    const isAdmin = m.role === 'admin';
                    const isCurrentUser = m.user_id === currentUserId;

                    return (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {m.profile.avatar_url ? (
                            <img
                              src={m.profile.avatar_url}
                              alt={m.profile.full_name}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold ring-1 ring-white/10">
                              {m.profile.full_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-zinc-200 truncate">
                                {m.profile.full_name}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[10px] text-zinc-500 font-normal">(You)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isOwner ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  <Crown className="w-2.5 h-2.5" />
                                  Owner
                                </span>
                              ) : isAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-white/[0.06]">
                                  Member
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div>
                          {isOwner ? (
                            <span className="text-[11px] text-zinc-500 italic pr-2">Hub Creator</span>
                          ) : (
                            <button
                              onClick={() => handleToggleRole(m)}
                              disabled={updatingUserId === m.user_id}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                isAdmin
                                  ? 'bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-300 border border-white/[0.08]'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                              } disabled:opacity-50`}
                            >
                              {updatingUserId === m.user_id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Updating...</span>
                                </>
                              ) : isAdmin ? (
                                <>
                                  <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Remove Admin</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Make Admin</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Danger Zone */
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-200 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Permanent Community Deletion</span>
                </div>
                <p>
                  Deleting this community permanently removes all its posts, comments, and member
                  associations. This action cannot be undone.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label htmlFor="confirm-comm-name" className="block text-xs font-medium text-zinc-300">
                  Please type <span className="font-bold text-white select-all">"{activeCommunity.name}"</span> to
                  confirm deletion:
                </label>
                <input
                  id="confirm-comm-name"
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={activeCommunity.name}
                  className="w-full text-xs px-3 py-2.5 bg-zinc-900 border border-white/[0.1] rounded-xl focus:outline-none text-zinc-100 placeholder:text-zinc-600 focus:border-red-500/50"
                />
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleDeleteCommunity}
                  disabled={isDeleting || confirmName.trim() !== activeCommunity.name.trim()}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm shadow-red-500/20"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting Community...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Community Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
