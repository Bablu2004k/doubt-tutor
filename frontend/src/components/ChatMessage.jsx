export default function ChatMessage({ role, children }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end message-in">
        <div className="max-w-[80%] bg-forest text-paper rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 message-in">
      <span className="shrink-0 w-8 h-8 rounded-full bg-accent text-paper flex items-center justify-center text-xs font-semibold mt-0.5 shadow-sm">
        D
      </span>
      <div className="min-w-0 flex-1 space-y-3">{children}</div>
    </div>
  );
}
