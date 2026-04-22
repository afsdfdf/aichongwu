"use client";

import { useState } from "react";

export function AdminLoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(event.currentTarget);
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        });

        setLoading(false);

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({ message: "登录失败" }))) as {
            message?: string;
          };
          setError(payload.message || "登录失败");
          return;
        }

        window.location.href = "/admin";
      }}
    >
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm text-slate-300">
          管理员邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500"
          placeholder="admin@example.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm text-slate-300">
          管理密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500"
          placeholder="••••••••"
        />
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        type="submit"
        className="w-full rounded-lg bg-sky-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-300"
      >
        {loading ? "登录中..." : "进入后台"}
      </button>
    </form>
  );
}
