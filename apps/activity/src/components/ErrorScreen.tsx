import './ErrorScreen.css';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorScreen({ message, onRetry }: Props) {
  return (
    <div className="error-screen">
      <div className="error-inner animate-fadeIn">
        <div className="error-icon" aria-hidden="true">⚠️</div>
        <h2 className="error-title">Algo deu errado</h2>
        <p className="error-message">{message}</p>
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry} id="retry-btn">
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
