"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";

type UploadResult = {
  ok?: boolean;
  message?: string;
  url?: string;
  key?: string;
};

export function AdminUpload() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setMessage("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as UploadResult;

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Upload failed.");
      }

      setResult(data);
      setMessage("Uploaded to S3 successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="admin-panel p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-blue-50 p-3">
          <UploadCloud className="size-6 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">S3 Upload</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">上传图片到 S3</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            选择 JPG、PNG 或 WebP 图片，文件会按后台上传路径保存到 S3，并返回可访问 URL。
          </p>

          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (file) void uploadFile(file);
              }}
            />
            <UploadCloud className="size-4" />
            {uploading ? "Uploading..." : "Choose image"}
          </label>

          {message ? (
            <p className={`mt-4 text-sm ${result?.url ? "text-emerald-600" : "text-rose-600"}`}>{message}</p>
          ) : null}

          {result?.url ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <img src={result.url} alt="Uploaded preview" className="max-h-64 w-full rounded-lg object-contain" />
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all text-xs leading-5 text-blue-600 underline decoration-blue-300 underline-offset-4"
              >
                {result.url}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
