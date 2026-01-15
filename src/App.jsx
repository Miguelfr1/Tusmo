import { useState } from 'react'

const stats = [
  { label: 'Players ready', value: '128' },
  { label: 'Rounds today', value: '24' },
  { label: 'Average score', value: '7.8' },
]

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Tusmo
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Vite + React is wired with Tailwind
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Your project is ready. Start shaping the Tusmo experience and
            iterate fast with HMR.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/50">
            <h2 className="text-lg font-semibold">Live counter</h2>
            <p className="mt-2 text-sm text-slate-400">
              Click to confirm state updates, Tailwind styles, and hot reload.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <button
                className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                onClick={() => setCount((value) => value + 1)}
              >
                Add point
              </button>
              <div className="text-3xl font-semibold tabular-nums text-emerald-200">
                {count}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="text-lg font-semibold">Today in Tusmo</h2>
            <div className="mt-4 grid gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-3"
                >
                  <span className="text-sm text-slate-400">{stat.label}</span>
                  <span className="text-lg font-semibold text-slate-100">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="text-xs text-slate-500">
          Edit <code className="text-slate-300">src/App.jsx</code> to keep
          building.
        </footer>
      </div>
    </div>
  )
}

export default App
