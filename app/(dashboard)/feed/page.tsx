import { PostFeed } from "@/components/community/PostFeed";

export default function CommunityFeedPage() {
  // In production, currentUser and tenantId are resolved via server session
  const defaultTenantId = "00000000-0000-0000-0000-000000000001";
  const currentUser = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Alex Carter",
    role: "member",
  };

  return (
    <div className="flex h-full flex-col">
      <PostFeed tenantId={defaultTenantId} currentUser={currentUser} />
    </div>
  );
}

