"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from "lucide-react";
import { StatusPill } from "@/components/dashboard";
import { cn, formatDate } from "@/lib/utils";

type GenerationGalleryItem = {
  id: string;
  productType: string;
  productTitle: string | null;
  customerEmail: string | null;
  modelUsed: string;
  promptUsed: string;
  orderName: string | null;
  orderId: string | null;
  status: string;
  createdAt: string;
  sourceImageUrl: string;
  outputImageUrl: string;
  metadata?: Record<string, unknown> | null;
};

const PAGE_SIZE = 70;

export function GenerationGallery({ rows }: { rows: GenerationGalleryItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"result" | "source">("result");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [currentPage, rows]);

  const selected = useMemo(
    () => rows.find((item) => item.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const allSelectedOnPage = pagedRows.length > 0 && pagedRows.every((item) => selectedIds.includes(item.id));

  async function downloadSelected() {
    if (!selectedIds.length) return;
    setDownloading(true);
    const response = await fetch("/api/generations/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, includeOriginals: true }),
    });

    if (!response.ok) {
      setDownloading(false);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "generations-batch.zip";
    link.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={(event) => {
                if (event.target.checked) {
                  setSelectedIds((prev) => [...new Set([...prev, ...pagedRows.map((item) => item.id)])]);
                } else {
                  setSelectedIds((prev) => prev.filter((id) => !pagedRows.some((item) => item.id === id)));
                }
              }}
            />
            <span>全选本页</span>
          </label>
          <span>
            每页显示 <span className="font-medium text-slate-900">{PAGE_SIZE}</span> 条，当前第{" "}
            <span className="font-medium text-slate-900">{currentPage}</span> / {totalPages} 页
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadSelected}
            disabled={!selectedIds.length || downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Download className="size-4" />
            {downloading ? "打包中..." : `下载选中 (${selectedIds.length})`}
          </button>
          <PageButton disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            <ChevronLeft className="size-4" />
          </PageButton>
          <PageButton
            disabled={currentPage === totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            <ChevronRight className="size-4" />
          </PageButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
        {pagedRows.map((item) => {
          const checked = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-[18px] border border-[#dbe3ef] bg-white text-left shadow-[0_6px_20px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-center justify-between px-3 pb-2 pt-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setSelectedIds((prev) =>
                      event.target.checked ? [...new Set([...prev, item.id])] : prev.filter((id) => id !== item.id),
                    );
                  }}
                />
                <span className="text-[11px] text-slate-400">{formatDate(item.createdAt)}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setActiveTab("result");
                }}
                className="block w-full"
              >
                <div className="bg-[#f8fafc] px-2 pb-2">
                  <img
                    src={item.outputImageUrl}
                    alt={item.productTitle || item.productType}
                    className="aspect-square w-full rounded-[14px] object-cover"
                  />
                </div>

                <div className="space-y-2 px-3 pb-3 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-xs font-medium text-slate-700">
                      {item.productTitle || item.productType}
                    </p>
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                      有原图
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2">
        <PageButton disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
          上一页
        </PageButton>
        <span className="px-3 text-sm text-slate-500">
          第 <span className="font-medium text-slate-900">{currentPage}</span> / {totalPages} 页
        </span>
        <PageButton
          disabled={currentPage === totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
        >
          下一页
        </PageButton>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/68 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-sm text-slate-400">图片预览</p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {selected.productTitle || selected.productType}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-2xl border border-white/10 p-3 text-slate-300 transition hover:bg-white/5"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-88px)] gap-0 overflow-auto xl:grid-cols-[1.15fr_0.85fr]">
              <div className="border-b border-white/10 p-5 xl:border-b-0 xl:border-r">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("result")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm transition",
                      activeTab === "result"
                        ? "bg-sky-400 text-slate-950"
                        : "border border-white/10 text-slate-300 hover:bg-white/5",
                    )}
                  >
                    默认显示：效果图
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("source")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm transition",
                      activeTab === "source"
                        ? "bg-white text-slate-950"
                        : "border border-white/10 text-slate-300 hover:bg-white/5",
                    )}
                  >
                    查看原图
                  </button>
                </div>

                <div className="overflow-hidden rounded-[24px] bg-white/[0.04] p-3">
                  <img
                    src={activeTab === "result" ? selected.outputImageUrl : selected.sourceImageUrl}
                    alt={selected.productTitle || selected.productType}
                    className="aspect-square w-full rounded-[20px] object-cover"
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <LinkTile label="打开效果图" url={selected.outputImageUrl} />
                  <LinkTile label="打开原图" url={selected.sourceImageUrl} />
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={selected.orderId ? "ordered" : selected.status} />
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                    {selected.productType}
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                    {selected.modelUsed}
                  </span>
                </div>

                <InfoBlock label="创建时间" value={formatDate(selected.createdAt)} />
                <InfoBlock label="客户邮箱" value={selected.customerEmail || "暂无"} />
                <InfoBlock label="订单号" value={selected.orderName || "尚未关联订单"} />
                <InfoBlock label="Generation ID" value={selected.id} mono />

                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-500">提示词</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {selected.promptUsed}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm transition",
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

function LinkTile({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.05]"
    >
      <span>{label}</span>
      <ExternalLink className="size-4 text-slate-400" />
    </a>
  );
}

function InfoBlock({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn("mt-2 break-all text-sm leading-7 text-slate-200", mono && "font-mono")}>{value}</p>
    </div>
  );
}
