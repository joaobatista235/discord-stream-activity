import { AppProvider, useApp } from './AppContext';
import { useInitApp } from './useInitApp';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { Lobby } from '../features/lobby/Lobby';
import { Viewer } from '../features/viewer/Viewer';
import { StreamingBanner } from '../features/stream/StreamingBanner';
import './index.css';

function AppShell() {
  useInitApp();
  const { state } = useApp();

  let mainView: React.ReactNode;

  switch (state.status) {
    case 'INITIALIZING':
      mainView = <LoadingScreen message="Inicializando Activity..." />;
      break;
    case 'ERROR':
      mainView = (
        <ErrorScreen
          message={state.error ?? 'Ocorreu um erro inesperado.'}
          onRetry={() => window.location.reload()}
        />
      );
      break;
    case 'WATCHING':
      mainView = <Viewer />;
      break;
    case 'LOBBY':
    default:
      mainView = <Lobby />;
      break;
  }

  return (
    <>
      {mainView}
      {state.myStream && <StreamingBanner />}
    </>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
