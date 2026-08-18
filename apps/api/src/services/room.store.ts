import { randomUUID } from 'node:crypto';
import type { StreamRoom, Participant, RoomStatus, ParticipantRole } from '@discord-stream/shared';

interface RoomRecord {
  room: StreamRoom;
  participants: Map<string, Participant>;
  channelId: string;
  guildId: string;
}

interface SessionRecord {
  channelId: string;
  guildId: string;
}

export interface ActiveRoomSummary {
  roomId: string;
  streamerName: string;
  viewerCount: number;
}

class RoomStore {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly sessions = new Map<string, SessionRecord>();

  registerSession(sessionId: string, data: SessionRecord): void {
    this.sessions.set(sessionId, data);
  }

  getSession(sessionId: string): SessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  createRoom(channelId: string, guildId: string, activitySessionId: string): StreamRoom {
    const room: StreamRoom = {
      roomId: randomUUID(),
      activitySessionId,
      streamerId: null,
      streamerName: null,
      status: 'LIVE',
      viewerCount: 0,
      createdAt: new Date().toISOString(),
      endedAt: null,
    };
    this.rooms.set(room.roomId, { room, participants: new Map(), channelId, guildId });
    return room;
  }

  get(roomId: string): StreamRoom | undefined {
    return this.rooms.get(roomId)?.room;
  }

  listActive(channelId: string, guildId: string): ActiveRoomSummary[] {
    return [...this.rooms.values()]
      .filter(r => r.channelId === channelId && r.guildId === guildId && r.room.status === 'LIVE')
      .map(r => ({
        roomId: r.room.roomId,
        streamerName: r.room.streamerName ?? 'Streamer',
        viewerCount: r.room.viewerCount,
      }));
  }

  updateStatus(roomId: string, status: RoomStatus): void {
    const record = this.rooms.get(roomId);
    if (!record) return;
    record.room.status = status;
    if (status === 'ENDED') record.room.endedAt = new Date().toISOString();
  }

  setStreamer(roomId: string, streamerId: string | null, streamerName: string | null): void {
    const record = this.rooms.get(roomId);
    if (!record) return;
    record.room.streamerId = streamerId;
    record.room.streamerName = streamerName;
  }

  addParticipant(
    roomId: string,
    user: { userId: string; displayName: string; avatar: string | null },
    role: ParticipantRole
  ): void {
    const record = this.rooms.get(roomId);
    if (!record) return;
    record.participants.set(user.userId, {
      userId: user.userId,
      displayName: user.displayName,
      avatar: user.avatar,
      roomId,
      role,
      joinedAt: new Date().toISOString(),
    });
    record.room.viewerCount = [...record.participants.values()].filter(p => p.role === 'VIEWER').length;
  }

  removeParticipant(roomId: string, userId: string): void {
    const record = this.rooms.get(roomId);
    if (!record) return;
    record.participants.delete(userId);
    record.room.viewerCount = [...record.participants.values()].filter(p => p.role === 'VIEWER').length;
  }

  getParticipants(roomId: string): Participant[] {
    return [...(this.rooms.get(roomId)?.participants.values() ?? [])];
  }
}

export const roomStore = new RoomStore();
