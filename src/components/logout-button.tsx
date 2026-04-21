"use client";

import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/admin/login";
      }}
      className="w-full rounded-2xl border border-white/12 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
    >
      {loading ? "退出中..." : "退出登录"}
    </button>
  );
}
