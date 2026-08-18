import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { discordService } from '../../services/discord.service.js';

const tokenBodySchema = z.object({ code: z.string().min(1) });

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/auth/token
   * Exchanges a Discord OAuth2 code for an access token.
   * Required first step for the Discord Embedded App SDK flow.
   */
  fastify.post('/token', async (request, reply) => {
    const parse = tokenBodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        statusCode: 400,
      });
    }

    try {
      const tokenData = await discordService.exchangeCode(parse.data.code);
      const user = await discordService.getUser(tokenData.access_token);

      request.log.info({ userId: user.id }, 'Discord auth: token exchanged');

      return reply.send({
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
        user: {
          discordUserId: user.id,
          displayName: user.global_name ?? user.username,
          avatar: discordService.getAvatarUrl(user.id, user.avatar),
        },
      });
    } catch (err) {
      request.log.warn({ err }, 'Discord auth: token exchange failed');
      return reply.status(401).send({
        error: 'AUTH_FAILED',
        message: 'Não foi possível verificar sua sessão do Discord.',
        statusCode: 401,
      });
    }
  });
};
