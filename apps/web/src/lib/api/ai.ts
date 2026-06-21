import { api } from '@/lib/api';

export async function assistText(
  text: string,
  action: string,
): Promise<{ result: string }> {
  return api.post('ai/assist', { json: { text, action } }).json();
}

export async function sendChatMessage(
  messages: Array<{ role: string; content: string }>,
): Promise<{ reply: string; suggestedFollowUps: string[] }> {
  return api.post('ai/chat', { json: { messages } }).json();
}
