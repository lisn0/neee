type ToastRegionProps = {
  messages: Array<{ id: number; text: string }>;
};

export function ToastRegion({ messages }: ToastRegionProps) {
  return (
    <div aria-atomic="true" aria-live="polite" className="toast-region">
      {messages.map((message) => (
        <div className="toast" key={message.id}>
          {message.text}
        </div>
      ))}
    </div>
  );
}
