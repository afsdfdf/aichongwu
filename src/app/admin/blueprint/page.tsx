import { AdminShell } from "@/components/admin/AdminShell";
import { FieldRow } from "@/components/admin/FieldRow";
import { FormCard } from "@/components/admin/FormCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StickyActionBar } from "@/components/admin/StickyActionBar";

export default function AdminBlueprintPage() {
  return (
    <AdminShell
      sidebar={
        <nav className="space-y-2 text-sm">
          <div className="mb-4 text-xs uppercase tracking-[0.16em] text-neutral-500">AI Preview Admin</div>
          <a className="block rounded-xl bg-neutral-100 px-3 py-2 font-medium dark:bg-neutral-800" href="#settings">
            系统设置
          </a>
          <a className="block rounded-xl px-3 py-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" href="#connections">
            API 设置
          </a>
          <a className="block rounded-xl px-3 py-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" href="#prompts">
            提示词设置
          </a>
        </nav>
      }
      header={
        <PageHeader
          title="后台模板框架示例"
          description="统一系统设置 / API 设置 / 提示词设置三类页面的标题、区块和操作条。"
          actions={<button className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">保存草稿</button>}
        />
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <FormCard title="系统设置" description="店铺端不做设置，后台只维护自己的域名、默认路由和小组件文案。">
            <FieldRow label="应用域名" description="店铺代码只需要切换到新的 API 域名。">
              <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-950" defaultValue="https://api.example.com" />
            </FieldRow>
            <FieldRow label="默认执行模式" description="同步用于立即返回，异步用于长耗时或第三方队列。">
              <select className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-950" defaultValue="sync">
                <option value="sync">sync</option>
                <option value="async">async</option>
              </select>
            </FieldRow>
          </FormCard>

          <FormCard title="API 设置" description="按 provider kind 渲染字段。官方 OpenAI 不展示 Base URL。">
            <FieldRow label="连接类型" description="official / compatible / custom-webhook 三种表单必须互斥。">
              <div className="rounded-xl border border-dashed border-black/10 px-3 py-3 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                动态表单区域
              </div>
            </FieldRow>
          </FormCard>

          <FormCard title="提示词设置" description="永远保留 Draft / Published 两层，不直接覆盖线上。">
            <FieldRow label="版本编辑器" description="左侧模板列表，右侧版本编辑器与预览器。">
              <textarea className="min-h-40 w-full rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-950" defaultValue="Create a premium preview for {{productTitle}}..." />
            </FieldRow>
          </FormCard>
        </div>

        <div className="space-y-4">
          <FormCard title="固定规则" description="避免现在模板框架风格不统一。">
            <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
              <li>页面始终使用 Header + Main + StickyActionBar 结构。</li>
              <li>所有卡片统一 16px radius，输入框统一 12px radius。</li>
              <li>所有按钮只分主按钮、次按钮、危险按钮三类。</li>
              <li>设置页不允许出现随意的 inline 表单布局。</li>
            </ul>
          </FormCard>
        </div>
      </div>

      <StickyActionBar>
        <button className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/10">取消</button>
        <button className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">保存并同步</button>
      </StickyActionBar>
    </AdminShell>
  );
}
