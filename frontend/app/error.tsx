'use client'

// Global error boundary for the entire app (Next.js App Router)
// Shows a UI and lets user reload/apply manual recovery after any fatal error

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-4">⛔️ Something went wrong</h1>
      <p className="mb-4 text-lg max-w-xl text-center" style={{ color: '#bbb' }}>
        {error?.message ? error.message : 'An unexpected error occurred.'}<br />
        Please try refreshing or contact support if the problem persists.
      </p>
      <button
        className="btn-primary px-6 py-2"
        style={{ fontSize: 16, marginTop: 16 }}
        onClick={() => reset()}>
        Reload page
      </button>
      {error?.digest && (
        <pre className="mt-6 text-sm text-gray-400 bg-gray-900 rounded p-4 opacity-80">
          Error digest: {error.digest}
        </pre>
      )}
    </div>
  )
}
