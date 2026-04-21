import { AdminNav } from "@/components/admin-nav";
import { requireAdminSession } from "@/lib/auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <main className="admin-shell grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
      <AdminNav />
      <section className="admin-content min-w-0 px-6 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">{children}</div>
      </section>
    </main>
  );
}
