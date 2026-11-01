import { Suspense } from "react";
import { PostFeed } from "@/components/community/PostFeed";

export const metadata = {
  title: "Community Feed | Work-Connect",
  description: "Connect, share, and collaborate across your company workspace",
};

export default function RootPage() {
  const defaultTenantId = "00000000-0000-0000-0000-000000000001";
  const currentUser = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Alex Carter",
    role: "member",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Suspense
        fallback={
          <div className="h-64 rounded-xl border border-zinc-200 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-900/30 animate-pulse" />
        }
      >
        <PostFeed tenantId={defaultTenantId} currentUser={currentUser} />
      </Suspense>
    </div>
  );
}
