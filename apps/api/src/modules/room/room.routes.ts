import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { roomStore } from '../../services/room.store.js';
import { livekitService } from '../../services/livekit.service.js';
import { discordService } from '../../services/discord.service.js';
import { env } from '../../config/env.js';

const joinRoomBody = z.object({
  roomId: z.string().min(1),
  accessToken: z.string().min(1),
});

export const roomRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/:roomId', async (request, reply) => {
    const { roomId } = request.params as { roomId: string };
    const room = roomStore.get(roomId);

    if (!room) {
      return reply.status(404).send({ error: 'ROOM_NOT_FOUND', message: 'Sala não encontrada.', statusCode: 404 });
    }

    return reply.send({
      roomId: room.roomId,
      status: room.status,
      streamerId: room.streamerId,
      streamerName: room.streamerName,
      viewerCount: room.viewerCount,
      participants: roomStore.getParticipants(roomId),
    });
  });

  fastify.post('/join', async (request, reply) => {
    const parse = joinRoomBody.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid request body', statusCode: 400 });
    }

    const { roomId, accessToken } = parse.data;

    let user: Awaited<ReturnType<typeof discordService.getUser>>;
    try {
      user = await discordService.getUser(accessToken);
    } catch {
      return reply.status(401).send({ error: 'AUTH_FAILED', message: 'Não foi possível verificar sua sessão do Discord.', statusCode: 401 });
    }

    const room = roomStore.get(roomId);
    if (!room || room.status !== 'LIVE') {
      return reply.status(404).send({ error: 'ROOM_NOT_FOUND', message: 'Transmissão não encontrada ou encerrada.', statusCode: 404 });
    }

    const displayName = user.global_name ?? user.username;

    roomStore.addParticipant(roomId, {
      userId: user.id,
      displayName,
      avatar: discordService.getAvatarUrl(user.id, user.avatar),
    }, 'VIEWER');

    const livekitToken = await livekitService.generateToken({
      roomName: roomId,
      participantIdentity: user.id,
      participantName: displayName,
      canPublish: false,
      canSubscribe: true,
    });

    request.log.info({ userId: user.id, roomId }, 'Room: viewer joined');

    return reply.send({
      livekitToken,
      livekitUrl: env.LIVEKIT_PUBLIC_URL ?? env.LIVEKIT_URL,
      roomId,
      streamerName: room.streamerName ?? 'Streamer',
    });
  });
};
