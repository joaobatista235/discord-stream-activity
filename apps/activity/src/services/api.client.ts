const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data['error'] as string) ?? 'UNKNOWN_ERROR',
      (data['message'] as string) ?? 'An unexpected error occurred'
    );
  }
  return data as T;
}

export interface AuthResult {
  accessToken: string;
  user: { discordUserId: string; displayName: string; avatar: string | null };
}

export function exchangeToken(code: string): Promise<AuthResult> {
  return request('/api/auth/token', { method: 'POST', body: JSON.stringify({ code }) });
}

export interface SessionResult {
  sessionId: string;
  channelId: string;
  guildId: string;
  expiresAt: string;
  user: { discordUserId: string; displayName: string; avatar: string | null };
}

export function createSession(params: {
  channelId: string;
  guildId: string;
  instanceId: string;
  accessToken: string;
}): Promise<SessionResult> {
  return request('/api/session', { method: 'POST', body: JSON.stringify(params) });
}

export interface ActiveRoom {
  roomId: string;
  streamerName: string;
  viewerCount: number;
}

export function getActiveStreams(channelId: string, guildId: string): Promise<ActiveRoom[]> {
  return request(`/api/stream/active?channelId=${channelId}&guildId=${guildId}`);
}

export interface RoomStateResult {
  roomId: string;
  status: 'WAITING' | 'LIVE' | 'ENDED';
  streamerId: string | null;
  streamerName: string | null;
  viewerCount: number;
}

export function getRoomState(roomId: string): Promise<RoomStateResult> {
  return request(`/api/room/${roomId}`);
}

export interface StartStreamResult {
  livekitToken: string;
  livekitUrl: string;
  roomId: string;
}

export function startStream(params: {
  sessionId: string;
  accessToken: string;
}): Promise<StartStreamResult> {
  return request('/api/stream/start', { method: 'POST', body: JSON.stringify(params) });
}

export function stopStream(params: {
  roomId: string;
  accessToken: string;
}): Promise<{ success: boolean; endedAt: string }> {
  return request('/api/stream/stop', { method: 'POST', body: JSON.stringify(params) });
}

export interface JoinRoomResult {
  livekitToken: string;
  livekitUrl: string;
  roomId: string;
  streamerName: string;
}

export function joinRoom(params: {
  roomId: string;
  accessToken: string;
}): Promise<JoinRoomResult> {
  return request('/api/room/join', { method: 'POST', body: JSON.stringify(params) });
}
