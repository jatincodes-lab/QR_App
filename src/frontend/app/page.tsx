export default function CustomerMenuPlaceholder() {
  return (
    <main className="min-h-screen bg-surface text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5">
        <div className="border-b border-line pb-4">
          <p className="text-sm font-medium text-accent">Customer QR Menu</p>
          <h1 className="mt-2 text-2xl font-semibold">Fast menu placeholder</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This page will become the public mobile menu opened from a table QR code.
          </p>
        </div>

        <div className="grid flex-1 place-items-center">
          <div className="w-full rounded border border-line bg-white p-4">
            <p className="text-sm font-semibold">No menu loaded yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Business logic, QR token loading, cart behavior, and ordering rules will be added in later tasks.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

