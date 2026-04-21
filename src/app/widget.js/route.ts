import { NextResponse } from "next/server";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { setting } = await getStoreContext(getDefaultShopDomain());

  const script = `
(() => {
  const root = document.getElementById("ai-preview-root");
  if (!root || root.dataset.aiWidgetMounted === "1") return;
  root.dataset.aiWidgetMounted = "1";

  const apiBase = root.dataset.apiBase || new URL(document.currentScript?.src || window.location.href).origin;
  const config = {
    shopDomain: root.dataset.shopDomain || "",
    productId: root.dataset.productId || "",
    productTitle: root.dataset.productTitle || "",
    productType: root.dataset.productType || "",
    variantId: root.dataset.variantId || "",
    requireGeneration: ${JSON.stringify(setting.requireGeneration)},
    accentColor: ${JSON.stringify(setting.widgetAccentColor)},
    buttonText: ${JSON.stringify(setting.widgetButtonText)}
  };

  const form = root.closest("form") || document.querySelector('form[action*="/cart/add"]');
  const addToCartButton = form?.querySelector('button[type="submit"], input[type="submit"]');
  if (config.requireGeneration && addToCartButton) {
    addToCartButton.setAttribute("disabled", "disabled");
    addToCartButton.style.opacity = "0.6";
    addToCartButton.style.cursor = "not-allowed";
  }

  root.innerHTML = \`
    <style>
      .ai-preview-widget{border:1px solid rgba(15,23,42,.12);background:#fff;border-radius:24px;padding:18px;display:grid;gap:14px;box-shadow:0 18px 45px rgba(15,23,42,.08);font-family:Inter,system-ui,sans-serif;color:#0f172a}
      .ai-preview-title{font-size:18px;font-weight:700}
      .ai-preview-text{font-size:13px;line-height:1.7;color:#475569}
      .ai-preview-input{display:block;width:100%;border:1px dashed rgba(15,23,42,.18);border-radius:18px;padding:16px;background:#f8fafc}
      .ai-preview-button{border:none;border-radius:16px;padding:14px 18px;background:${setting.widgetAccentColor};color:#fff;font-weight:600;cursor:pointer}
      .ai-preview-button[disabled]{opacity:.65;cursor:not-allowed}
      .ai-preview-card{border:1px solid rgba(15,23,42,.08);border-radius:20px;padding:12px;background:#f8fafc;display:none}
      .ai-preview-card img{width:100%;border-radius:16px;display:block}
      .ai-preview-meta{font-size:12px;color:#334155;line-height:1.8}
      .ai-preview-error{color:#be123c;font-size:13px;display:none}
    </style>
    <div class="ai-preview-widget">
      <div>
        <div class="ai-preview-title">AI 效果图预览</div>
        <div class="ai-preview-text">上传照片后，系统会自动按当前商品匹配提示词并生成效果图。</div>
      </div>
      <input class="ai-preview-input" type="file" accept="image/*" />
      <button class="ai-preview-button" type="button">${setting.widgetButtonText}</button>
      <div class="ai-preview-error"></div>
      <div class="ai-preview-card">
        <img alt="AI preview" />
        <div class="ai-preview-meta"></div>
      </div>
    </div>
  \`;

  const fileInput = root.querySelector(".ai-preview-input");
  const button = root.querySelector(".ai-preview-button");
  const errorEl = root.querySelector(".ai-preview-error");
  const card = root.querySelector(".ai-preview-card");
  const previewImage = root.querySelector(".ai-preview-card img");
  const meta = root.querySelector(".ai-preview-meta");

  function upsertHiddenInput(name, value) {
    if (!form) return;
    let input = form.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  }

  button.addEventListener("click", async () => {
    errorEl.style.display = "none";
    errorEl.textContent = "";
    const file = fileInput.files?.[0];
    if (!file) {
      errorEl.textContent = "请先上传图片。";
      errorEl.style.display = "block";
      return;
    }

    button.setAttribute("disabled", "disabled");
    button.textContent = "生成中...";

    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("shopDomain", config.shopDomain);
      payload.append("productId", config.productId);
      payload.append("productTitle", config.productTitle);
      payload.append("productType", config.productType);
      payload.append("variantId", config.variantId);

      const response = await fetch(apiBase + "/api/generate", {
        method: "POST",
        body: payload
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "生成失败");

      previewImage.src = data.outputImageUrl;
      card.style.display = "block";
      meta.innerHTML = "模型：" + data.modelUsed + "<br />已写入下单属性，提交订单后商家后台可追踪。";

      upsertHiddenInput("properties[_AI Generation ID]", data.generationId);
      upsertHiddenInput("properties[_AI Preview URL]", data.outputImageUrl);
      upsertHiddenInput("properties[_AI Model]", data.modelUsed);
      upsertHiddenInput("properties[_AI Prompt]", data.promptUsed);

      if (config.requireGeneration && addToCartButton) {
        addToCartButton.removeAttribute("disabled");
        addToCartButton.style.opacity = "1";
        addToCartButton.style.cursor = "pointer";
      }
    } catch (error) {
      errorEl.textContent = error.message || "生成失败";
      errorEl.style.display = "block";
    } finally {
      button.removeAttribute("disabled");
      button.textContent = config.buttonText;
    }
  });
})();
  `.trim();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
