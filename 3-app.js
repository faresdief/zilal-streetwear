/* ZILAL app: cart, wishlist, compare, search, filters, WhatsApp order. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => n.toLocaleString("en-US") + " ج.م";
  const KEY = "zilal_state_v1";
  let state = { cart: [], wish: [], orders: [], coupon: null, cat: "الكل", sort: "default" };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  state.cat = "الكل"; state.sort = "default";
  let cmp = [];
  const P = () => SHOP.products;
  const byId = id => P().find(p => p.id === id);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ cart: state.cart, wish: state.wish, orders: state.orders, coupon: state.coupon })); } catch (e) {} };
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2400); }

  const subtotal = () => state.cart.reduce((s, it) => s + (byId(it.id) ? byId(it.id).price * it.qty : 0), 0);
  const discount = () => state.coupon && SHOP.coupons[state.coupon] ? Math.round(subtotal() * SHOP.coupons[state.coupon]) : 0;
  const shipping = gov => { const s = subtotal() - discount(); if (!state.cart.length || s >= SHOP.freeShipOver) return 0; return (GOVS[gov] != null ? GOVS[gov] : SHOP.shipOther); };
  const grand = gov => subtotal() - discount() + shipping(gov);
  const cartQty = () => state.cart.reduce((s, it) => s + it.qty, 0);

  function syncCounters() {
    const q = cartQty(); $("#cartCount").textContent = q;
    const w = $("#wishCount"); w.hidden = !state.wish.length; w.textContent = state.wish.length;
  }
  const ICON_HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.4 12 20 12 20z"/></svg>';
  const ICON_CMP = '<svg viewBox="0 0 24 24"><path d="M7 4v16M17 4v16M3 8l4-4 4 4M13 16l4 4 4-4"/></svg>';

  function cardHTML(p, i) {
    const w = state.wish.includes(p.id), c = cmp.includes(p.id);
    return `<article class="card" data-id="${p.id}" style="--i:${i}">
      <div class="card-img"><img src="${p.images[0]}" alt="${p.name}" loading="${i < 4 ? "eager" : "lazy"}" decoding="async" width="800" height="1000">
        ${p.badge ? `<span class="tag">${p.badge}</span>` : ""}
        <div class="card-tools"><button class="mini ${w ? "on" : ""}" data-wish="${p.id}" aria-label="مفضلة" aria-pressed="${w}">${ICON_HEART}</button><button class="mini ${c ? "on" : ""}" data-cmp="${p.id}" aria-label="قارن" aria-pressed="${c}">${ICON_CMP}</button></div>
      </div>
      <div class="card-body"><span class="card-line">${p.line}</span><h3 class="card-name">${p.name}</h3>
        <span class="card-rate"><b>★</b> ${p.rating} (${p.reviews})</span>
        <div class="price"><b>${money(p.price)}</b>${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}</div>
        <button class="card-add" data-add="${p.id}">أضف للسلة</button></div></article>`;
  }
  function list() {
    let l = P().filter(p => state.cat === "الكل" || p.cat === state.cat);
    if (state.sort === "price-asc") l.sort((a, b) => a.price - b.price);
    else if (state.sort === "price-desc") l.sort((a, b) => b.price - a.price);
    else if (state.sort === "rating") l.sort((a, b) => b.rating - a.rating);
    return l;
  }
  function renderGrid() {
    const l = list();
    $("#productGrid").innerHTML = l.map(cardHTML).join("");
    $("#gridEmpty").hidden = !!l.length;
    $("#resultCount").textContent = l.length + " قطعة";
  }
  function renderChips() {
    $("#chips").innerHTML = SHOP.categories.map(c => `<button class="chip ${c === state.cat ? "active" : ""}" data-cat="${c}" role="tab" aria-selected="${c === state.cat}">${c}</button>`).join("");
  }

  function addToCart(id, color, size, qty, quiet) {
    const p = byId(id); if (!p) return;
    color = color || p.colors[0]; size = size || p.sizes[0]; qty = qty || 1;
    const f = state.cart.find(it => it.id === id && it.color === color && it.size === size);
    if (f) f.qty += qty; else state.cart.push({ id, color, size, qty });
    save(); syncCounters(); renderCart();
    const b = $("#cartBtn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    if (!quiet) toast("اتضافت للسلة: " + p.name);
  }
  function renderCart() {
    const box = $("#cartItems");
    if (!state.cart.length) { box.innerHTML = `<div class="empty-state">السلة فاضية.<br>ضيف قطعة من المتجر.</div>`; $("#cartFoot").hidden = true; return; }
    $("#cartFoot").hidden = false;
    box.innerHTML = state.cart.map((it, i) => { const p = byId(it.id); return `<div class="line-item"><img src="${p.images[0]}" alt="" width="70" height="84"><div><strong>${p.name}</strong><small>${it.color} · ${it.size}</small><div class="qty"><button data-dec="${i}" aria-label="أقل">−</button><b>${it.qty}</b><button data-inc="${i}" aria-label="أكتر">+</button></div></div><div style="text-align:end"><b>${money(p.price * it.qty)}</b><br><button class="rm" data-remove="${i}">حذف</button></div></div>`; }).join("");
    $("#subTotal").textContent = money(subtotal());
    const sh = shipping("القاهرة"); $("#shipFee").textContent = sh ? money(sh) + " (القاهرة)" : "مجاني";
    $("#discountRow").hidden = !discount(); $("#discountVal").textContent = "− " + money(discount());
    $("#grandTotal").textContent = money(grand("القاهرة"));
  }
  function toggleWish(id) {
    const i = state.wish.indexOf(id); if (i >= 0) { state.wish.splice(i, 1); toast("اتشالت من المفضلة"); } else { state.wish.push(id); toast("اتضافت للمفضلة"); }
    save(); syncCounters(); renderWish();
    $$(`[data-wish="${id}"]`).forEach(b => { const on = state.wish.includes(id); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  }
  function renderWish() {
    const box = $("#wishList");
    if (!state.wish.length) { box.innerHTML = `<div class="empty-state">لسه مفيش مفضلة.<br>دوس على القلب في أي قطعة.</div>`; return; }
    box.innerHTML = state.wish.map(id => { const p = byId(id); if (!p) return ""; return `<div class="line-item"><img src="${p.images[0]}" alt="" width="70" height="84"><div><strong>${p.name}</strong><small>${money(p.price)}</small><div class="qty"><button class="btn btn-dark" style="padding:6px 14px;font-size:13px" data-view="${p.id}">عرض</button></div></div><button class="rm" data-unwish="${p.id}">حذف</button></div>`; }).join("");
  }

  /* compare */
  function syncCmp() {
    const tray = $("#cmpTray"); tray.classList.toggle("show", cmp.length > 0); tray.setAttribute("aria-hidden", !cmp.length);
    $("#cmpThumbs").innerHTML = cmp.map(id => `<img src="${byId(id).images[0]}" alt="">`).join("");
    $("#cmpLabel").textContent = cmp.length < 2 ? "اختار قطعة كمان للمقارنة" : cmp.length + " قطع جاهزة";
    $("#cmpGo").disabled = cmp.length < 2;
    $$("[data-cmp]").forEach(b => { const on = cmp.includes(b.dataset.cmp); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  }
  function toggleCmp(id) {
    const i = cmp.indexOf(id);
    if (i >= 0) cmp.splice(i, 1); else if (cmp.length >= 3) { toast("أقصى حاجة ٣ قطع للمقارنة"); return; } else cmp.push(id);
    syncCmp();
  }
  function openCmp() {
    const ps = cmp.map(byId);
    const rows = [["السعر", p => money(p.price)], ["القسم", p => p.cat], ["التقييم", p => "★ " + p.rating], ["الألوان", p => p.colors.join("، ")], ["المقاسات", p => p.sizes.join(" / ")], ["الخامة", p => (p.specs[0] || [])[1] || "-"], ["القصة", p => (p.specs[1] || [])[1] || "-"]];
    $("#cmpBody").innerHTML = `<div class="cmp-table"><table><thead><tr><th></th>${ps.map(p => `<th><img src="${p.images[0]}" alt="" width="100" height="120"><br>${p.name}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td>${ps.map(p => `<td>${r[1](p)}</td>`).join("")}</tr>`).join("")}<tr><td></td>${ps.map(p => `<td><button class="btn btn-primary" style="padding:8px 16px;font-size:13px" data-add="${p.id}">أضف</button></td>`).join("")}</tr></tbody></table></div>`;
    openModal("cmpModal");
  }

  /* product modal */
  function openProduct(id) {
    const p = byId(id); if (!p) return;
    let color = p.colors[0], size = p.sizes[0], qty = 1;
    $("#productDetail").innerHTML = `<div class="pd-img"><img src="${p.images[0]}" alt="${p.name}" width="800" height="800"></div><div class="pd-body">
      <span class="card-line">${p.line}</span><h2>${p.name}</h2>
      <div class="price"><b style="font-size:24px">${money(p.price)}</b>${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}<span class="card-rate"><b>★</b> ${p.rating} (${p.reviews})</span></div>
      <p class="desc">${p.desc}</p>
      <div><span class="opt-label">اللون</span><div class="opts" id="pdColors">${p.colors.map((c, i) => `<button class="${i ? "" : "active"}" data-v="${c}">${c}</button>`).join("")}</div></div>
      <div><span class="opt-label">المقاس</span><div class="opts" id="pdSizes">${p.sizes.map((c, i) => `<button class="${i ? "" : "active"}" data-v="${c}">${c}</button>`).join("")}</div></div>
      <div class="specs">${p.specs.map(s => `<div><span>${s[0]}</span><span>${s[1]}</span></div>`).join("")}</div>
      <div class="pd-actions"><div class="pd-qty"><button id="pdDec" aria-label="أقل">−</button><b id="pdQty">1</b><button id="pdInc" aria-label="أكتر">+</button></div><button class="btn btn-primary" id="pdAdd">أضف للسلة</button></div></div>`;
    const pick = (sel, set) => $$(sel + " button").forEach(b => b.onclick = () => { $$(sel + " button").forEach(x => x.classList.remove("active")); b.classList.add("active"); set(b.dataset.v); });
    pick("#pdColors", v => color = v); pick("#pdSizes", v => size = v);
    $("#pdInc").onclick = () => { qty++; $("#pdQty").textContent = qty; };
    $("#pdDec").onclick = () => { if (qty > 1) qty--; $("#pdQty").textContent = qty; };
    $("#pdAdd").onclick = () => { addToCart(p.id, color, size, qty, true); closeAll(); openDrawer("cartDrawer"); };
    openModal("productModal");
    $("#productModal .modal-card").scrollTop = 0;
  }

  /* overlays */
  let lastFocus = null;
  function lock(on) { document.body.style.overflow = on ? "hidden" : ""; }
  function openDrawer(id) { lastFocus = document.activeElement; $("#overlay").hidden = false; const d = $("#" + id); d.classList.add("open"); d.setAttribute("aria-hidden", "false"); lock(true); if (id === "cartDrawer") renderCart(); if (id === "wishDrawer") renderWish(); if (id === "ordersDrawer") renderOrders(); }
  function openModal(id) { lastFocus = document.activeElement; $("#overlay").hidden = true; const m = $("#" + id); m.classList.add("open"); m.setAttribute("aria-hidden", "false"); lock(true); }
  function closeAll() {
    $$(".drawer,.modal").forEach(d => { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); });
    $("#overlay").hidden = true; lock(false);
  }

  /* checkout */
  let gov = "القاهرة", payMethod = "كاش عند الاستلام";
  function openCheckout() {
    if (!state.cart.length) { toast("السلة فاضية"); return; }
    gov = "القاهرة";
    $("#checkoutBody").innerHTML = `<div class="checkout-body"><h2>بيانات الأوردر</h2><p class="muted">اكتب بياناتك وهنفتح واتساب برسالة الأوردر.</p>
      <form id="checkoutForm" novalidate><div class="checkout-grid">
        <div class="field"><label for="cName">الاسم بالكامل *</label><input id="cName" autocomplete="name" placeholder="مثال: كريم أحمد"><span class="err" id="eName"></span></div>
        <div class="field"><label for="cPhone">رقم الموبايل *</label><input id="cPhone" inputmode="tel" autocomplete="tel" placeholder="01xxxxxxxxx"><span class="err" id="ePhone"></span></div>
        <div class="field"><label for="cGov">المحافظة *</label><select id="cGov">${Object.keys(GOVS).map(g => `<option>${g}</option>`).join("")}</select></div>
        <div class="field"><label for="cAddr">العنوان بالتفصيل *</label><input id="cAddr" autocomplete="street-address" placeholder="الشارع، العمارة، الدور، الشقة"><span class="err" id="eAddr"></span></div>
        <div class="field"><label>طريقة الدفع</label><div class="pay-options" id="payOptions"><label class="pay-opt active"><input type="radio" name="pay" value="كاش عند الاستلام" checked> كاش عند الاستلام</label><label class="pay-opt"><input type="radio" name="pay" value="تحويل إنستاباي"> إنستاباي / فودافون كاش</label></div></div>
        <div class="field"><label for="cNote">ملاحظات (اختياري)</label><textarea id="cNote" placeholder="وقت التوصيل، تغليف هدية..."></textarea></div>
      </div><div class="order-recap" id="recap"></div>
      <button type="submit" class="btn btn-wa block">تأكيد الأوردر على واتساب</button><p class="fineprint" style="margin-top:10px">موقع عرض تجريبي: الرسالة بتتفتح على واتساب بس.</p></form></div>`;
    const recap = () => { $("#recap").innerHTML = `<h4>ملخص الأوردر</h4>${state.cart.map(it => { const p = byId(it.id); return `<div class="recap-line"><span>${p.name} · ${it.color} · ${it.size} × ${it.qty}</span><b>${money(p.price * it.qty)}</b></div>`; }).join("")}<div class="recap-line"><span>المجموع الفرعي</span><b>${money(subtotal())}</b></div>${discount() ? `<div class="recap-line"><span>خصم (${state.coupon})</span><b>− ${money(discount())}</b></div>` : ""}<div class="recap-line"><span>الشحن (${gov})</span><b>${shipping(gov) ? money(shipping(gov)) : "مجاني"}</b></div><div class="recap-line t"><span>الإجمالي</span><b>${money(grand(gov))}</b></div>`; };
    recap();
    $("#cGov").onchange = e => { gov = e.target.value; recap(); };
    $$("#payOptions .pay-opt").forEach(o => o.onclick = () => { $$("#payOptions .pay-opt").forEach(x => x.classList.remove("active")); o.classList.add("active"); payMethod = o.querySelector("input").value; });
    $("#checkoutForm").onsubmit = e => {
      e.preventDefault();
      const name = $("#cName").value.trim(), phone = $("#cPhone").value.replace(/[\s-]/g, ""), addr = $("#cAddr").value.trim(), note = $("#cNote").value.trim();
      let ok = true; $("#eName").textContent = $("#ePhone").textContent = $("#eAddr").textContent = "";
      if (name.length < 3) { $("#eName").textContent = "اكتب اسمك بالكامل"; ok = false; }
      if (!/^01[0125][0-9]{8}$/.test(phone)) { $("#ePhone").textContent = "رقم مصري غير صحيح (01xxxxxxxxx)"; ok = false; }
      if (addr.length < 8) { $("#eAddr").textContent = "اكتب العنوان بالتفصيل"; ok = false; }
      if (!ok) return;
      const no = "ZIL-" + String(Date.now()).slice(-6);
      const lines = state.cart.map((it, i) => { const p = byId(it.id); return `${i + 1}) ${p.name} - ${it.color} - ${it.size} - عدد ${it.qty} - ${money(p.price * it.qty)}`; });
      const msg = ["طلب جديد من موقع ظلال ZILAL (عرض تجريبي)", "رقم الطلب: " + no, "-----", ...lines, "-----", "المجموع الفرعي: " + money(subtotal()), discount() ? "الخصم (" + state.coupon + "): − " + money(discount()) : null, "الشحن (" + gov + "): " + (shipping(gov) ? money(shipping(gov)) : "مجاني"), "الإجمالي: " + money(grand(gov)), "-----", "الاسم: " + name, "الموبايل: " + phone, "المحافظة: " + gov, "العنوان: " + addr, "الدفع: " + payMethod, note ? "ملاحظات: " + note : null].filter(Boolean).join("\n");
      state.orders.unshift({ no, ts: Date.now(), gov, items: state.cart.map(it => ({ id: it.id, qty: it.qty })), total: grand(gov) });
      state.cart = []; state.coupon = null; save(); syncCounters(); renderCart();
      const url = "https://wa.me/" + SHOP.whatsapp + "?text=" + encodeURIComponent(msg);
      window.open(url, "_blank", "noopener");
      $("#checkoutBody").innerHTML = `<div class="success"><div class="tick">✓</div><h2>الأوردر جاهز يا ${name.split(" ")[0]}</h2><p style="color:var(--mut)">فتحنا واتساب برسالة الأوردر. دوس <b>إرسال</b> وهنأكد معاك.</p><div class="order-no">${no}</div><a class="btn btn-wa" href="${url}" target="_blank" rel="noopener">افتح واتساب تاني</a><button class="btn btn-outline" id="okClose">أكمل التسوق</button></div>`;
      $("#okClose").onclick = closeAll;
    };
    openModal("checkoutModal");
  }
  function renderOrders() {
    const box = $("#ordersList");
    if (!state.orders.length) { box.innerHTML = `<div class="empty-state">مفيش أوردرات لسه.</div>`; return; }
    box.innerHTML = state.orders.map(o => `<div class="order-card"><div class="top"><span class="no">${o.no}</span><span class="st">في انتظار التأكيد</span></div><div>${o.items.map(it => { const p = byId(it.id); return p ? p.name + " × " + it.qty : ""; }).filter(Boolean).join("، ")}</div><div class="tot">${money(o.total)}</div></div>`).join("");
  }

  /* search */
  function openSearch() { $("#searchOverlay").hidden = false; lock(true); renderSearch(""); setTimeout(() => $("#searchInput").focus(), 60); }
  function closeSearch() { $("#searchOverlay").hidden = true; if (!$(".drawer.open,.modal.open")) lock(false); }
  function renderSearch(q) {
    q = q.trim().toLowerCase();
    const l = P().filter(p => !q || (p.name + " " + p.line + " " + p.cat + " " + p.colors.join(" ")).toLowerCase().includes(q));
    $("#searchResults").innerHTML = l.length ? l.map(p => `<div class="sr-item" data-view="${p.id}"><img src="${p.images[0]}" alt="" width="56" height="68"><div><strong>${p.name}</strong><span>${p.cat} · ${money(p.price)}</span></div></div>`).join("") : `<p style="color:var(--mut)">مفيش نتايج للكلمة دي.</p>`;
  }

  /* theme */
  function toggleTheme() {
    const r = document.documentElement, n = r.getAttribute("data-theme") === "light" ? "dark" : "light";
    r.setAttribute("data-theme", n); try { localStorage.setItem("zilal_theme", n); } catch (e) {}
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = n === "light" ? "#e9eaee" : "#0b0b0e";
  }

  document.addEventListener("click", e => {
    const t = e.target;
    const add = t.closest("[data-add]"), view = t.closest("[data-view]"), wish = t.closest("[data-wish]"), cm = t.closest("[data-cmp]"), chip = t.closest("[data-cat]");
    if (add) { e.preventDefault(); addToCart(add.dataset.add); return; }
    if (view) { e.preventDefault(); closeAll(); closeSearch(); openProduct(view.dataset.view); return; }
    if (wish) { e.preventDefault(); toggleWish(wish.dataset.wish); return; }
    if (cm) { e.preventDefault(); toggleCmp(cm.dataset.cmp); return; }
    const card = t.closest(".card[data-id]");
    if (card && !t.closest("button,a")) { openProduct(card.dataset.id); return; }
    if (chip) {
      e.preventDefault(); state.cat = chip.dataset.cat; renderChips(); renderGrid();
      if (chip.closest(".site-footer")) $("#shop").scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (t.closest("[data-close]")) { e.preventDefault(); closeAll(); return; }
    if (t.classList.contains("modal")) { closeAll(); return; }
    const inc = t.closest("[data-inc]"), dec = t.closest("[data-dec]"), rem = t.closest("[data-remove]"), unw = t.closest("[data-unwish]");
    if (inc) { state.cart[+inc.dataset.inc].qty++; save(); syncCounters(); renderCart(); }
    else if (dec) { const i = +dec.dataset.dec; if (--state.cart[i].qty <= 0) state.cart.splice(i, 1); save(); syncCounters(); renderCart(); }
    else if (rem) { state.cart.splice(+rem.dataset.remove, 1); save(); syncCounters(); renderCart(); }
    else if (unw) toggleWish(unw.dataset.unwish);
  });

  function init() {
    renderChips(); renderGrid(); renderCart(); renderWish(); syncCounters(); syncCmp();
    $("#year").textContent = new Date().getFullYear();
    $("#cartBtn").onclick = () => openDrawer("cartDrawer");
    $("#wishBtn").onclick = () => openDrawer("wishDrawer");
    $("#overlay").onclick = closeAll;
    $("#toCheckout").onclick = () => { closeAll(); openCheckout(); };
    $("#searchBtn").onclick = openSearch; $("#searchClose").onclick = closeSearch;
    $("#searchInput").addEventListener("input", e => renderSearch(e.target.value));
    $("#themeBtn").onclick = toggleTheme;
    $("#sortSel").onchange = e => { state.sort = e.target.value; renderGrid(); };
    $("#cmpGo").onclick = openCmp; $("#cmpClear").onclick = () => { cmp = []; syncCmp(); };
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeAll(); if (!$("#searchOverlay").hidden) closeSearch(); } });
    const nav = $("#mainNav"), burger = $("#burger");
    const setNav = o => { nav.classList.toggle("open", o); burger.setAttribute("aria-expanded", o); };
    burger.onclick = () => setNav(!nav.classList.contains("open"));
    $$("#mainNav a").forEach(a => a.addEventListener("click", () => setNav(false)));
    $("#navTheme").onclick = () => { setNav(false); toggleTheme(); };
    $("#navSearch").onclick = () => { setNav(false); openSearch(); };
    $("#navOrders").onclick = () => { setNav(false); openDrawer("ordersDrawer"); };
    $("#couponBtn").onclick = () => {
      const c = $("#couponInput").value.trim().toUpperCase();
      if (SHOP.coupons[c]) { state.coupon = c; save(); renderCart(); toast("الكود اتطبق: خصم " + Math.round(SHOP.coupons[c] * 100) + "%"); } else toast("الكود مش صحيح");
    };
    /* scroll effects */
    const header = $("#header"), top = $("#toTop"); let ly = 0, tick = false;
    addEventListener("scroll", () => { if (tick) return; tick = true; requestAnimationFrame(() => { const y = scrollY; header.classList.toggle("hide", y > ly && y > 240 && !nav.classList.contains("open")); top.classList.toggle("show", y > 700); ly = y; tick = false; }); }, { passive: true });
    top.onclick = () => scrollTo({ top: 0, behavior: "smooth" });
    /* reveal */
    const els = $$(".reveal");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
      els.forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + "ms"; io.observe(el); });
    } else els.forEach(el => el.classList.add("in"));
    const m = new URLSearchParams(location.search).get("p"); if (m && byId(m)) openProduct(m);
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  document.addEventListener("DOMContentLoaded", init);
})();
