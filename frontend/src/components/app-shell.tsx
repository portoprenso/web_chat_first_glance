import { Outlet } from 'react-router-dom';

import { ChatSidebar } from '../features/chats/components/chat-sidebar';
import { useChatSocket } from '../features/chats/hooks/use-chat-socket';

export function AppShell() {
  useChatSocket();

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="grid h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ChatSidebar />
        <main className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/50 p-4 shadow-panel md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
