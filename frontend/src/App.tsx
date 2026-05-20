const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const workspaceMode = apiUrl.includes('localhost') ? 'Local' : 'Configured';

const summaryCards = [
  { label: 'Balance', value: '$4,280.00', accent: 'border-emerald-400/70' },
  { label: 'Spent', value: '$1,245.50', accent: 'border-amber-300/70' },
  { label: 'Saved', value: '$860.00', accent: 'border-sky-300/70' },
];

const recentActivity = [
  { title: 'Groceries', amount: '-$86.20', meta: 'Food and essentials' },
  { title: 'Salary', amount: '+$3,200.00', meta: 'Monthly income' },
  { title: 'Coffee', amount: '-$7.80', meta: 'Lifestyle' },
];

function App() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
              M-Track
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Money dashboard
            </h1>
          </div>

          <div className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
            Workspace: <span className="font-medium text-zinc-100">{workspaceMode}</span>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className={`rounded-lg border bg-white/[0.04] p-5 shadow-2xl shadow-black/20 ${card.accent}`}
            >
              <p className="text-sm text-zinc-400">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
            </article>
          ))}
        </section>

        <section className="grid flex-1 gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Recent activity</h2>
              <button className="rounded-md bg-emerald-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200">
                Add entry
              </button>
            </div>

            <div className="mt-5 divide-y divide-white/10">
              {recentActivity.map((item) => (
                <div key={item.title} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{item.meta}</p>
                  </div>
                  <p
                    className={
                      item.amount.startsWith('+')
                        ? 'font-semibold text-emerald-300'
                        : 'font-semibold text-rose-300'
                    }
                  >
                    {item.amount}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-semibold text-white">Monthly plan</h2>
            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-zinc-400">Budget used</span>
                  <span className="font-medium text-zinc-100">62%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[62%] rounded-full bg-emerald-300" />
                </div>
              </div>
              <p className="text-sm leading-6 text-zinc-300">
                Spending is inside the monthly plan. Keep essentials steady and
                move the next surplus into savings.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default App;
