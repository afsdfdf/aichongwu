import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/auth";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <main className="container-shell flex min-h-screen items-center justify-center py-16">
      <div className="glass w-full max-w-md rounded-[32px] p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300/70">Merchant Login</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">登录 AI Preview 后台</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          在这里管理 Shopify 商品提示词、模型切换、生成记录和安装代码。
        </p>
        <div className="mt-8">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
