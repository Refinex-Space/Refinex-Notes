const phaseZeroSections = [
  {
    title: "前端基础层",
    description: "React 18 + TypeScript strict + Vite + Tailwind CSS 已完成联通。",
  },
  {
    title: "桌面容器",
    description: "Tauri 2 配置已升级，主窗口标题、尺寸与 bundle 标识已对齐。",
  },
  {
    title: "目录骨架",
    description: "已预留 components、stores、services、src-tauri 与 skills 结构。",
  },
] as const;

function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-10 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/40">
          <div className="border-b border-white/10 px-6 py-4">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
              Phase 0 · Scaffold Ready
            </p>
          </div>
          <div className="grid gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Refinex-Notes
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                超越 Typora 的 AI-Native Markdown 笔记软件。当前项目已完成
                Tauri 2、React、Vite、Tailwind 与 Radix UI 的基础初始化，可直接进入下一阶段开发。
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-5">
              <div className="mb-4 flex items-center justify-between text-sm text-slate-300">
                <span>Window</span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                  1280 × 800
                </span>
              </div>
              <div className="grid gap-3 text-sm text-slate-400">
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  identifier: dev.refinex.notes
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  productName: Refinex-Notes
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  tauri: 2.x / api: 2.x / cli: 2.x
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {phaseZeroSections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <h2 className="text-lg font-medium text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {section.description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export default App;
