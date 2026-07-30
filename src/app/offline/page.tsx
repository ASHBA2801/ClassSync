export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 text-zinc-600">
        ClassSync needs an internet connection for most features.
      </p>
      <p className="mt-4 text-sm text-zinc-500">
        Attendance submissions will sync automatically when you reconnect.
      </p>
    </div>
  );
}
