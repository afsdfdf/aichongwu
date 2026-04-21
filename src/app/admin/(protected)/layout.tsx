import { AdminNav } from "@/components/admin-nav";
import { requireAdminSession } from "@/lib/auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <main className="container-shell grid gap-6 py-8 lg:grid-cols-[260px_1fr]">
      <AdminNav />
      <section className="space-y-6">{children}</section>
    </main>
  );
}
