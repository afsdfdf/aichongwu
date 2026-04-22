import { AdminNav } from "@/components/admin-nav";
import { requireAdminSession } from "@/lib/auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <main className="admin-shell grid min-h-screen lg:grid-cols-[276px_minmax(0,1fr)]">
      <AdminNav />
      <section className="admin-content min-w-0 px-4 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto w-full max-w-[1360px] space-y-4 pb-8 lg:space-y-5">{children}</div>
      </section>
    </main>
  );
}
