"use client";

import * as React from "react";
import { Search, Shield, UserCheck, Sparkles, MoreVertical, Loader2 } from "lucide-react";
import { UserRole, UserRow } from "@/types/database";

interface MemberListProps {
  tenantId: string;
  currentUserRole: UserRole;
  currentUserId: string;
  onOpenInviteModal?: () => void;
}

const ROLE_FILTERS: { label: string; value: string }[] = [
  { label: "All Members", value: "all" },
  { label: "Employees", value: "employee" },
  { label: "Interns", value: "intern" },
  { label: "Admins", value: "admin" },
];

const ROLE_BADGE: Record<UserRole, { label: string; badge: string }> = {
  owner: { label: "Owner", badge: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300" },
  admin: { label: "Admin", badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" },
  moderator: { label: "Moderator", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
  employee: { label: "Employee", badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  intern: { label: "Intern", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
};

export function MemberList({ tenantId, currentUserRole, currentUserId }: MemberListProps) {
  const [members, setMembers] = React.useState<UserRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeMenuUserId, setActiveMenuUserId] = React.useState<string | null>(null);

  const fetchMembers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        limit: "50",
      });
      if (selectedRole !== "all") query.set("role", selectedRole);
      if (search.trim()) query.set("search", search.trim());

      const res = await fetch(`/api/tenant/members?${query.toString()}`, {
        headers: { "x-tenant-id": tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, selectedRole, search]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchMembers]);

  const handleChangeRole = async (targetUserId: string, newRole: UserRole) => {
    try {
      const res = await fetch(`/api/tenant/members/${targetUserId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": currentUserId,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setActiveMenuUserId(null);
        fetchMembers();
      }
    } catch {
      // Ignored
    }
  };

  const isAdminOrOwner = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div className="flex h-full flex-col">
      {/* Search and Role Filter Tabs */}
      <div className="space-y-3 border-b border-zinc-200 bg-white/80 p-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members by name or email..."
            className="flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-4 pl-9 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {ROLE_FILTERS.map((tab) => {
            const isActive = selectedRole === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedRole(tab.value)}
                className={`flex min-h-[36px] shrink-0 items-center rounded-full px-3.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Members List Stream */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-zinc-500">
            <UserCheck className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-2 font-medium">No members match your criteria</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => {
              const roleInfo = ROLE_BADGE[member.role] || ROLE_BADGE.employee;
              const initials = member.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={member.id}
                  className="relative flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {member.full_name}
                        </span>
                        {member.role === "intern" && (
                          <Sparkles className="h-3 w-3 text-amber-500" />
                        )}
                        {member.role === "owner" && (
                          <Shield className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      <p className="truncate text-xs text-zinc-400">{member.email}</p>
                      <div className="mt-1">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${roleInfo.badge}`}
                        >
                          {roleInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions Menu */}
                  {isAdminOrOwner && member.id !== currentUserId && member.role !== "owner" && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenuUserId(activeMenuUserId === member.id ? null : member.id)
                        }
                        aria-label="Member options"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {activeMenuUserId === member.id && (
                        <div className="absolute right-0 z-30 mt-1 w-36 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                          <button
                            onClick={() => handleChangeRole(member.id, "admin")}
                            className="flex min-h-[36px] w-full items-center px-3 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 rounded-lg"
                          >
                            Make Admin
                          </button>
                          <button
                            onClick={() => handleChangeRole(member.id, "employee")}
                            className="flex min-h-[36px] w-full items-center px-3 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 rounded-lg"
                          >
                            Set Employee
                          </button>
                          <button
                            onClick={() => handleChangeRole(member.id, "intern")}
                            className="flex min-h-[36px] w-full items-center px-3 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 rounded-lg"
                          >
                            Set Intern
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

