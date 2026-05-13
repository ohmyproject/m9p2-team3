import { useEffect } from 'react';

export function Toast({ message, onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return <div className="toast" role="status">{message}</div>;
}
