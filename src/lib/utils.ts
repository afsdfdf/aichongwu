import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getDefaultShopDomain() {
  return process.env.DEFAULT_SHOP_DOMAIN || "demo-shop.myshopify.com";
}

export function slugifyProductType(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fillPromptTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => variables[key.trim()] ?? "");
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof date === "string" ? new Date(date) : date);
}
