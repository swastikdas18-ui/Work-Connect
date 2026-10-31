import { Suspense } from "react";
import { EventAgenda } from "@/components/community/EventAgenda";

export default function EventsPage() {
  // In a full session environment, tenantId and currentUser are derived from cookies/headers/auth
  const tenantId = "tenant-default";
  const currentUser = {
    id: "user-default",
    name: "Team Member",
    role: "admin", // Allows scheduling and full agenda management
  };

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <EventAgenda tenantId={tenantId} currentUser={currentUser} />
    </Suspense>
  );
}

