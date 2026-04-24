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

  const apiBase = root.dataset.apiBase || "https://aichongwu.vercel.app";
  const accentColor =
    ${JSON.stringify(setting.widgetAccentColor)} && ${JSON.stringify(setting.widgetAccentColor)} !== "#0ea5e9"
      ? ${JSON.stringify(setting.widgetAccentColor)}
      : "#2B473F";
  const buttonLabel =
    ${JSON.stringify(setting.widgetButtonText)} && ${JSON.stringify(setting.widgetButtonText)} !== "生成效果图"
      ? ${JSON.stringify(setting.widgetButtonText)}
      : "Upload Your Pet Photo";
  const config = {
    shopDomain: root.dataset.shopDomain || "",
    productId: root.dataset.productId || "",
    productTitle: root.dataset.productTitle || "",
    productType: root.dataset.productType || "",
    variantId: root.dataset.variantId || "",
    requireGeneration: ${JSON.stringify(setting.requireGeneration)}
  };

  const form = root.closest("form") || document.querySelector('form[action*="/cart/add"]');
  const addToCartButton = form?.querySelector('button[type="submit"], input[type="submit"]');
  const variantPicker =
    document.querySelector(".product-detail__variant-picker") ||
    document.querySelector("[data-product-variant-picker]") ||
    document.querySelector(".product-form__input");
  const cartArea =
    document.querySelector(".product-form__buttons") ||
    addToCartButton?.closest(".product-form__buttons") ||
    addToCartButton?.closest("form");
  const hiddenMaterialUrl = document.getElementById("mm-material-url");

  function isLoggedIn() {
    return document.cookie.indexOf("_shopify_s") > -1 || !!document.querySelector("[data-customer-id]");
  }

  function getGenCount() {
    try { return parseInt(localStorage.getItem("mm_gen_count") || "0", 10); } catch { return 0; }
  }

  function addGenCount() {
    try { localStorage.setItem("mm_gen_count", String(getGenCount() + 1)); } catch {}
  }

  function setButtonLocked(locked) {
    if (!addToCartButton) return;
    if (locked) {
      addToCartButton.setAttribute("disabled", "disabled");
      addToCartButton.style.opacity = "0.6";
      addToCartButton.style.cursor = "not-allowed";
    } else {
      addToCartButton.removeAttribute("disabled");
      addToCartButton.style.opacity = "1";
      addToCartButton.style.cursor = "pointer";
    }
  }

  if (config.requireGeneration) setButtonLocked(true);

  root.innerHTML =
    \`<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap" rel="stylesheet">
    <style>
      #mm-root, #mm-modal { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      #mm-root * { box-sizing: border-box; }
      #mm-upload-btn,.mm-modal-box .mm-choose-btn,.mm-modal-box #mm-reupload-btn,.mm-modal-box #mm-confirm-btn,.mm-wizard-next,.mm-wizard-back { border-radius: 8px !important; }
      .product-form__buttons { margin-bottom: 24px !important; }
      #mm-wrapper { width: 100%; }

      .mm-trust-points { padding: 4px 0 16px; margin-top: -20px; }
      .mm-tp-item { display:flex; align-items:flex-start; gap:10px; padding:5px 0; font-size:14px; line-height:1.5; color:#6B5E54; }
      .mm-tp-check { flex-shrink:0; width:20px; height:20px; background:\${accentColor}; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-top:1px; }
      .mm-tp-check svg { width:12px; height:12px; fill:none; stroke:#fff; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
      .mm-tp-item strong { font-weight:600; color:#1A1612; }
      #mm-upload-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:14px; font-size:15px; font-weight:700; border:none; background:\${accentColor}; color:#fff; cursor:pointer; transition:opacity .2s; margin-bottom:0; }
      #mm-upload-btn:hover { opacity:0.9; }
      #mm-upload-btn svg { flex-shrink:0; }
      #mm-upload-btn.mm-selected { background:#065f46; border:2px solid #065f46; color:#fff; }
      .mm-free-tag { background:#C8956C; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px; letter-spacing:.5px; text-transform:uppercase; line-height:1.3; flex-shrink:0; }


      .mm-social-proof { text-align:center; margin-top:8px; margin-bottom:8px; font-size:12px; color:#aaa; }
      .mm-mini-steps { display:flex; align-items:flex-start; gap:0; padding:16px 0; margin-bottom:16px; }
      .mm-mini-step { flex:1; text-align:center; position:relative; }
      .mm-mini-step-num { width:28px; height:28px; background:\${accentColor}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; margin:0 auto 6px; }
      .mm-mini-step-label { font-size:11px; color:#6B5E54; line-height:1.35; font-weight:500; }
      .mm-mini-step:not(:last-child)::after { content:""; position:absolute; top:14px; right:-2px; width:16px; height:1px; background:#C8956C; }
      .mm-step-arrow { display:none; }
      .mm-wizard-next { margin-top:12px; margin-bottom:16px; display:block; width:100%; padding:14px; font-size:15px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; border:none; background:\${accentColor}; color:#fff; cursor:pointer; text-align:center; }
      .mm-wizard-back { margin-bottom:12px; display:block; width:100%; padding:10px; font-size:14px; font-weight:600; border:1px solid #ccc; background:#fff; color:#1A1612; cursor:pointer; text-align:center; }
      .mm-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9999; display:none; align-items:center; justify-content:center; padding:16px; }
      .mm-modal-box { background:#fff; border-radius:12px; max-width:1240px; width:96%; max-height:90vh; overflow-y:auto; padding:42px 52px; position:relative; }
      .mm-modal-close-btn { position:absolute; top:12px; right:16px; background:none; border:none; font-size:28px; color:#999; cursor:pointer; line-height:1; }
      .mm-modal-title { font-family:'Playfair Display', Georgia, serif; font-size:26px; font-weight:700; color:#1A1612; text-align:center; margin-bottom:26px; }
      .mm-modal-desc { text-align:center; color:#6B5E54; font-size:14px; line-height:1.6; margin-bottom:20px; }
      .mm-photo-tips { background:#F9F6F2; border-radius:8px; padding:16px 20px; margin-bottom:20px; }
      .mm-photo-tips-title { font-size:14px; font-weight:600; color:#1A1612; margin-bottom:8px; }
      .mm-photo-tips ul { list-style:none; padding:0; margin:0; }
      .mm-photo-tips li { font-size:13px; color:#6B5E54; padding:3px 0; padding-left:20px; position:relative; line-height:1.5; }
      .mm-photo-tips li::before { content:"•"; position:absolute; left:6px; color:#4A6B4A; font-weight:700; }
      .mm-choose-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:14px; font-size:15px; font-weight:700; border:none; background:\${accentColor}; color:#fff; cursor:pointer; border-radius:8px; }
      .mm-choose-btn svg { flex-shrink:0; }

      #mm-images-row { display:flex; align-items:center; justify-content:space-between; gap:36px; margin-bottom:20px; }
      .mm-img-col { flex:0 0 300px; text-align:center; }
      .mm-img-col img { width:300px; max-width:300px; max-height:300px; object-fit:contain; border-radius:8px; display:block; margin:0 auto; }
      .mm-left-stack { flex:0 0 300px; display:flex; flex-direction:column; align-items:center; }
      .mm-upload-progress-wrap { width:100%; max-width:300px; margin:14px auto 18px; text-align:center; }
      .mm-upload-progress-text { font-size:13px; color:#6B5E54; margin-bottom:8px; }
      .mm-upload-progress-track { width:100%; height:4px; background:#eee; border-radius:999px; overflow:hidden; }
      .mm-upload-progress-fill { height:100%; background:#4A6B4A; width:0%; transition:width .3s; }
      .mm-middle-stack { flex:0 0 300px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; }
      .mm-preview-bridge { width:100%; max-width:300px; margin:0 auto; text-align:center; }
      .mm-preview-bridge-line { margin:0 auto; font-size:15px; line-height:1.65; color:#6B5E54; text-align:center; }
      .mm-preview-bridge-line-mobile { display:none; }
      .mm-arrow-col { padding:0; text-align:center; }
      .mm-arrow-col svg { width:40px; height:40px; }
      .mm-label { display:block; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#999; margin-bottom:8px; }
      #mm-result-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:220px; }
      #mm-spinner { width:32px; height:32px; border:3px solid #eee; border-top-color:#4A6B4A; border-radius:50%; animation:mm-spin .8s linear infinite; margin-bottom:12px; }
      @keyframes mm-spin { to { transform:rotate(360deg); } }
      #mm-status-text { font-size:13px; color:#6B5E54; margin-bottom:4px; text-align:center; }
      #mm-status-sub { font-size:11px; color:#aaa; margin-bottom:8px; text-align:center; }
      #mm-progress-track { width:80%; height:4px; background:#eee; border-radius:2px; overflow:hidden; }
      #mm-progress-fill { height:100%; background:#4A6B4A; width:0%; transition:width .3s; }
      .mm-modal-actions { display:flex; justify-content:center; gap:16px; margin-top:22px; }
      .mm-modal-actions button { flex:0 0 auto; width:320px; max-width:42%; padding:14px 24px; font-size:14px; font-weight:600; border-radius:8px; cursor:pointer; }
      #mm-reupload-btn { background:#fff; border:1px solid #ccc; color:#1A1612; }
      #mm-confirm-btn { background:\${accentColor}; border:none; color:#fff; }
      #mm-msg { text-align:center; padding:8px; border-radius:6px; font-size:13px; margin-top:8px; display:none; }
      #mm-msg.mm-err { background:#FEE; color:#C00; }
      #mm-msg.mm-ok { background:#EFE; color:#060; }
      .mm-login-link { display:block; text-align:center; margin-top:12px; font-size:13px; color:#6B5E54; }
      body.mm-modal-open .shopify-section-template--popup,
      body.mm-modal-open [id*="PopupModal"],
      body.mm-modal-open [id*="popup-modal"],
      body.mm-modal-open .shopify-block[data-type*="popup"] { display:none !important; visibility:hidden !important; pointer-events:none !important; }
      @media(max-width:768px) {
        .mm-modal-overlay { padding:0; }
        .mm-modal-box { max-width:100%; max-height:100%; width:100%; height:100%; border-radius:0; padding:20px; padding-top:24px; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; justify-content:center; }
        .mm-modal-box.mm-processing { justify-content:flex-start; }
        .mm-modal-close-btn { position:fixed; top:12px; right:16px; z-index:10001; background:rgba(255,255,255,.9); width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 2px 8px rgba(0,0,0,.15); }
        #mm-images-row { flex-direction:column; gap:6px; margin-bottom:16px; }
        .mm-img-col { flex:1; text-align:center; }
        .mm-img-col img { width:auto; max-width:90%; max-height:none; }
        .mm-left-stack { width:100%; display:flex; flex-direction:column; align-items:center; }
        .mm-img-col:first-child img { max-height:35vh; width:auto; max-width:80%; object-fit:contain; margin:0 auto; display:block; border-radius:6px; }
        .mm-upload-progress-wrap { max-width:80%; margin:12px auto 14px; }
        .mm-upload-progress-text { font-size:12px; margin-bottom:6px; }
        .mm-middle-stack { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; }
        .mm-preview-bridge { max-width:100%; padding:0 14px; margin:14px auto 6px; }
        .mm-preview-bridge-line { font-size:11px; line-height:1.45; }
        .mm-preview-bridge-line-desktop { display:none; }
        .mm-preview-bridge-line-mobile { display:block; }
        .mm-img-col:last-child img { max-height:38vh; width:auto; max-width:90%; object-fit:contain; margin:0 auto; display:block; border-radius:8px; }
        #mm-result-loading { min-height:20vh; max-height:28vh; }
        .mm-arrow-col { padding:6px 0; text-align:center; }
        .mm-arrow-col svg { transform:rotate(90deg); width:30px; height:30px; }
        .mm-label { font-size:10px; margin-bottom:3px; }
        .mm-tp-item { font-size:13px; }
        .mm-mini-steps { padding:10px 4px; }
        .mm-mini-step-num { width:24px; height:24px; font-size:11px; }
        .mm-mini-step-label { font-size:10px; }
        .mm-mini-step:not(:last-child)::after { display:none; }
        .mm-mini-step .mm-step-arrow { display:block; position:absolute; top:10px; right:-4px; color:#C8956C; font-size:12px; line-height:1; }
      }
    </style>
    <div id="mm-root">
      <div class="mm-trust-points">
        <div class="mm-tp-item"><div class="mm-tp-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><span><strong>Upload a photo, see your pet as a sculpted portrait · FREE</strong></span></div>
        <div class="mm-tp-item"><div class="mm-tp-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><span><strong>Not happy? Try another photo · no limit, no commitment</strong></span></div>
        <div class="mm-tp-item"><div class="mm-tp-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><span><strong>Love it? We'll craft it into a High-relief keepsake</strong></span></div>
        <div class="mm-tp-item"><div class="mm-tp-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><span><strong>Every piece is designer-reviewed before production</strong></span></div>
      </div>
      <div id="mm-wrapper">
        <button type="button" id="mm-upload-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          \${buttonLabel}
          <span class="mm-free-tag">FREE PREVIEW</span>
        </button>
        <input type="file" id="mm-file-input" accept="image/jpeg,image/png,image/webp" style="display:none" />
      </div>
      <div class="mm-social-proof">Join hundreds of pet parents who tried it</div>
      <div class="mm-mini-steps">
        <div class="mm-mini-step"><div class="mm-mini-step-num">1</div><div class="mm-mini-step-label">Upload<br>Photo</div><span class="mm-step-arrow">›</span></div>
        <div class="mm-mini-step"><div class="mm-mini-step-num">2</div><div class="mm-mini-step-label">Preview<br>Design</div><span class="mm-step-arrow">›</span></div>
        <div class="mm-mini-step"><div class="mm-mini-step-num">3</div><div class="mm-mini-step-label">Choose<br>Color</div><span class="mm-step-arrow">›</span></div>
        <div class="mm-mini-step"><div class="mm-mini-step-num">4</div><div class="mm-mini-step-label">Place<br>Order</div></div>
      </div>
      <div id="mm-next-wrap" style="display:none"><button type="button" id="mm-wizard-next" class="mm-wizard-next">Next: Choose Leather Color <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:4px"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div>
      <div id="mm-back-wrap" style="display:none"><button type="button" id="mm-wizard-back" class="mm-wizard-back"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="15 18 9 12 15 6"></polyline></svg> Back to Design</button></div>
    </div>
    <div id="mm-modal" class="mm-modal-overlay">
      <div class="mm-modal-box">
        <button type="button" id="mm-modal-close" class="mm-modal-close-btn">&times;</button>
        <div id="mm-step-upload">
          <h2 class="mm-modal-title">Preview Your Custom Design</h2>
          <div class="mm-photo-tips">
            <div class="mm-photo-tips-title">📸 Photo tips for best results:</div>
            <ul>
              <li>One pet per photo works best</li>
              <li>Clear, front-facing with good lighting</li>
              <li>Pet's face should be the main focus</li>
            </ul>
          </div>
          <button type="button" id="mm-choose-btn" class="mm-choose-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>Generate My Free Preview</button>

        </div>
        <div id="mm-step-process" style="display:none">
          <h2 class="mm-modal-title">Preview Your Custom Design</h2>
          <div id="mm-images-row">
            <div class="mm-left-stack">
              <div class="mm-img-col">
                <span class="mm-label">YOUR PHOTO</span>
                <img id="mm-preview-img" alt="Original" />
              </div>
              <div id="mm-upload-progress-wrap" class="mm-upload-progress-wrap">
                <div id="mm-upload-progress-text" class="mm-upload-progress-text">Uploading your photo...</div>
                <div class="mm-upload-progress-track"><div id="mm-upload-progress-fill" class="mm-upload-progress-fill"></div></div>
              </div>
            </div>
            <div class="mm-middle-stack">
              <div class="mm-preview-bridge">
                <p class="mm-preview-bridge-line mm-preview-bridge-line-desktop">This is a style preview — your final piece will be a handcrafted raised-relief leather keychain. Your generated preview will appear to the right.</p>
                <p class="mm-preview-bridge-line mm-preview-bridge-line-mobile">This is a style preview — your final piece will be a handcrafted raised-relief leather keychain. Your generated preview will appear below.</p>
              </div>
              <div class="mm-arrow-col">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2B473F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
            <div class="mm-img-col">
              <span class="mm-label">YOUR DESIGN</span>
              <div id="mm-result-loading">
                <div id="mm-spinner"></div>
                <p id="mm-status-text">Creating your free preview...</p>
                <p id="mm-status-sub">This usually takes 20-30 seconds</p>
                <div id="mm-progress-track"><div id="mm-progress-fill"></div></div>
              </div>
              <img id="mm-result-img" alt="Design Preview" style="display:none" />
            </div>
          </div>
          <div id="mm-msg"></div>
          <div class="mm-modal-actions">
            <button type="button" id="mm-reupload-btn" style="display:none">Try Again</button>
            <button type="button" id="mm-confirm-btn" style="display:none">Use This Design</button>
          </div>
        </div>
        <div id="mm-step-register" style="display:none">
          <p class="mm-modal-desc">You have used your free designs. Create an account to get more!</p>
          <a href="/account/register" class="mm-choose-btn" style="text-decoration:none;text-align:center">Create Free Account</a>
          <a href="/account/login" class="mm-login-link">Already have an account? Log in</a>
        </div>
      </div>
    </div>\`;

  const fileInput = root.querySelector("#mm-file-input");
  const uploadBtn = root.querySelector("#mm-upload-btn");
  const chooseBtn = root.querySelector("#mm-choose-btn");
  const modal = root.querySelector("#mm-modal");
  const modalClose = root.querySelector("#mm-modal-close");
  const stepUpload = root.querySelector("#mm-step-upload");
  const stepProcess = root.querySelector("#mm-step-process");
  const stepRegister = root.querySelector("#mm-step-register");
  const previewImg = root.querySelector("#mm-preview-img");
  const resultImg = root.querySelector("#mm-result-img");
  const resultLoading = root.querySelector("#mm-result-loading");
  const resultMsg = root.querySelector("#mm-msg");
  const reuploadBtn = root.querySelector("#mm-reupload-btn");
  const confirmBtn = root.querySelector("#mm-confirm-btn");
  const progressFill = root.querySelector("#mm-progress-fill");
  const uploadProgressFill = root.querySelector("#mm-upload-progress-fill");
  const uploadProgressWrap = root.querySelector("#mm-upload-progress-wrap");
  const statusText = root.querySelector("#mm-status-text");
  const statusSub = root.querySelector("#mm-status-sub");
  const nextWrap = root.querySelector("#mm-next-wrap");
  const nextBtn = root.querySelector("#mm-wizard-next");
  const backWrap = root.querySelector("#mm-back-wrap");
  const backBtn = root.querySelector("#mm-wizard-back");

  let resultUrl = "";
  let currentGenerationId = "";
  let fakeTimer = null;
  let fakeProgress = 0;

  function setMessage(text, kind) {
    resultMsg.textContent = text;
    resultMsg.className = kind === "err" ? "mm-err" : "mm-ok";
    resultMsg.style.display = "block";
  }

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

  function openModal() {
    document.body.classList.add("mm-modal-open");
    document.body.style.overflow = "hidden";
    modal.style.display = "flex";
  }

  function closeModal() {
    modal.style.display = "none";
    document.body.classList.remove("mm-modal-open");
    document.body.style.overflow = "";
  }

  function setStep(step) {
    if (step === 1) {
      root.querySelector("#mm-root").style.display = "";
      nextWrap.style.display = resultUrl ? "block" : "none";
      backWrap.style.display = "none";
      if (variantPicker) variantPicker.style.display = "none";
      if (cartArea && cartArea !== form) cartArea.style.display = "none";
    } else {
      root.querySelector("#mm-root").style.display = "none";
      nextWrap.style.display = "none";
      backWrap.style.display = "block";
      if (variantPicker) variantPicker.style.display = "";
      if (cartArea && cartArea !== form) cartArea.style.display = "";
    }
  }

  function resetProcess() {
    stepUpload.style.display = "block";
    stepProcess.style.display = "none";
    if (stepRegister) stepRegister.style.display = "none";
    resultImg.style.display = "none";
    resultLoading.style.display = "flex";
    resultMsg.style.display = "none";
    reuploadBtn.style.display = "none";
    confirmBtn.style.display = "none";
    progressFill.style.width = "0%";
    uploadProgressFill.style.width = "0%";
    uploadProgressWrap.style.display = "block";
    statusText.textContent = "Creating your free preview...";
    statusSub.textContent = "This usually takes 20-30 seconds";
    resultUrl = "";
    currentGenerationId = "";
    if (fakeTimer) clearInterval(fakeTimer);
    fakeProgress = 0;
  }

  function startFakeProgress() {
    if (fakeTimer) clearInterval(fakeTimer);
    fakeTimer = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + 5, 92);
      progressFill.style.width = fakeProgress + "%";
      if (fakeProgress < 30) {
        statusText.textContent = "Creating your free preview...";
        statusSub.style.display = "";
        statusSub.textContent = "This usually takes 20-30 seconds";
      } else if (fakeProgress < 60) {
        statusText.textContent = "Sculpting your pet's portrait...";
        statusSub.style.display = "none";
      } else {
        statusText.textContent = "Adding final details...";
        statusSub.style.display = "none";
      }
    }, 500);
  }

  function stopFakeProgress() {
    if (fakeTimer) clearInterval(fakeTimer);
    progressFill.style.width = "100%";
    statusText.textContent = "Preview ready";
    statusSub.style.display = "";
    statusSub.textContent = "Review your design, then use it to unlock color selection";
  }

  async function readJsonResponse(response) {
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        throw new Error("API returned invalid JSON.");
      }
    }

    const preview = text.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim().slice(0, 160);
    throw new Error("API returned " + response.status + " " + response.statusText + (preview ? ": " + preview : ""));
  }


  async function generateFromFile(file) {
    stepUpload.style.display = "none";
    stepProcess.style.display = "block";
    previewImg.src = URL.createObjectURL(file);
    uploadProgressFill.style.width = "35%";

    const payload = new FormData();
    payload.append("file", file);
    payload.append("shopDomain", config.shopDomain);
    payload.append("productId", config.productId);
    payload.append("productTitle", config.productTitle);
    payload.append("productType", config.productType);
    payload.append("variantId", config.variantId);

    startFakeProgress();
    const response = await fetch(apiBase + "/api/generate", { method: "POST", body: payload });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || "Generation failed");

    uploadProgressFill.style.width = "100%";
    uploadProgressWrap.style.display = "none";
    stopFakeProgress();

    resultImg.src = data.outputImageUrl;
    resultImg.style.display = "block";
    resultLoading.style.display = "none";
    reuploadBtn.style.display = "inline-block";
    confirmBtn.style.display = "inline-block";
    resultUrl = data.outputImageUrl;
    currentGenerationId = data.generationId;

    upsertHiddenInput("properties[_AI Generation ID]", data.generationId);
    upsertHiddenInput("properties[_AI Preview URL]", data.outputImageUrl);
    upsertHiddenInput("properties[_AI Model]", data.modelUsed);
    upsertHiddenInput("properties[_AI Prompt]", data.promptUsed);
    upsertHiddenInput("properties[_AI Design Confirmed]", "no");
    upsertHiddenInput("properties[_AI Design Confirmed At]", "");

    if (!isLoggedIn()) addGenCount();
  }

  uploadBtn.addEventListener("click", () => {
    if (!isLoggedIn() && getGenCount() >= 3) {
      stepUpload.style.display = "none";
      stepProcess.style.display = "none";
      if (stepRegister) stepRegister.style.display = "block";
      openModal();
      return;
    }
    resetProcess();
    openModal();
  });

  chooseBtn.addEventListener("click", () => fileInput.click());
  modalClose.addEventListener("click", closeModal);
  reuploadBtn.addEventListener("click", () => {
    if (!isLoggedIn() && getGenCount() >= 3) {
      stepProcess.style.display = "none";
      if (stepRegister) stepRegister.style.display = "block";
      return;
    }
    resetProcess();
    fileInput.click();
  });
  nextBtn.addEventListener("click", () => setStep(2));
  backBtn.addEventListener("click", () => setStep(1));

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      await generateFromFile(file);
    } catch (error) {
      if (fakeTimer) clearInterval(fakeTimer);
      setMessage(error?.message || "Upload failed", "err");
      reuploadBtn.style.display = "inline-block";
    }
  });

  confirmBtn.addEventListener("click", async () => {
    try {
      confirmBtn.setAttribute("disabled", "disabled");
      confirmBtn.style.opacity = "0.7";
      const response = await fetch(apiBase + "/api/generate/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: currentGenerationId,
          shopDomain: config.shopDomain,
        }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || "Failed to confirm design");

      upsertHiddenInput("properties[_AI Design Confirmed]", "yes");
      upsertHiddenInput("properties[_AI Design Confirmed At]", data.designConfirmedAt || "");
      if (config.requireGeneration && addToCartButton) setButtonLocked(false);
      closeModal();
      if (hiddenMaterialUrl) hiddenMaterialUrl.value = resultUrl;
      uploadBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Design Selected';
      uploadBtn.classList.add("mm-selected");
      nextBtn.innerHTML = 'Next: Choose Leather Color <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:4px"><polyline points="9 18 15 12 9 6"></polyline></svg>';

      nextWrap.style.display = "block";
    } catch (error) {
      setMessage(error?.message || "Failed to confirm design", "err");
    } finally {
      confirmBtn.removeAttribute("disabled");
      confirmBtn.style.opacity = "1";
    }
  });


  setStep(1);
})();
  `.trim();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
