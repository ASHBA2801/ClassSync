export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="glass-card max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-warning-light">
          <svg
            className="h-6 w-6 text-warning"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 9v4m0 4h.01"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-text-1">You&apos;re offline</h1>
        <p className="mt-2 text-text-2">
          ClassSync needs an internet connection for most features.
        </p>
        <p className="mt-4 text-sm text-text-2">
          Attendance submissions will sync automatically when you reconnect.
        </p>
      </div>
    </div>
  );
}
