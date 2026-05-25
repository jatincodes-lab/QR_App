export default function AdminPlaceholder() {
  return (
    <main className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <div>
            <p className="text-sm font-semibold">QR Menu SaaS</p>
            <p className="text-xs text-slate-500">Admin placeholder</p>
          </div>
          <div className="rounded border border-line px-3 py-1 text-xs text-slate-600">Setup pending</div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Restaurant operations console</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Tenant setup, branches, menus, tables, QR codes, orders, kitchen dashboard, staff roles, and reports will be added module by module.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {["Branches", "Menu", "Orders"].map((label) => (
            <div key={label} className="rounded border border-line bg-white p-4">
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-sm text-slate-500">Not implemented yet</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

