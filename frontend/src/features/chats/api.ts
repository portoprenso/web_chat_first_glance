import { apiBlobRequest, apiJsonRequest } from '../../lib/api/client';
import type { JsonRequest, JsonResponse } from '../../lib/api/types';

export type ChatListResponse = JsonResponse<'/chats', 'get', 200>;
export type ChatSummary = ChatListResponse['items'][number];
export type Attachment = JsonResponse<'/attachments', 'post', 201>;
export type Message = JsonResponse<'/chats/{chatId}/messages', 'post', 201>;
export type MessagePage = JsonResponse<'/chats/{chatId}/messages', 'get', 200>;

export async function listChatsRequest(): Promise<JsonResponse<'/chats', 'get', 200>> {
  return apiJsonRequest<JsonResponse<'/chats', 'get', 200>>({
    method: 'GET',
    path: '/chats',
  });
}

export async function openDirectChatRequest(
  body: JsonRequest<'/chats/direct', 'post'>,
): Promise<JsonResponse<'/chats/direct', 'post', 200>> {
  return apiJsonRequest<JsonResponse<'/chats/direct', 'post', 200>>({
    method: 'POST',
    path: '/chats/direct',
    body,
  });
}

export async function listMessagesRequest(
  chatId: string,
  cursor?: string,
): Promise<JsonResponse<'/chats/{chatId}/messages', 'get', 200>> {
  return apiJsonRequest<JsonResponse<'/chats/{chatId}/messages', 'get', 200>>({
    method: 'GET',
    path: '/chats/{chatId}/messages',
    pathParams: { chatId },
    query: {
      limit: 50,
      cursor,
    },
  });
}

export async function createMessageRequest(
  chatId: string,
  body: JsonRequest<'/chats/{chatId}/messages', 'post'>,
): Promise<JsonResponse<'/chats/{chatId}/messages', 'post', 201>> {
  return apiJsonRequest<JsonResponse<'/chats/{chatId}/messages', 'post', 201>>({
    method: 'POST',
    path: '/chats/{chatId}/messages',
    pathParams: { chatId },
    body,
  });
}

export async function uploadAttachmentRequest(
  file: File,
): Promise<JsonResponse<'/attachments', 'post', 201>> {
  const formData = new FormData();
  formData.append('file', file);

  return apiJsonRequest<JsonResponse<'/attachments', 'post', 201>>({
    method: 'POST',
    path: '/attachments',
    body: formData,
  });
}

export async function downloadAttachmentRequest(downloadPath: string): Promise<{
  blob: Blob;
  fileName: string | null;
}> {
  return apiBlobRequest({
    method: 'GET',
    path: downloadPath,
  });
}
