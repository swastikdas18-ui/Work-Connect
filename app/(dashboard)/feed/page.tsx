import { PostFeed } from "@/components/community/PostFeed";

export default function CommunityFeedPage() {
  // In production, currentUser and tenantId are resolved via server session
  const defaultTenantId = "tenant-default";
  const currentUser = {
    id: "user-1",
    name: "Alex Carter",
    role: "member",
  };

  return (
    <div className="flex h-full flex-col">
      <PostFeed tenantId={defaultTenantId} currentUser={currentUser} />
    </div>
  );
}

