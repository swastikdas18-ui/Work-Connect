import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/community/AnalyticsDashboard";

export default function AdminAnalyticsPage() {
  // In production, tenantId and currentUserId are derived from verified auth session
  const tenantId = "tenant-default";
  const currentUser = {
    id: "user-admin",
    name: "Admin User",
    role: "admin",
  };

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <AnalyticsDashboard tenantId={tenantId} currentUserId={currentUser.id} />
    </Suspense>
  );
}

