import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopify AI 商品效果图系统",
  description: "Vercel + Shopify + S3 + AI 模型切换的轻量生成后台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
