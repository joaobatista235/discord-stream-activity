import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { roomStore } from '../../services/room.store.js';
import { livekitService } from '../../services/livekit.service.js';
import { discordService } from '../../services/discord.service.js';
import { env } from '../../config/env.js';

const startStreamBody = z.object({
  sessionId: z.string().min(1),
  accessToken: z.string().min(1),
});

const stopStreamBody = z.object({
  roomId: z.string().min(1),
  accessToken: z.string().min(1),
});

export const streamRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/start', async (request, reply) => {
    const parse = startStreamBody.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid request body', statusCode: 400 });
    }

    const { sessionId, accessToken } = parse.data;

    let user: Awaited<ReturnType<typeof discordService.getUser>>;
    try {
      user = await discordService.getUser(accessToken);
    } catch {
      return reply.status(401).send({ error: 'AUTH_FAILED', message: 'Não foi possível verificar sua sessão do Discord.', statusCode: 401 });
    }

    const session = roomStore.getSession(sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'SESSION_NOT_FOUND', message: 'Sessão não encontrada.', statusCode: 404 });
    }

    const { channelId, guildId } = session;
    const displayName = user.global_name ?? user.username;

    const room = roomStore.createRoom(channelId, guildId, sessionId);
    roomStore.setStreamer(room.roomId, user.id, displayName);

    await livekitService.ensureRoom(room.roomId);

    const livekitToken = await livekitService.generateToken({
      roomName: room.roomId,
      participantIdentity: user.id,
      participantName: displayName,
      canPublish: true,
      canSubscribe: false,
    });

    request.log.info({ userId: user.id, roomId: room.roomId }, 'Stream: started');

    return reply.send({
      livekitToken,
      livekitUrl: env.LIVEKIT_PUBLIC_URL ?? env.LIVEKIT_URL,
      roomId: room.roomId,
    });
  });

  fastify.post('/stop', async (request, reply) => {
    const parse = stopStreamBody.safeParse(request.body);
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
    if (!room) {
      return reply.status(404).send({ error: 'ROOM_NOT_FOUND', message: 'Sala não encontrada.', statusCode: 404 });
    }

    if (room.streamerId !== user.id) {
      return reply.status(403).send({ error: 'NOT_STREAMER', message: 'Somente o transmissor pode encerrar a transmissão.', statusCode: 403 });
    }

    roomStore.updateStatus(roomId, 'ENDED');
    roomStore.setStreamer(roomId, null, null);
    await livekitService.deleteRoom(roomId);

    request.log.info({ userId: user.id, roomId }, 'Stream: stopped');

    return reply.send({ success: true, endedAt: new Date().toISOString() });
  });

  fastify.get('/active', async (request, reply) => {
    const { channelId, guildId } = request.query as { channelId?: string; guildId?: string };

    if (!channelId || !guildId) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'channelId and guildId are required', statusCode: 400 });
    }

    return reply.send(roomStore.listActive(channelId, guildId));
  });

  fastify.get('/token', async (request, reply) => {
    const { roomId, accessToken } = request.query as { roomId?: string; accessToken?: string };

    if (!roomId || !accessToken) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'roomId and accessToken are required', statusCode: 400 });
    }

    let user: Awaited<ReturnType<typeof discordService.getUser>>;
    try {
      user = await discordService.getUser(accessToken);
    } catch {
      return reply.status(401).send({ error: 'AUTH_FAILED', message: 'Não foi possível verificar sua sessão do Discord.', statusCode: 401 });
    }

    const room = roomStore.get(roomId);
    if (!room || room.status !== 'LIVE') {
      return reply.status(404).send({ error: 'NO_ACTIVE_STREAM', message: 'Nenhuma transmissão ativa nesta sala.', statusCode: 404 });
    }

    const displayName = user.global_name ?? user.username;
    const livekitToken = await livekitService.generateToken({
      roomName: roomId,
      participantIdentity: user.id,
      participantName: displayName,
      canPublish: false,
      canSubscribe: true,
    });

    return reply.send({
      livekitToken,
      livekitUrl: env.LIVEKIT_PUBLIC_URL ?? env.LIVEKIT_URL,
      streamerName: room.streamerName ?? 'Streamer',
    });
  });
};
