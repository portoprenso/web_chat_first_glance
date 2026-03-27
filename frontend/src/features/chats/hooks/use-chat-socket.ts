import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { restoreSessionRequest } from '../../auth/api';
import { appConfig } from '../../../lib/config';
import { ChatSocketClient } from '../../../lib/ws/chat-socket';
import { useAuthStore } from '../../../store/auth-store';
import { useSocketStore } from '../../../store/socket-store';
import { chatKeys } from '../query-keys';
import { upsertMessagePageData } from './use-chat-data';

export function useChatSocket(): void {
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const setSocketStatus = useSocketStore((state) => state.setStatus);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setSocketStatus('idle');
      return;
    }

    const client = new ChatSocketClient({
      url: appConfig.VITE_WS_URL,
      getAccessToken: () => useAuthStore.getState().accessToken,
      onAuthExpired: restoreSessionRequest,
      onStatusChange: (status, error) => {
        setSocketStatus(status, error);
      },
      onEvent: (event) => {
        switch (event.type) {
          case 'connection.ready': {
            void queryClient.invalidateQueries({ queryKey: chatKeys.all });
            void queryClient.invalidateQueries({
              predicate: (query) =>
                Array.isArray(query.queryKey) && query.queryKey[2] === 'messages',
            });
            break;
          }
          case 'chat.created': {
            void queryClient.invalidateQueries({ queryKey: chatKeys.all });
            break;
          }
          case 'message.created': {
            queryClient.setQueryData(
              chatKeys.messages(event.payload.message.chatId),
              (current: ReturnType<typeof upsertMessagePageData> | undefined) =>
                upsertMessagePageData(current, event.payload.message),
            );
            void queryClient.invalidateQueries({ queryKey: chatKeys.all });
            break;
          }
          case 'error':
            break;
        }
      },
    });

    client.connect();
    return () => {
      client.disconnect();
    };
  }, [authStatus, queryClient, setSocketStatus]);
}
