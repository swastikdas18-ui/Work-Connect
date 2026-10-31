import { ChannelList } from "@/components/community/ChannelList";

export default function DashboardIndexPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Mobile Channel List View (slides into chat when channel selected) */}
      <div className="flex flex-1 flex-col md:hidden">
        <ChannelList />
      </div>

      {/* Desktop Default Welcome View */}
      <div className="hidden flex-1 flex-col items-center justify-center p-8 text-center md:flex">
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Select a Channel</h2>
          <p className="text-sm text-zinc-500">
            Choose a channel from the left sidebar to start collaborating in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}

