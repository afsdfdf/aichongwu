import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/auth";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16">
      <div className="mx-auto flex max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-xl lg:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-[radial-gradient(circle_at_top_left,#1f2937,transparent_55%),linear-gradient(135deg,#0f172a,#1e293b)] px-8 py-10 text-white lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-300">Merchant Console</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">登录 AI Preview 后台</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              统一管理 Shopify 商品提示词、模型切换、生成记录与安装文档。登录后进入升级后的后台框架。
            </p>
          </section>

          <section className="px-8 py-10 lg:px-10">
            <p className="text-sm font-medium text-slate-500">Admin Sign In</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">继续进入控制台</h2>
            <div className="mt-8">
              <AdminLoginForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
