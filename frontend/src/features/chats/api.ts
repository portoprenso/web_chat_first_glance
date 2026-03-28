import { apiBlobRequest, apiJsonRequest } from '../../lib/api/client';
import type { JsonRequest, JsonResponse } from '../../lib/api/types';

export type ChatListResponse = JsonResponse<'/api/chats', 'get', 200>;
export type ChatSummary = ChatListResponse['items'][number];
export type Attachment = JsonResponse<'/api/attachments', 'post', 201>;
export type Message = JsonResponse<'/api/chats/{chatId}/messages', 'post', 201>;
export type MessagePage = JsonResponse<'/api/chats/{chatId}/messages', 'get', 200>;

export async function listChatsRequest(): Promise<JsonResponse<'/api/chats', 'get', 200>> {
  return apiJsonRequest<JsonResponse<'/api/chats', 'get', 200>>({
    method: 'GET',
    path: '/api/chats',
  });
}

export async function openDirectChatRequest(
  body: JsonRequest<'/api/chats/direct', 'post'>,
): Promise<JsonResponse<'/api/chats/direct', 'post', 200>> {
  return apiJsonRequest<JsonResponse<'/api/chats/direct', 'post', 200>>({
    method: 'POST',
    path: '/api/chats/direct',
    body,
  });
}

export async function listMessagesRequest(
  chatId: string,
  cursor?: string,
): Promise<JsonResponse<'/api/chats/{chatId}/messages', 'get', 200>> {
  return apiJsonRequest<JsonResponse<'/api/chats/{chatId}/messages', 'get', 200>>({
    method: 'GET',
    path: '/api/chats/{chatId}/messages',
    pathParams: { chatId },
    query: {
      limit: 50,
      cursor,
    },
  });
}

export async function createMessageRequest(
  chatId: string,
  body: JsonRequest<'/api/chats/{chatId}/messages', 'post'>,
): Promise<JsonResponse<'/api/chats/{chatId}/messages', 'post', 201>> {
  return apiJsonRequest<JsonResponse<'/api/chats/{chatId}/messages', 'post', 201>>({
    method: 'POST',
    path: '/api/chats/{chatId}/messages',
    pathParams: { chatId },
    body,
  });
}

export async function uploadAttachmentRequest(
  file: File,
): Promise<JsonResponse<'/api/attachments', 'post', 201>> {
  const formData = new FormData();
  formData.append('file', file);

  return apiJsonRequest<JsonResponse<'/api/attachments', 'post', 201>>({
    method: 'POST',
    path: '/api/attachments',
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
