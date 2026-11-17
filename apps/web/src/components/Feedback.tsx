export function Feedback({ message, error = false }: { message?: string; error?: boolean }) {
  if (!message) return null;
  return (
    <p className={error ? 'feedback error' : 'feedback success'} role={error ? 'alert' : 'status'}>
      {message}
    </p>
  );
}
