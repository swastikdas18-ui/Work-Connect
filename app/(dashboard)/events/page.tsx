import { Suspense } from "react";
import { EventAgenda } from "@/components/community/EventAgenda";

export default function EventsPage() {
  // In a full session environment, tenantId and currentUser are derived from cookies/headers/auth
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const currentUser = {
    id: "00000000-0000-0000-0000-000000000001",
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

