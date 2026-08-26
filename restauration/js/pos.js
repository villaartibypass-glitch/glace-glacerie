// ============================================================
// POS — Caisse, panier et ticket thermique 80 mm
// Compatible navigateur + Xprinter via impression système.
// Pour impression silencieuse/directe, utiliser QZ Tray/Electron.
// ============================================================
const POS = (() => {
  let cart = [];
  let initialized = false;
  const LAST_KEY = 'resto_last_ticket_v1';

  const money = n => Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' Ar';
  const today = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  };
  const ticketNo = () => {
    const d = new Date();
    const p = n => String(n).padStart(2,'0');
    return `T${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${String(Date.now()).slice(-6)}`;
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function init() {
    if (!initialized) {
      initialized = true;
      renderProducts();
      renderCart();
      document.getElementById('posReceived').value = 0;
    } else {
      renderProducts();
      renderCart();
    }
  }

  function renderProducts() {
    const target = document.getElementById('posProducts');
    if (!target) return;
    const q = (document.getElementById('posSearch')?.value || '').trim().toLowerCase();
    const cat = document.getElementById('posCategory')?.value || '';
    const recipes = Store.db.recettes.filter(r =>
      (!q || r.nom.toLowerCase().includes(q)) &&
      (!cat || Store.db.produits.some(p => p.categorie === cat && r.ingredients.some(i => i.produitId === p.id)))
    );

    target.innerHTML = recipes.length ? recipes.map(r => {
      const cost = Store.coutRecette(r);
      const fc = r.prixVente ? (cost / r.prixVente) * 100 : 0;
      return `<button class="pos-product" onclick="POS.add('${r.id}')">
        <span class="pos-product-name">${esc(r.nom)}</span>
        <span class="pos-product-price">${money(r.prixVente)}</span>
        <span class="pos-product-meta">Food cost ${fc.toFixed(0)}%</span>
      </button>`;
    }).join('') : `<div class="pos-empty">Aucune recette disponible.<br><small>Créez d'abord une fiche technique dans « Fiches Techniques ».</small></div>`;
  }

  function add(id) {
    const r = Store.recette(id);
    if (!r) return;
    const item = cart.find(x => x.recetteId === id);
    if (item) item.quantite += 1;
    else cart.push({ recetteId: id, nom: r.nom, prixUnit: Number(r.prixVente), quantite: 1 });
    renderCart();
  }

  function changeQty(id, delta) {
    const item = cart.find(x => x.recetteId === id);
    if (!item) return;
    item.quantite += delta;
    if (item.quantite <= 0) cart = cart.filter(x => x.recetteId !== id);
    renderCart();
  }

  function remove(id) {
    cart = cart.filter(x => x.recetteId !== id);
    renderCart();
  }

  function clearCart() {
    cart = [];
    renderCart();
  }

  function totals() {
    return cart.reduce((s, x) => s + x.prixUnit * x.quantite, 0);
  }

  function renderCart() {
    const box = document.getElementById('posCartItems');
    if (!box) return;
    const count = cart.reduce((s,x) => s+x.quantite, 0);
    const total = totals();
    document.getElementById('posCartCount').textContent = `${count} article${count > 1 ? 's' : ''}`;
    document.getElementById('posSubtotal').textContent = money(total);
    document.getElementById('posTotal').textContent = money(total);
    const receivedEl = document.getElementById('posReceived');
    if (receivedEl && (!receivedEl.value || Number(receivedEl.value) === 0)) receivedEl.value = total;

    box.innerHTML = cart.length ? cart.map(x => `
      <div class="pos-cart-item">
        <div class="pos-item-info">
          <strong>${esc(x.nom)}</strong>
          <span>${money(x.prixUnit)} / unité</span>
        </div>
        <div class="pos-item-actions">
          <button onclick="POS.changeQty('${x.recetteId}',-1)">−</button>
          <b>${x.quantite}</b>
          <button onclick="POS.changeQty('${x.recetteId}',1)">+</button>
          <button class="remove" onclick="POS.remove('${x.recetteId}')" title="Retirer">×</button>
        </div>
        <strong class="pos-line-total">${money(x.prixUnit*x.quantite)}</strong>
      </div>`).join('') :
      `<div class="pos-empty-cart">Panier vide<br><small>Cliquez sur un produit pour commencer.</small></div>`;

    updateChange();
  }

  function updateChange() {
    const total = totals();
    const receivedEl = document.getElementById('posReceived');
    const changeEl = document.getElementById('posChange');
    if (!receivedEl || !changeEl) return;
    const received = Number(receivedEl.value) || 0;
    const change = Math.max(0, received - total);
    changeEl.textContent = money(change);
    changeEl.classList.toggle('negative', received > 0 && received < total);
  }

  function checkout() {
    if (!cart.length) {
      UI.toast('Le panier est vide.', 'error');
      return;
    }
    const total = totals();
    const received = Number(document.getElementById('posReceived').value) || 0;
    const payment = document.getElementById('posPayment').value;
    if (received < total) {
      UI.toast(`Montant insuffisant : ${money(total - received)} restant.`, 'error');
      return;
    }

    const no = ticketNo();
    const date = today();
    const time = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    const ticket = {
      no, date, time, payment,
      items: cart.map(x => ({...x})),
      total, received, change: received-total
    };

    cart.forEach(x => Store.addVente({
      id: undefined,
      date,
      recetteId: x.recetteId,
      quantite: x.quantite,
      prixUnit: x.prixUnit,
      ticketId: no,
      paymentMode: payment
    }));

    localStorage.setItem(LAST_KEY, JSON.stringify(ticket));
    cart = [];
    renderCart();
    document.getElementById('posReceived').value = 0;
    printTicket(ticket);
    UI.toast(`Ticket ${no} enregistré ✓`);
  }

  function printLastTicket() {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) {
      UI.toast('Aucun ticket à imprimer.', 'error');
      return;
    }
    try { printTicket(JSON.parse(raw)); }
    catch { UI.toast('Ticket invalide.', 'error'); }
  }

  function printTicket(ticket) {
    const settings = getSettings();
    const lines = ticket.items.map(x => `
      <div class="t-line">
        <span>${esc(x.nom)} x${x.quantite}</span>
        <span>${money(x.prixUnit*x.quantite)}</span>
      </div>`).join('');

    const win = window.open('', '_blank', 'width=420,height=700');
    if (!win) {
      UI.toast('Le navigateur bloque la fenêtre d’impression. Autorisez les pop-ups pour ce site.', 'error');
      return;
    }
    win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(ticket.no)}</title>
      <style>
        @page{size:80mm auto;margin:0}
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:#fff;color:#000}
        body{width:80mm;font-family:Arial,Helvetica,sans-serif;font-size:12px;padding:4mm}
        .center{text-align:center}.brand{font-size:18px;font-weight:700}.small{font-size:10px}
        .sep{border-top:1px dashed #000;margin:8px 0}
        .t-line{display:flex;justify-content:space-between;gap:8px;margin:4px 0}
        .t-line span:first-child{max-width:55mm}.total{font-size:16px;font-weight:700}
        .footer{margin-top:10px;text-align:center;font-size:10px}
        @media print{body{width:80mm}.no-print{display:none}}
      </style></head><body>
      <div class="center">
        <div class="brand">${esc(settings.name)}</div>
        <div>${esc(settings.subtitle)}</div>
        ${settings.address ? `<div class="small">${esc(settings.address)}</div>` : ''}
        ${settings.phone ? `<div class="small">${esc(settings.phone)}</div>` : ''}
      </div>
      <div class="sep"></div>
      <div>Ticket : <b>${esc(ticket.no)}</b></div>
      <div>${esc(ticket.date)} ${esc(ticket.time)}</div>
      <div>Paiement : ${esc(ticket.payment)}</div>
      <div class="sep"></div>
      ${lines}
      <div class="sep"></div>
      <div class="t-line total"><span>TOTAL</span><span>${money(ticket.total)}</span></div>
      <div class="t-line"><span>Reçu</span><span>${money(ticket.received)}</span></div>
      <div class="t-line"><span>Monnaie</span><span>${money(ticket.change)}</span></div>
      <div class="footer">${esc(settings.footer)}</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},250);window.onafterprint=function(){window.close()}}</script>
      </body></html>`);
    win.document.close();
  }

  function getSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem('resto_pos_settings_v1') || '{}'); } catch {}
    return {
      name: s.name || 'VILLA ARTI',
      subtitle: s.subtitle || 'Restaurant • Piscine • Events',
      address: s.address || '',
      phone: s.phone || '',
      footer: s.footer || 'Merci pour votre visite !'
    };
  }

  return { init, renderProducts, add, changeQty, remove, clearCart, renderCart, updateChange, checkout, printLastTicket };
})();
