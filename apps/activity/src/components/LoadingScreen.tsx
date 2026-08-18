import './LoadingScreen.css';

interface Props {
  message?: string;
}

export function LoadingScreen({ message = 'Conectando...' }: Props) {
  return (
    <div className="loading-screen">
      <div className="loading-inner">
        <div className="loading-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect width="40" height="40" rx="12" fill="var(--color-brand)" />
            <path
              d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8z"
              fill="white"
              opacity="0.3"
            />
            <path
              d="M17 16l8 4-8 4V16z"
              fill="white"
            />
          </svg>
        </div>
        <div className="spinner" aria-label="Carregando" />
        <p className="loading-text">{message}</p>
      </div>
    </div>
  );
}
