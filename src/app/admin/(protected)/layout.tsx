import { AdminNav } from "@/components/admin-nav";
import { requireAdminSession } from "@/lib/auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <main className="admin-shell grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
      <AdminNav />
      <section className="admin-content min-w-0 px-6 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-10">{children}</div>
      </section>
    </main>
  );
}
