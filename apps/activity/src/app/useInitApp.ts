import { useEffect } from 'react';
import { discordSdk } from '../lib/discord';
import { exchangeToken, createSession } from '../services/api.client';
import { useAppDispatch } from './AppContext';

export function useInitApp() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await discordSdk.ready();

        const { code } = await discordSdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify'],
        });

        const authResult = await exchangeToken(code);

        await discordSdk.commands.authenticate({
          access_token: authResult.accessToken,
        });

        if (cancelled) return;

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            discordUserId: authResult.user.discordUserId,
            displayName: authResult.user.displayName,
            avatar: authResult.user.avatar,
            accessToken: authResult.accessToken,
          },
        });

        const channelId = discordSdk.channelId ?? 'mock-channel';
        const guildId = discordSdk.guildId ?? 'mock-guild';
        const instanceId = discordSdk.instanceId ?? 'mock-instance';

        const session = await createSession({
          channelId,
          guildId,
          instanceId,
          accessToken: authResult.accessToken,
        });

        if (cancelled) return;

        dispatch({ type: 'SESSION_CREATED', payload: session });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('[init]', err);
        dispatch({ type: 'SET_ERROR', payload: message });
      }
    }

    void init();
    return () => { cancelled = true; };
  }, [dispatch]);
}
