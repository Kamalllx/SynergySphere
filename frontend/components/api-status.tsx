import { useApiHealth } from '../hooks/use-api';
import { Badge } from './ui/badge';

export function ApiStatus() {
  const { isHealthy, checking } = useApiHealth();

  if (checking) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        Checking API...
      </Badge>
    );
  }

  return (
    <Badge 
      variant={isHealthy ? "default" : "destructive"}
      className="flex items-center gap-2"
    >
      <div 
        className={`w-2 h-2 rounded-full ${
          isHealthy ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      {isHealthy ? 'API Connected' : 'API Disconnected'}
    </Badge>
  );
}
