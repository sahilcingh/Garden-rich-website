function showCounter(btn) {
  if (typeof IS_LOGGED_IN !== "undefined" && !IS_LOGGED_IN) {
    window.location.href = "/login";
    return;
  }

  const parent = btn.closest(".product");
  const productId = parent.getAttribute("data-id");
  const variantId = parent.getAttribute("data-variant-id");
  const counter = parent.querySelector(".counter-control");
  const qtySpan = parent.querySelector(".qty-text");
  const stock = parseInt(parent.getAttribute("data-stock") || "99");

  if (stock === 0) return;

  btn.classList.add("hidden");
  counter.classList.remove("hidden");
  counter.classList.add("flex");
  qtySpan.innerText = "1";

  fetch("/cart/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, variantId }),
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        counter.classList.add("hidden");
        counter.classList.remove("flex");
        btn.classList.remove("hidden");
        parent.setAttribute("data-stock", "0");
        const outOfStockBtn = parent.querySelector(".out-of-stock-btn");
        if (outOfStockBtn) {
          outOfStockBtn.classList.remove("hidden");
          btn.classList.add("hidden");
        }
        showStockPopup(0);
        return;
      }
      updateBadge(data.totalItems);
    })
    .catch((err) => {
      console.error("Cart add failed:", err);
      counter.classList.add("hidden");
      counter.classList.remove("flex");
      btn.classList.remove("hidden");
    });
}

function updateQty(btn, change) {
  const parent = btn.closest(".product");
  const productId = parent.getAttribute("data-id");
  const variantId = parent.getAttribute("data-variant-id");
  const qtySpan = parent.querySelector(".qty-text");
  const stock = parseInt(parent.getAttribute("data-stock") || "99");
  let currentQty = parseInt(qtySpan.innerText);

  if (change > 0 && stock === 0) {
    showStockPopup(0);
    return;
  }

  if (change > 0 && currentQty >= stock) {
    showStockPopup(stock);
    return;
  }

  currentQty += change;

  if (currentQty < 1) {
    parent.querySelector(".counter-control").classList.add("hidden");
    parent.querySelector(".counter-control").classList.remove("flex");
    parent.querySelector(".add-btn").classList.remove("hidden");
    currentQty = 0;
  } else {
    qtySpan.innerText = currentQty;
  }

  updateCartOnServer(productId, variantId, currentQty);
}

function showStockPopup(stock) {
  const existing = document.getElementById("stockPopup");
  if (existing) existing.remove();

  const msg =
    stock === 0
      ? "This item is out of stock."
      : `Only ${stock} item${stock === 1 ? "" : "s"} available in stock.`;

  const popup = document.createElement("div");
  popup.id = "stockPopup";
  popup.className =
    "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3";
  popup.innerHTML = `
    <svg class="w-5 h-5 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
    ${msg}
  `;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.transition = "opacity 0.3s ease";
    setTimeout(() => popup.remove(), 300);
  }, 2500);
}

function updateCartQty(btn, change) {
  const itemContainer = btn.closest(".cart-item");
  if (!itemContainer) return;

  const productId  = itemContainer.getAttribute("data-id");
  const variantId  = itemContainer.getAttribute("data-variant-id");
  const qtySpan    = itemContainer.querySelector(".qty-text");
  const price      = parseFloat(itemContainer.getAttribute("data-price"));
  const stock      = parseInt(itemContainer.getAttribute("data-stock") || "99");

  let currentQty = parseInt(qtySpan.innerText);

  if (change > 0 && stock === 0) {
    showStockPopup(0);
    return;
  }

  if (change > 0 && currentQty >= stock) {
    showStockPopup(stock);
    return;
  }

  currentQty += change;
  if (currentQty < 0) return;

  if (currentQty === 0) {
    itemContainer.style.opacity = "0";
    itemContainer.style.transform = "scale(0.95)";
    itemContainer.style.transition = "all 0.2s ease";
    setTimeout(() => {
      // Use variantId for summary row (each variant has its own row)
      const summaryRow = document.getElementById(`summary-row-${variantId}`);
      if (summaryRow) {
        summaryRow.style.opacity = "0";
        summaryRow.style.transition = "opacity 0.2s ease";
        setTimeout(() => summaryRow.remove(), 200);
      }
      itemContainer.remove();
      updateOrderSummary();
      checkEmptyCart();
    }, 200);
  } else {
    qtySpan.innerText = currentQty;

    const subtotalEl = itemContainer.querySelector(".item-subtotal");
    if (subtotalEl)
      subtotalEl.textContent = "Rs. " + (price * currentQty).toLocaleString("en-IN");

    const summaryQty = document.querySelector(`#summary-row-${variantId} .summary-item-qty`);
    if (summaryQty) summaryQty.textContent = "×" + currentQty;

    const summaryLine = document.querySelector(`.summary-item-total[data-id="${variantId}"]`);
    if (summaryLine)
      summaryLine.textContent = "Rs. " + (price * currentQty).toLocaleString("en-IN");

    updateOrderSummary();
  }

  updateCartOnServer(productId, variantId, currentQty);
}

async function updateCartOnServer(productId, variantId, quantity) {
  try {
    const response = await fetch("/cart/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, variantId, quantity }),
    });
    const data = await response.json();
    updateBadge(data.totalItems);
  } catch (err) {
    console.error("Cart update failed:", err);
  }
}

function updateBadge(totalItems) {
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  badge.innerText = totalItems;
  totalItems === 0 ? badge.classList.add("hidden") : badge.classList.remove("hidden");
  badge.classList.add("scale-110");
  setTimeout(() => badge.classList.remove("scale-110"), 200);
}

// ── Cart summary helpers ──────────────────────────────────────
function getCartSubtotal() {
  let subtotal = 0;
  document.querySelectorAll(".cart-item").forEach((item) => {
    const price = parseFloat(item.getAttribute("data-price"));
    const qty = parseInt(item.querySelector(".qty-text")?.innerText || 0);
    if (!isNaN(price) && !isNaN(qty)) subtotal += price * qty;
  });
  return subtotal;
}

function getAnchor() {
  return document.getElementById("shippingCostValue");
}

function getAppliedDiscount() {
  const el = document.getElementById("discountAmount");
  if (!el || el.closest("#discountRow")?.classList.contains("hidden")) return 0;
  // BUG FIX: "Rs. 104" — the dot in "Rs." was kept by [^0-9.] regex → ".104" → parsed as 0.104
  // Fix: only keep digits, no dot
  const raw = el.textContent.replace(/[^0-9]/g, "");
  return parseFloat(raw) || 0;
}

// ── Master recalc ─────────────────────────────────────────────
function updateOrderSummary() {
  const anchor    = getAnchor();
  const baseShip  = anchor ? parseFloat(anchor.getAttribute("data-base-shipping") || 0) : 0;
  const freeAbove = anchor ? parseFloat(anchor.getAttribute("data-free-above") || 0) : 0;
  const minOrder  = anchor ? parseFloat(anchor.getAttribute("data-min-order") || 0) : 0;

  const subtotal  = getCartSubtotal();
  const discount  = getAppliedDiscount();

  const shipping  = (freeAbove > 0 && subtotal >= freeAbove) ? 0 : baseShip;
  const total     = Math.max(0, subtotal + shipping - discount);

  // 1. Subtotal & final total
  const subtotalEl = document.getElementById("summaryOrderTotal");
  if (subtotalEl) subtotalEl.innerText = "Rs. " + subtotal.toLocaleString("en-IN");

  const finalEl = document.getElementById("summaryFinalTotal");
  if (finalEl) finalEl.innerText = "Rs. " + total.toLocaleString("en-IN");

  // 2. Shipping line
  const shippingDisplay = document.getElementById("shippingDisplay");
  if (shippingDisplay) {
    if (shipping === 0) {
      shippingDisplay.textContent = "FREE";
      shippingDisplay.className = "font-black text-green-600";
    } else {
      shippingDisplay.textContent = "Rs. " + shipping.toLocaleString("en-IN");
      shippingDisplay.className = "font-black text-zinc-900";
    }
  }

  // 3. Free shipping progress bar & unlocked banner
  if (freeAbove > 0) {
    const progressPanel  = document.getElementById("freeShippingProgress");
    const unlockedBanner = document.getElementById("freeShippingUnlocked");
    const bar            = document.getElementById("freeShippingBar");
    const amountEl       = document.getElementById("freeShippingAmount");
    const counterEl      = document.getElementById("freeShippingCounter");

    if (subtotal >= freeAbove) {
      if (progressPanel)  progressPanel.classList.add("hidden");
      if (unlockedBanner) unlockedBanner.classList.remove("hidden");
    } else {
      if (progressPanel)  progressPanel.classList.remove("hidden");
      if (unlockedBanner) unlockedBanner.classList.add("hidden");

      const gap = freeAbove - subtotal;
      const pct = Math.min(100, (subtotal / freeAbove) * 100).toFixed(1);

      if (bar)       bar.style.width = pct + "%";
      if (amountEl)  amountEl.textContent = "Rs. " + gap.toLocaleString("en-IN");
      if (counterEl) counterEl.textContent =
        "Rs. " + subtotal.toLocaleString("en-IN") + " / Rs. " + freeAbove.toLocaleString("en-IN");
    }
  }

  // 4. Min order warning & checkout button
  const minWarning  = document.getElementById("minOrderWarning");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (minOrder > 0) {
    const belowMin = subtotal < minOrder;
    if (minWarning)  minWarning.classList.toggle("hidden", !belowMin);
    if (checkoutBtn) {
      checkoutBtn.disabled = belowMin;
      if (belowMin) {
        checkoutBtn.textContent = "Min. Order Rs. " + minOrder.toLocaleString("en-IN");
        checkoutBtn.className = "w-full py-4 rounded-xl font-black mt-6 uppercase tracking-widest text-sm bg-zinc-300 text-zinc-500 cursor-not-allowed";
      } else {
        checkoutBtn.textContent = "Proceed to Checkout";
        checkoutBtn.className = "w-full py-4 rounded-xl font-black mt-6 uppercase tracking-widest text-sm transition-all bg-green-700 hover:bg-green-800 text-white shadow-lg shadow-green-100 active:scale-95";
      }
    }
  }
}

function checkEmptyCart() {
  const items = document.querySelectorAll(".cart-item");
  const countEl = document.getElementById("cartItemCount");
  if (countEl) countEl.textContent = `(${items.length} Items)`;

  if (items.length === 0) {
    const container = document.getElementById("cartPageContainer");
    if (container) {
      container.className =
        "flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-zinc-200 text-center";
      container.innerHTML = `
        <div class="inline-flex items-center justify-center w-24 h-24 bg-zinc-100 rounded-full mb-6">
          <svg class="w-12 h-12 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
        </div>
        <h2 class="text-2xl font-black text-zinc-900 mb-2">Your cart is empty</h2>
        <p class="text-zinc-400 font-medium mb-8 max-w-xs">Looks like you removed everything.</p>
        <a href="/" class="inline-block bg-green-600 hover:bg-green-700 text-white font-black py-4 px-10 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-sm shadow-lg shadow-green-100">
          Browse Products
        </a>`;
    }
    updateBadge(0);
  }
}

function toggleUserMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById("userMenu");
  if (menu) menu.classList.toggle("hidden");
}

document.addEventListener("click", function (e) {
  const menu = document.getElementById("userMenu");
  const button = document.getElementById("userButton");
  if (menu && button && !menu.contains(e.target) && !button.contains(e.target)) {
    menu.classList.add("hidden");
  }
});

// ── Delete modal ──────────────────────────────────────────────
function confirmDelete(productId, imageUrl) {
  document.getElementById("deleteProductId").value = productId;
  document.getElementById("deleteImageUrl").value = imageUrl;
  const modal = document.getElementById("deleteModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeDeleteModal() {
  const modal = document.getElementById("deleteModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function confirmDeleteAction() {
  const productId = document.getElementById("deleteProductId").value;
  const imageUrl = document.getElementById("deleteImageUrl").value;
  closeDeleteModal();

  try {
    const response = await fetch(`/admin/delete-product/${productId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });

    if (response.ok) {
      const card = document.querySelector(`[data-id="${productId}"]`);
      if (card) {
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";
        card.style.transition = "all 0.3s ease";
        setTimeout(() => card.remove(), 300);
      }
      showToast("Product deleted successfully!", "green");
    } else {
      const errorData = await response.json();
      showToast("Error: " + errorData.error, "red");
    }
  } catch (err) {
    showToast("Server communication error.", "red");
  }
}

// ── Edit modal ────────────────────────────────────────────────
async function openEditModal(productId) {
  document.getElementById("editProductId").value = productId;

  const card = document.querySelector(`[data-id="${productId}"]`);
  document.getElementById("editName").value = card.getAttribute("data-name") || "";
  document.getElementById("editCategory").value = card.getAttribute("data-category") || "";

  const preview = document.getElementById("editImagePreview");
  preview.classList.add("hidden");

  const imageInput = document.getElementById("editImage");
  const newInput = imageInput.cloneNode(true);
  imageInput.parentNode.replaceChild(newInput, imageInput);
  newInput.addEventListener("change", function () {
    if (this.files[0]) {
      preview.src = URL.createObjectURL(this.files[0]);
      preview.classList.remove("hidden");
    }
  });

  const newRows = document.getElementById("newVariantRows");
  if (newRows) newRows.innerHTML = "";

  const variantRowsEl = document.getElementById("editVariantStocks");
  variantRowsEl.innerHTML = `
    <div class="flex items-center justify-center py-4 gap-2 text-zinc-400">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      <span class="text-xs font-bold">Loading variants...</span>
    </div>`;

  try {
    const res = await fetch(`/admin/product-variants/${productId}`);
    const data = await res.json();
    const variants = data.variants || [];

    if (variants.length === 0) {
      variantRowsEl.innerHTML = `<p class="text-xs text-zinc-400 text-center py-3">No variants found.</p>`;
    } else {
      variantRowsEl.innerHTML = variants.map((v) => `
        <div class="existing-variant-row grid grid-cols-12 gap-2 items-center bg-zinc-50 rounded-xl p-3 border border-zinc-100">
          <div class="col-span-3">
            <p class="text-xs font-black text-zinc-700 bg-zinc-100 px-2 py-2 rounded-lg text-center truncate">${v.weight}</p>
          </div>
          <div class="col-span-3">
            <div class="relative">
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400">₹</span>
              <input type="number" class="variant-price-input w-full bg-white border border-zinc-200 p-2 pl-5 rounded-lg focus:outline-none focus:border-green-500 text-xs font-bold transition-all"
                data-variant-id="${v.id}" value="${v.price ?? ''}" min="0" placeholder="Price">
            </div>
          </div>
          <div class="col-span-3">
            <div class="relative">
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400">₹</span>
              <input type="number" class="variant-mrp-input w-full bg-white border border-zinc-200 p-2 pl-5 rounded-lg focus:outline-none focus:border-green-500 text-xs font-bold transition-all"
                data-variant-id="${v.id}" value="${v.mrp ?? ''}" min="0" placeholder="MRP">
            </div>
          </div>
          <div class="col-span-2">
            <input type="number" class="variant-stock-input w-full bg-white border border-zinc-200 p-2 rounded-lg focus:outline-none focus:border-green-500 text-xs font-bold transition-all text-center"
              data-variant-id="${v.id}" value="${v.stock ?? 0}" min="0" placeholder="Stock">
          </div>
          <div class="col-span-1 flex justify-center">
            <button type="button" onclick="removeExistingVariant(this, '${v.id}')"
              class="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-all">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      `).join("");
    }
  } catch (err) {
    variantRowsEl.innerHTML = `<p class="text-xs text-red-400 text-center py-3">Failed to load variants.</p>`;
  }

  const modal = document.getElementById("editModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function addNewVariantRow() {
  const container = document.getElementById("newVariantRows");
  const row = document.createElement("div");
  row.className = "new-variant-row grid grid-cols-12 gap-2 items-center bg-green-50 rounded-xl p-3 border border-green-100";
  row.innerHTML = `
    <div class="col-span-3">
      <div class="grid grid-cols-2 gap-1">
        <input type="number" class="new-variant-qty w-full bg-white border border-zinc-200 p-2 rounded-lg focus:outline-none focus:border-green-500 text-xs font-bold text-center" placeholder="500" min="0">
        <select class="new-variant-unit w-full bg-white border border-zinc-200 p-2 rounded-lg focus:outline-none focus:border-green-500 text-xs font-bold appearance-none cursor-pointer">
          <option>ml</option><option>L</option><option>g</option><option>kg</option>
          <option>pcs</option><option>dozen</option><option>pack</option>
          <option>bottle</option><option>box</option><option>pouch</option>
        </select>
      </div>
    </div>
    <div class="col-span-3"><div class="relative"><span class="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400">₹</span>
      <input type="number" class="new-variant-price w-full bg-white border border-zinc-200 p-2 pl-5 rounded-lg focus:outline-none focus:border-green-500 text-xs font-bold" placeholder="Price" min="0">
    </div></div>
    <div class="col-span-3"><div class="relative"><span class="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400">₹</span>
      <input type="number" class="new-variant-mrp w-full bg-white border border-zinc-200 p-2 pl-5 rounded-lg focus:outline-none focus:border-green-500 text-xs font-bold" placeholder="MRP" min="0">
    </div></div>
    <div class="col-span-2">
      <input type="number" class="new-variant-stock w-full bg-white border border-zinc-200 p-2 rounded-lg focus:outline-none focus:border-green-500 text-xs font-bold text-center" placeholder="0" min="0">
    </div>
    <div class="col-span-1 flex justify-center">
      <button type="button" onclick="this.closest('.new-variant-row').remove()"
        class="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>`;
  container.appendChild(row);
}

var variantsToDelete = variantsToDelete || [];

function removeExistingVariant(btn, variantId) {
  const row = btn.closest(".existing-variant-row") || btn.closest(".new-variant-row");
  row.style.opacity = "0";
  row.style.transition = "all 0.2s ease";
  setTimeout(() => { row.remove(); variantsToDelete.push(variantId); }, 200);
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
  document.getElementById("editModal").classList.remove("flex");
}

async function submitEdit() {
  const id = document.getElementById("editProductId").value;
  const name = document.getElementById("editName").value.trim();
  const category = document.getElementById("editCategory").value;
  const imageFile = document.getElementById("editImage").files[0];

  if (!name) { showToast("Product name cannot be empty.", "red"); return; }

  const variantUpdates = [];
  document.querySelectorAll(".variant-price-input").forEach((priceInput) => {
    const variantId = priceInput.getAttribute("data-variant-id");
    const mrpInput = document.querySelector(`.variant-mrp-input[data-variant-id="${variantId}"]`);
    const stockInput = document.querySelector(`.variant-stock-input[data-variant-id="${variantId}"]`);
    variantUpdates.push({
      id: variantId,
      price: parseFloat(priceInput.value) || 0,
      mrp: mrpInput && mrpInput.value !== "" ? parseFloat(mrpInput.value) : null,
      stock: stockInput ? parseInt(stockInput.value) || 0 : 0,
    });
  });

  const newVariants = [];
  document.querySelectorAll(".new-variant-row").forEach((row) => {
    const qty = row.querySelector(".new-variant-qty").value;
    const unit = row.querySelector(".new-variant-unit").value;
    const price = row.querySelector(".new-variant-price").value;
    const mrp = row.querySelector(".new-variant-mrp").value;
    const stock = row.querySelector(".new-variant-stock").value;
    if (qty && price) newVariants.push({ weight: `${qty} ${unit}`, price: parseFloat(price)||0, mrp: mrp?parseFloat(mrp):null, stock: parseInt(stock)||0 });
  });

  const formData = new FormData();
  formData.append("name", name);
  formData.append("category", category);
  formData.append("variantUpdates", JSON.stringify(variantUpdates));
  formData.append("newVariants", JSON.stringify(newVariants));
  formData.append("deleteVariants", JSON.stringify(variantsToDelete));
  if (imageFile) formData.append("imageFile", imageFile);

  const saveBtn = document.querySelector('[onclick="submitEdit()"]');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving..."; }

  try {
    const response = await fetch(`/admin/edit-product/${id}`, { method: "POST", body: formData });
    const data = await response.json();
    if (response.ok) {
      variantsToDelete.length = 0;
      closeEditModal();
      showToast("Product updated successfully!", "green");
      setTimeout(() => location.reload(), 1200);
    } else {
      showToast("Error: " + (data.error || "Unknown error"), "red");
    }
  } catch (err) {
    showToast("Server error. Please try again.", "red");
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Changes"; }
  }
}

function showToast(message, color = "green") {
  const existing = document.getElementById("appToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "appToast";
  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 ${color === "green" ? "bg-green-600" : "bg-red-500"} text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl z-50 flex items-center gap-2`;
  toast.innerHTML = `
    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${color === "green" ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>' : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'}
    </svg>
    ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ── Variant change on product card ────────────────────────────
function onVariantChange(select) {
  const card = select.closest(".product");
  const selected = select.options[select.selectedIndex];

  const variantId = selected.value;
  const price     = selected.getAttribute("data-price");
  const mrp       = selected.getAttribute("data-mrp");
  const stock     = parseInt(selected.getAttribute("data-stock") || "0");

  // Update card data attributes to reflect selected variant
  card.setAttribute("data-variant-id", variantId);
  card.setAttribute("data-price", price);
  card.setAttribute("data-stock", stock);
  card.querySelector(".variant-price").textContent = `Rs. ${price}`;

  const mrpEl     = card.querySelector(".variant-mrp");
  const discountEl = card.querySelector(".variant-discount");

  if (mrp && parseFloat(mrp) > parseFloat(price)) {
    if (mrpEl) { mrpEl.textContent = `Rs. ${mrp}`; mrpEl.classList.remove("hidden"); }
    if (discountEl) {
      const pct = Math.round(((parseFloat(mrp) - parseFloat(price)) / parseFloat(mrp)) * 100);
      discountEl.textContent = `${pct}% OFF`;
      discountEl.classList.remove("hidden");
    }
  } else {
    if (mrpEl) mrpEl.classList.add("hidden");
    if (discountEl) discountEl.classList.add("hidden");
  }

  const addBtn      = card.querySelector(".add-btn");
  const counter     = card.querySelector(".counter-control");
  const qtySpan     = card.querySelector(".qty-text");
  const outOfStockBtn = card.querySelector(".out-of-stock-btn");

  if (stock === 0) {
    // Variant is OOS
    if (outOfStockBtn) outOfStockBtn.classList.remove("hidden");
    if (addBtn) addBtn.classList.add("hidden");
    if (counter) { counter.classList.add("hidden"); counter.classList.remove("flex"); }
  } else {
    if (outOfStockBtn) outOfStockBtn.classList.add("hidden");

    // Check if this variant is already in cart (from CART_MAP exposed by server)
    const cartQty = (typeof CART_MAP !== "undefined" && CART_MAP[variantId]) ? CART_MAP[variantId] : 0;

    if (cartQty > 0) {
      // Show counter with existing cart quantity
      if (addBtn) addBtn.classList.add("hidden");
      if (counter) { counter.classList.remove("hidden"); counter.classList.add("flex"); }
      if (qtySpan) qtySpan.innerText = cartQty;
    } else {
      // Show ADD button
      if (counter) { counter.classList.add("hidden"); counter.classList.remove("flex"); }
      if (addBtn) addBtn.classList.remove("hidden");
      if (qtySpan) qtySpan.innerText = "1";
    }
  }
}

// ── Admin order status ────────────────────────────────────────
async function updateStatus(orderId, select) {
  const status = select.value;
  const card = select.closest(".order-card");
  const badge = card.querySelector(".status-badge");

  const response = await fetch("/admin/orders/update-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, status }),
  });

  if (response.ok) {
    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    const colorMap = { pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700", shipped: "bg-purple-100 text-purple-700", delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
    badge.className = `status-badge text-xs font-black px-3 py-1 rounded-full ${colorMap[status]}`;
    card.setAttribute("data-status", status);
    showToast("Order status updated!", "green");
  } else {
    showToast("Failed to update status.", "red");
    select.value = card.getAttribute("data-status");
  }
}

function filterOrders(status) {
  document.querySelectorAll(".order-card").forEach((card) => {
    card.classList.toggle("hidden", status !== "all" && card.getAttribute("data-status") !== status);
  });
  document.querySelectorAll(".filter-tab").forEach((btn) => {
    btn.classList.remove("bg-zinc-900", "text-white");
    btn.classList.add("bg-white", "text-zinc-600", "border", "border-zinc-200");
  });
  const activeTab = document.getElementById(`tab-${status}`);
  if (activeTab) {
    activeTab.classList.add("bg-zinc-900", "text-white");
    activeTab.classList.remove("bg-white", "text-zinc-600", "border", "border-zinc-200");
  }
}

// ── Discount code (cart page) ─────────────────────────────────
var appliedDiscount = (typeof appliedDiscount !== 'undefined') ? appliedDiscount : 0;

async function applyDiscount() {
  const code = document.getElementById("discountCodeInput").value.trim();
  const msg = document.getElementById("discountMsg");
  if (!code) return;

  const subtotal = getCartSubtotal();

  try {
    const res = await fetch("/apply-discount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, orderTotal: subtotal }),
    });
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.error;
      msg.className = "mt-2 text-xs font-bold text-red-500";
      msg.classList.remove("hidden");
      return;
    }

    appliedDiscount = data.discountAmount;
    msg.classList.add("hidden");

    document.getElementById("discountInputRow").classList.add("hidden");
    document.getElementById("discountApplied").classList.remove("hidden");
    document.getElementById("discountApplied").classList.add("flex");
    document.getElementById("discountAppliedLabel").textContent =
      data.discountType === "percentage"
        ? `${data.discountValue}% off applied`
        : `Rs. ${data.discountAmount} off applied`;

    document.getElementById("discountRow").classList.remove("hidden");
    document.getElementById("discountRow").classList.add("flex");
    document.getElementById("discountAmount").textContent =
      `-Rs. ${data.discountAmount.toLocaleString("en-IN")}`;

    updateOrderSummary();
  } catch (e) {
    msg.textContent = "Server error. Try again.";
    msg.className = "mt-2 text-xs font-bold text-red-500";
    msg.classList.remove("hidden");
  }
}

function removeDiscount() {
  appliedDiscount = 0;
  document.getElementById("discountCodeInput").value = "";
  document.getElementById("discountInputRow").classList.remove("hidden");
  document.getElementById("discountApplied").classList.add("hidden");
  document.getElementById("discountApplied").classList.remove("flex");
  document.getElementById("discountRow").classList.add("hidden");
  document.getElementById("discountRow").classList.remove("flex");
  document.getElementById("discountAmount").textContent = "-Rs. 0";
  updateOrderSummary();
}

function proceedToCheckout() {
  const btn = document.getElementById("checkoutBtn");
  if (btn && btn.disabled) return;

  // Double-check: block if any cart item has stock=0
  const hasOOS = [...document.querySelectorAll(".cart-item")]
    .some(el => parseInt(el.getAttribute("data-stock") || "99") === 0);
  if (hasOOS) {
    showStockPopup(0);
    return;
  }
  if (appliedDiscount > 0) {
    const code = document.getElementById("discountCodeInput").value.trim();
    window.location.href = `/checkout?applied_code=${encodeURIComponent(code)}&discount=${appliedDiscount}`;
  } else {
    window.location.href = "/checkout";
  }
}

// ── Admin Notifications ───────────────────────────────────────
// Polls /admin/notifications every 20s for new orders.
// Stores unread orders in memory; "Clear All" wipes them.

(function initAdminNotifications() {
  const bellBtn = document.getElementById("notifBtn");
  if (!bellBtn) return; // not admin page, skip

  let notifications = [];   // orders shown in panel (from server)
  let lastPolled    = null; // ISO string — for incremental polling

  // ── Sound (Web Audio API, no file needed) ─────────────────
  function playNotifSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [880, 660].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch (_) {}
  }

  // ── Helpers ───────────────────────────────────────────────
  function timeAgo(dateStr) {
    // Force UTC parse — Supabase timestamps without Z are still UTC
    const str = String(dateStr || '');
    const utcDate = str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)
      ? new Date(str)
      : new Date(str + 'Z');
    const diff = Math.floor((Date.now() - utcDate.getTime()) / 1000);
    if (diff < 5)     return "Just now";
    if (diff < 60)    return diff + "s ago";
    if (diff < 3600)  return Math.floor(diff / 60)  + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  }

  // ── Render panel ─────────────────────────────────────────
  function renderPanel() {
    const list   = document.getElementById("notifList");
    const empty  = document.getElementById("notifEmpty");
    const badge  = document.getElementById("notifBadge");
    const footer = document.getElementById("notifFooterCount");
    if (!list) return;

    // Remove previous items
    list.querySelectorAll(".notif-item").forEach(el => el.remove());

    if (notifications.length === 0) {
      if (empty)  empty.classList.remove("hidden");
      if (badge)  badge.classList.add("hidden");
      if (footer) footer.textContent = "";
      return;
    }

    if (empty)  empty.classList.add("hidden");
    if (badge) {
      badge.classList.remove("hidden");
      badge.textContent = notifications.length > 99 ? "99+" : notifications.length;
    }
    if (footer) footer.textContent = notifications.length + " unread";

    notifications.forEach(order => {
      const a = document.createElement("a");
      a.href = "/admin/orders";
      a.className = "notif-item flex items-start gap-3 px-4 py-3 hover:bg-green-50 transition-colors border-b border-zinc-50 last:border-0";
      a.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
          <svg class="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-black text-zinc-900">New Order — Rs. ${order.total.toLocaleString("en-IN")}</p>
          <p class="text-[10px] text-zinc-400 font-medium mt-0.5 truncate">${order.email}</p>
          <p class="text-[10px] text-green-600 font-bold mt-0.5">${timeAgo(order.created_at)}</p>
        </div>`;
      list.insertBefore(a, empty);
    });
  }

  // ── Full fetch: load ALL notifications since last clear (cross-browser) ──
  async function fetchAllNotifications() {
    try {
      const res  = await fetch("/admin/notifications");
      if (!res.ok) return;
      const data = await res.json();
      notifications = data.orders || [];
      lastPolled    = new Date().toISOString();
      renderPanel();
    } catch (_) {}
  }

  // ── Incremental poll: only fetch what's new since last poll ──
  async function pollNew() {
    if (!lastPolled) { await fetchAllNotifications(); return; }
    try {
      const res  = await fetch(`/admin/notifications?since=${encodeURIComponent(lastPolled)}`);
      if (!res.ok) return;
      const data = await res.json();
      lastPolled  = new Date().toISOString();

      const fresh = (data.orders || []).filter(
        o => !notifications.find(n => n.id === o.id)
      );

      if (fresh.length > 0) {
        notifications = [...fresh, ...notifications];
        renderPanel();
        playNotifSound();

        // Bell shake
        const bell = document.getElementById("notifBell");
        if (bell) {
          bell.style.animation = "none";
          setTimeout(() => { bell.style.animation = "bellShake 0.6s ease"; }, 10);
        }

        // Toast
        showToast(fresh[0], fresh.length);

        // Browser notification
        if (Notification?.permission === "granted") {
          new Notification("🛒 GardenRich — New Order!", {
            body: fresh.length === 1
              ? `Rs. ${fresh[0].total.toLocaleString("en-IN")} · ${fresh[0].email}`
              : `${fresh.length} new orders just came in`,
            icon: "/favicon.ico",
          });
        }
      }
    } catch (_) {}
  }

  // ── Toast popup ───────────────────────────────────────────
  function showToast(order, count) {
    document.getElementById("orderToast")?.remove();
    const t = document.createElement("div");
    t.id = "orderToast";
    t.className = "fixed top-20 right-4 z-[9999] bg-zinc-900 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 max-w-xs cursor-pointer animate-[slideIn_0.3s_ease]";
    t.onclick = () => window.location.href = "/admin/orders";
    t.innerHTML = `
      <div class="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
      </div>
      <div class="flex-1">
        <p class="text-xs font-black">New Order! 🎉</p>
        <p class="text-[10px] text-zinc-300 mt-0.5">Rs. ${order.total.toLocaleString("en-IN")} · ${order.email}</p>
        <p class="text-[9px] text-zinc-400 mt-1">Click to view</p>
      </div>
      <button onclick="event.stopPropagation();document.getElementById('orderToast').remove()"
        class="text-zinc-400 hover:text-white ml-1 shrink-0">✕</button>`;
    document.body.appendChild(t);
    setTimeout(() => {
      if (t.parentNode) { t.style.opacity = "0"; t.style.transition = "opacity 0.4s"; setTimeout(() => t.remove(), 400); }
    }, 5000);
  }

  // ── Clear all (writes to DB — cross-browser) ──────────────
  window._clearNotifications = async function() {
    try {
      await fetch("/admin/notifications/clear", { method: "POST" });
    } catch (_) {}
    notifications = [];
    renderPanel();
    document.getElementById("notifPanel")?.classList.add("hidden");
  };

  // ── Bell toggle ───────────────────────────────────────────
  window.toggleNotifPanel = function(e) {
    e.stopPropagation();
    const panel = document.getElementById("notifPanel");
    if (!panel) return;
    panel.classList.toggle("hidden");
  };

  // Close on outside click
  document.addEventListener("click", (e) => {
    const wrapper = document.getElementById("notifWrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      document.getElementById("notifPanel")?.classList.add("hidden");
    }
  });

  // ── Inject styles ─────────────────────────────────────────
  if (!document.getElementById("notifStyles")) {
    const s = document.createElement("style");
    s.id = "notifStyles";
    s.textContent = `
      @keyframes bellShake {
        0%,100%{transform:rotate(0)} 15%{transform:rotate(18deg)}
        30%{transform:rotate(-16deg)} 45%{transform:rotate(12deg)}
        60%{transform:rotate(-8deg)} 75%{transform:rotate(5deg)}
      }`;
    document.head.appendChild(s);
  }

  // ── Browser notification permission ──────────────────────
  if (Notification?.permission === "default") Notification.requestPermission();

  // ── Init ──────────────────────────────────────────────────
  fetchAllNotifications();                    // load existing on page open
  setInterval(pollNew, 10000);               // poll every 10s for new ones
  setInterval(renderPanel, 60000);           // refresh timeAgo labels
})();
// Close notification panel when clicking outside
document.addEventListener("click", function(e) {
  const wrapper = document.getElementById("notifWrapper");
  if (wrapper && !wrapper.contains(e.target)) {
    const panel = document.getElementById("notifPanel");
    if (panel) panel.classList.add("hidden");
  }
});

// ── Remove OOS item from cart (one tap) ──────────────────────
function removeOOSItem(btn) {
  const itemContainer = btn.closest(".cart-item");
  if (!itemContainer) return;

  const productId = itemContainer.getAttribute("data-id");
  const variantId = itemContainer.getAttribute("data-variant-id");

  itemContainer.style.opacity = "0";
  itemContainer.style.transform = "scale(0.95)";
  itemContainer.style.transition = "all 0.2s ease";

  setTimeout(() => {
    const summaryRow = document.getElementById(`summary-row-${variantId}`);
    if (summaryRow) {
      summaryRow.style.opacity = "0";
      summaryRow.style.transition = "opacity 0.2s ease";
      setTimeout(() => summaryRow.remove(), 200);
    }
    itemContainer.remove();
    updateOrderSummary();
    checkEmptyCart();
  }, 200);

  // Remove from server
  updateCartOnServer(productId, variantId, 0);
}