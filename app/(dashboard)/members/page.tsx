"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";
import { MemberList } from "@/components/community/MemberList";
import { InviteModal } from "@/components/community/InviteModal";
import { UserRole } from "@/types/database";

export default function MembersDirectoryPage() {
  const [inviteOpen, setInviteOpen] = React.useState(false);

  // In production, currentUser and tenantId are retrieved from session
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const currentUserId = "00000000-0000-0000-0000-000000000001";
  const currentUserRole: UserRole = "admin";

  return (
    <div className="flex h-full flex-col">
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Workspace Members
          </h1>
          <p className="text-xs text-zinc-500">Directory &amp; Role Management</p>
        </div>

        {(currentUserRole === "admin" || currentUserRole === "owner") && (
          <button
            onClick={() => setInviteOpen(true)}
            aria-label="Invite Member"
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        )}
      </header>

      {/* Directory Member List */}
      <div className="flex-1 overflow-hidden">
        <MemberList
          tenantId={tenantId}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          onOpenInviteModal={() => setInviteOpen(true)}
        />
      </div>

      {/* Invite Member Drawer / Modal */}
      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        tenantId={tenantId}
        currentUserId={currentUserId}
      />
    </div>
  );
}

