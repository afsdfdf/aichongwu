"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";

type UploadResult = {
  ok?: boolean;
  message?: string;
  url?: string;
  key?: string;
};

export function HomepageUpload() {
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
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-sky-400/10 p-3">
          <UploadCloud className="size-6 text-sky-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm uppercase tracking-[0.24em] text-sky-300/60">S3 Upload Test</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Upload an image to S3</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300/80">
            Choose a JPG, PNG, or WebP image. The file is saved directly to the S3 bucket and the public URL appears here.
          </p>

          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">
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
            <p className={`mt-4 text-sm ${result?.url ? "text-emerald-300" : "text-rose-300"}`}>{message}</p>
          ) : null}

          {result?.url ? (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/20 p-3">
              <img src={result.url} alt="Uploaded preview" className="max-h-64 w-full rounded-lg object-contain" />
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all text-xs leading-5 text-sky-200 underline decoration-sky-300/40 underline-offset-4"
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
