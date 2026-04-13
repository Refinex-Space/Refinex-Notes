export function LoginScreen() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-100">
      <h2 className="text-lg font-medium">GitHub 登录</h2>
      <p className="mt-2 text-sm text-slate-300">
        Phase 1 将在这里接入 GitHub OAuth Device Flow。
      </p>
    </section>
  );
}

export default LoginScreen;
