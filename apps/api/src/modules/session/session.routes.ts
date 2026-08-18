import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { roomStore } from '../../services/room.store.js';
import { discordService } from '../../services/discord.service.js';

const createSessionBody = z.object({
  channelId: z.string().min(1),
  guildId: z.string().min(1),
  instanceId: z.string().min(1),
  accessToken: z.string().min(1),
});

export const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', async (request, reply) => {
    const parse = createSessionBody.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid session data', statusCode: 400 });
    }

    const { instanceId, channelId, guildId, accessToken } = parse.data;

    let user: Awaited<ReturnType<typeof discordService.getUser>>;
    try {
      user = await discordService.getUser(accessToken);
    } catch {
      return reply.status(401).send({ error: 'AUTH_FAILED', message: 'Não foi possível verificar sua sessão do Discord.', statusCode: 401 });
    }

    roomStore.registerSession(instanceId, { channelId, guildId });

    request.log.info({ userId: user.id, instanceId, channelId, guildId }, 'Session: registered');

    return reply.send({
      sessionId: instanceId,
      channelId,
      guildId,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      user: {
        discordUserId: user.id,
        displayName: user.global_name ?? user.username,
        avatar: discordService.getAvatarUrl(user.id, user.avatar),
      },
    });
  });
};
