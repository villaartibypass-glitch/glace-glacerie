// ============================================================
// UI — Rendu des pages, modales, notifications
// ============================================================
const UI = (function () {
  let chartCA = null, chartFC = null;

  // ---- Formatage ----
  function fmtMoney(n) { return Math.round(n).toLocaleString('fr-FR') + ' Ar'; }
  function fmtPct(n) { return n.toFixed(1) + ' %'; }
  function fmtQte(n, unite) {
    const v = Number.isInteger(n) ? n : n.toFixed(2);
    return `${v} ${unite || ''}`.trim();
  }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  // ---- Toast ----
  function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 250); }, 2600);
  }

  // ---- Modal ----
  function openModal(title, bodyHTML, onSave) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    const saveBtn = document.getElementById('modalSaveBtn');
    saveBtn.onclick = () => { if (onSave() !== false) closeModal(); };
    document.getElementById('appModal').classList.add('open');
  }
  function closeModal() { document.getElementById('appModal').classList.remove('open'); }

  // ============================================================ DASHBOARD
  function renderDashboard() {
    const debut = document.getElementById('dashDateDebut').value;
    const fin = document.getElementById('dashDateFin').value;
    const lignes = Store.ventesEnrichies(debut, fin);

    const ca = lignes.reduce((s, l) => s + l.ca, 0);
    const cout = lignes.reduce((s, l) => s + l.coutMat, 0);
    const marge = ca - cout;
    const foodCost = ca > 0 ? (cout / ca) * 100 : 0;
    const couverts = lignes.reduce((s, l) => s + l.quantite, 0);
    const ticket = couverts > 0 ? ca / couverts : 0;
    const valeurStock = Store.db.produits.reduce((s, p) => s + Store.stockFinal(p) * p.prixAchat, 0);

    document.getElementById('kpiCA').textContent = fmtMoney(ca);
    document.getElementById('kpiCout').textContent = fmtMoney(cout);
    document.getElementById('kpiMarge').textContent = fmtMoney(marge);
    document.getElementById('kpiFoodCost').textContent = fmtPct(foodCost);
    document.getElementById('kpiCouverts').textContent = couverts.toLocaleString('fr-FR');
    document.getElementById('kpiTicket').textContent = fmtMoney(ticket);
    document.getElementById('kpiStock').textContent = fmtMoney(valeurStock);

    renderChartCA();
    renderChartFC(lignes);
    renderDashRecette(lignes);
    renderDashAlertes();
  }

  function renderChartCA() {
    if (typeof Chart === 'undefined') return;
    const jours = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      jours.push(d.toISOString().slice(0, 10));
    }
    const parJour = jours.map(j => Store.db.ventes.filter(v => v.date === j).reduce((s, v) => s + v.prixUnit * v.quantite, 0));
    const labels = jours.map(j => j.slice(8, 10) + '/' + j.slice(5, 7));

    const ctx = document.getElementById('chartCA');
    if (chartCA) chartCA.destroy();
    chartCA = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: parJour, backgroundColor: '#d9a441', borderRadius: 4, maxBarThickness: 22 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.raw) } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8c8170', font: { size: 10 } } },
          y: { grid: { color: '#3a3226' }, ticks: { color: '#8c8170', font: { size: 10 }, callback: v => (v / 1000) + 'k' } },
        },
      },
    });
  }

  function renderChartFC(lignes) {
    if (typeof Chart === 'undefined') return;
    const parRecette = {};
    lignes.forEach(l => { parRecette[l.recette?.nom || '—'] = (parRecette[l.recette?.nom || '—'] || 0) + l.ca; });
    const entries = Object.entries(parRecette).sort((a, b) => b[1] - a[1]);
    const palette = ['#d9a441', '#f0c674', '#e0654f', '#6fae6a', '#6a9bd1', '#a389c9', '#c9bda8'];

    const ctx = document.getElementById('chartFC');
    if (chartFC) chartFC.destroy();
    chartFC = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: palette, borderColor: '#201b15', borderWidth: 2 }] },
      options: {
        cutout: '62%', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#c9bda8', font: { size: 11 }, boxWidth: 10, padding: 8 } },
          tooltip: { callbacks: { label: c => `${c.label} : ${fmtMoney(c.raw)}` } },
        },
      },
    });
  }

  function renderDashRecette(lignes) {
    const parRecette = {};
    lignes.forEach(l => {
      const k = l.recetteId;
      if (!parRecette[k]) parRecette[k] = { nom: l.recette?.nom || '—', qte: 0, ca: 0, cout: 0 };
      parRecette[k].qte += l.quantite; parRecette[k].ca += l.ca; parRecette[k].cout += l.coutMat;
    });
    const rows = Object.values(parRecette).sort((a, b) => b.ca - a.ca);
    document.getElementById('tbodyDashRecette').innerHTML = rows.length ? rows.map(r => {
      const marge = r.ca - r.cout; const fc = r.ca > 0 ? (r.cout / r.ca) * 100 : 0;
      return `<tr>
        <td>${esc(r.nom)}</td><td>${r.qte}</td><td>${fmtMoney(r.ca)}</td><td>${fmtMoney(r.cout)}</td>
        <td class="${marge >= 0 ? 'txt-green' : 'txt-red'}">${fmtMoney(marge)}</td>
        <td><span class="pill ${fc <= 30 ? 'pill-green' : fc <= 40 ? 'pill-gold' : 'pill-red'}">${fmtPct(fc)}</span></td>
      </tr>`;
    }).join('') : emptyRow(6, 'Aucune vente sur cette période');
  }

  function renderDashAlertes() {
    const alertes = Store.alertes();
    const el = document.getElementById('dashAlertes');
    if (!alertes.length) { el.innerHTML = `<div class="empty-state">Aucune alerte — les stocks sont au vert.</div>`; return; }
    el.innerHTML = `<div class="alert-list">` + alertes.map(p => {
      const s = Store.stockFinal(p);
      return `<div class="alert-item">
        <div><div class="alert-name">${esc(p.nom)}</div><div class="alert-sub">Seuil : ${fmtQte(p.seuilAlerte, p.unite)}</div></div>
        <div class="alert-qty">${fmtQte(s, p.unite)}</div>
      </div>`;
    }).join('') + `</div>`;
  }

  // ============================================================ VENTES
  function renderVentes() {
    const q = (document.getElementById('searchVente').value || '').toLowerCase();
    const debut = document.getElementById('venteDateDebut').value;
    const fin = document.getElementById('venteDateFin').value;
    let lignes = Store.ventesEnrichies(debut, fin);
    if (q) lignes = lignes.filter(l => (l.recette?.nom || '').toLowerCase().includes(q));

    document.getElementById('ventesTotalCA').textContent = fmtMoney(lignes.reduce((s, l) => s + l.ca, 0));
    document.getElementById('tbodyVentes').innerHTML = lignes.length ? lignes.map(l => `
      <tr>
        <td class="txt-muted">${l.id}</td><td>${fmtDate(l.date)}</td><td>${esc(l.recette?.nom || '—')}</td>
        <td>${l.quantite}</td><td>${fmtMoney(l.prixUnit)}</td><td>${fmtMoney(l.ca)}</td><td>${fmtMoney(l.coutMat)}</td>
        <td class="${l.marge >= 0 ? 'txt-green' : 'txt-red'}">${fmtMoney(l.marge)}</td>
        <td><span class="pill ${l.foodCost <= 30 ? 'pill-green' : l.foodCost <= 40 ? 'pill-gold' : 'pill-red'}">${fmtPct(l.foodCost)}</span></td>
        <td><button class="btn-icon" title="Supprimer" onclick="UI.deleteVente('${l.id}')">✕</button></td>
      </tr>`).join('') : emptyRow(10, 'Aucune vente trouvée');
  }

  function modalVente() {
    const options = Store.db.recettes.map(r => `<option value="${r.id}">${esc(r.nom)} — ${fmtMoney(r.prixVente)}</option>`).join('');
    openModal('Nouvelle vente', `
      <div class="form-grid">
        <label class="field"><span>Recette</span><select id="fVenteRecette">${options}</select></label>
        <label class="field"><span>Quantité</span><input type="number" id="fVenteQte" min="1" value="1"></label>
        <label class="field"><span>Date</span><input type="date" id="fVenteDate" value="${new Date().toISOString().slice(0,10)}"></label>
      </div>`, () => {
      const recetteId = document.getElementById('fVenteRecette').value;
      const rec = Store.recette(recetteId);
      const quantite = parseFloat(document.getElementById('fVenteQte').value) || 0;
      const date = document.getElementById('fVenteDate').value;
      if (!rec || quantite <= 0 || !date) { toast('Merci de compléter tous les champs.', 'error'); return false; }
      Store.addVente({ date, recetteId, quantite, prixUnit: rec.prixVente });
      toast('Vente enregistrée ✓'); renderVentes();
    });
  }

  function deleteVente(id) {
    if (!confirm('Supprimer cette vente ?')) return;
    Store.deleteVente(id); toast('Vente supprimée', 'info'); renderVentes();
  }

  // ============================================================ STOCK
  function renderStock() {
    const q = (document.getElementById('searchStock').value || '').toLowerCase();
    const produits = Store.db.produits.filter(p => p.nom.toLowerCase().includes(q));

    let valeurTotale = 0;
    document.getElementById('tbodyStock').innerHTML = produits.length ? produits.map(p => {
      const entrees = Store.db.mouvements.filter(m => m.produitId === p.id && m.type === 'entrée').reduce((s, m) => s + m.quantite, 0);
      const sorties = Store.db.mouvements.filter(m => m.produitId === p.id && m.type === 'sortie').reduce((s, m) => s + m.quantite, 0) + Store.consommation(p.id);
      const final = Store.stockFinal(p);
      const valeur = final * p.prixAchat;
      valeurTotale += valeur;
      const alerte = p.statut === 'actif' && final <= p.seuilAlerte;
      return `<tr>
        <td class="txt-muted">${p.id}</td><td>${esc(p.nom)}</td><td>${p.unite}</td>
        <td>${fmtQte(p.stockInitial, '')}</td><td class="txt-green">${entrees > 0 ? '+' + fmtQte(entrees, '') : '—'}</td><td class="txt-red">${sorties > 0 ? '-' + fmtQte(sorties, '') : '—'}</td>
        <td class="${alerte ? 'txt-red' : ''}">${fmtQte(final, p.unite)}${alerte ? ' ⚠️' : ''}</td>
        <td>${fmtMoney(valeur)}</td>
        <td><button class="btn-icon" title="Mouvement" onclick="UI.modalMouvement('${p.id}')">↕</button></td>
      </tr>`;
    }).join('') : emptyRow(9, 'Aucun produit trouvé');
    document.getElementById('stockValeurTotal').textContent = fmtMoney(valeurTotale);

    const mvts = [...Store.db.mouvements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
    document.getElementById('tbodyMvt').innerHTML = mvts.length ? mvts.map(m => {
      const p = Store.produit(m.produitId);
      return `<tr>
        <td>${fmtDate(m.date)}</td><td>${esc(p?.nom || '—')}</td>
        <td><span class="pill ${m.type === 'entrée' ? 'pill-green' : 'pill-red'}">${m.type}</span></td>
        <td>${fmtQte(m.quantite, p?.unite)}</td><td class="txt-muted">${esc(m.motif)}</td>
      </tr>`;
    }).join('') : emptyRow(5, 'Aucun mouvement enregistré');
  }

  function modalMouvement(produitId) {
    const p = Store.produit(produitId);
    openModal(`Mouvement de stock — ${p.nom}`, `
      <div class="form-grid">
        <label class="field"><span>Type</span>
          <select id="fMvtType"><option value="entrée">Entrée (livraison)</option><option value="sortie">Sortie (perte, casse…)</option></select>
        </label>
        <label class="field"><span>Quantité (${p.unite})</span><input type="number" id="fMvtQte" min="0.01" step="0.01" value="1"></label>
        <label class="field"><span>Date</span><input type="date" id="fMvtDate" value="${new Date().toISOString().slice(0,10)}"></label>
        <label class="field field-wide"><span>Motif</span><input type="text" id="fMvtMotif" placeholder="Ex. Livraison, perte, casse…"></label>
      </div>`, () => {
      const type = document.getElementById('fMvtType').value;
      const quantite = parseFloat(document.getElementById('fMvtQte').value) || 0;
      const date = document.getElementById('fMvtDate').value;
      const motif = document.getElementById('fMvtMotif').value.trim() || (type === 'entrée' ? 'Livraison' : 'Sortie manuelle');
      if (quantite <= 0 || !date) { toast('Merci de compléter tous les champs.', 'error'); return false; }
      Store.addMouvement({ produitId, type, quantite, date, motif });
      toast('Mouvement enregistré ✓'); renderStock();
    });
  }

  // ============================================================ RECETTES
  function renderRecettes() {
    const rows = Store.db.recettes;
    document.getElementById('tbodyRecettes').innerHTML = rows.length ? rows.map(r => {
      const cout = Store.coutRecette(r); const marge = r.prixVente - cout; const fc = r.prixVente > 0 ? (cout / r.prixVente) * 100 : 0;
      const ingList = r.ingredients.map(i => Store.produit(i.produitId)?.nom).filter(Boolean).join(', ');
      return `<tr>
        <td class="txt-muted">${r.id}</td><td>${esc(r.nom)}</td>
        <td class="txt-muted" style="max-width:220px;white-space:normal">${esc(ingList)}</td>
        <td>${fmtMoney(cout)}</td><td>${fmtMoney(r.prixVente)}</td>
        <td class="${marge >= 0 ? 'txt-green' : 'txt-red'}">${fmtMoney(marge)}</td>
        <td><span class="pill ${fc <= 30 ? 'pill-green' : fc <= 40 ? 'pill-gold' : 'pill-red'}">${fmtPct(fc)}</span></td>
        <td class="row-actions">
          <button class="btn-icon" title="Modifier" onclick="UI.modalRecette('${r.id}')">✎</button>
          <button class="btn-icon" title="Supprimer" onclick="UI.deleteRecette('${r.id}')">✕</button>
        </td>
      </tr>`;
    }).join('') : emptyRow(8, 'Aucune fiche technique — créez la première recette');
  }

  function modalRecette(id) {
    const rec = id ? Store.recette(id) : { nom: '', prixVente: '', ingredients: [] };
    const ingredientRow = (ing = {}) => `
      <div class="ing-row">
        <select class="ing-produit">${Store.db.produits.map(p => `<option value="${p.id}" ${ing.produitId === p.id ? 'selected' : ''}>${esc(p.nom)} (${p.unite})</option>`).join('')}</select>
        <input type="number" class="ing-qte" step="0.01" min="0" placeholder="Qté" value="${ing.qte ?? ''}">
        <button type="button" class="btn-icon" onclick="this.closest('.ing-row').remove()">✕</button>
      </div>`;
    openModal(id ? 'Modifier la recette' : 'Nouvelle recette', `
      <div class="form-grid">
        <label class="field"><span>Nom de la recette</span><input type="text" id="fRecNom" value="${esc(rec.nom)}"></label>
        <label class="field"><span>Prix de vente (Ar)</span><input type="number" id="fRecPrix" min="0" value="${rec.prixVente}"></label>
      </div>
      <div class="ing-block">
        <div class="ing-header"><span>Ingrédients</span><button type="button" class="btn btn-outline btn-sm" onclick="UI.addIngRow()">＋ Ajouter</button></div>
        <div id="ingRows">${rec.ingredients.length ? rec.ingredients.map(i => ingredientRow(i)).join('') : ingredientRow()}</div>
      </div>`, () => {
      const nom = document.getElementById('fRecNom').value.trim();
      const prixVente = parseFloat(document.getElementById('fRecPrix').value) || 0;
      const ingredients = [...document.querySelectorAll('.ing-row')].map(row => ({
        produitId: row.querySelector('.ing-produit').value,
        qte: parseFloat(row.querySelector('.ing-qte').value) || 0,
      })).filter(i => i.qte > 0);
      if (!nom || prixVente <= 0 || !ingredients.length) { toast('Merci de compléter le nom, le prix et au moins un ingrédient.', 'error'); return false; }
      Store.upsertRecette({ id, nom, prixVente, ingredients });
      toast(id ? 'Recette mise à jour ✓' : 'Recette créée ✓'); renderRecettes();
    });
  }
  function addIngRow() {
    document.getElementById('ingRows').insertAdjacentHTML('beforeend', `
      <div class="ing-row">
        <select class="ing-produit">${Store.db.produits.map(p => `<option value="${p.id}">${esc(p.nom)} (${p.unite})</option>`).join('')}</select>
        <input type="number" class="ing-qte" step="0.01" min="0" placeholder="Qté">
        <button type="button" class="btn-icon" onclick="this.closest('.ing-row').remove()">✕</button>
      </div>`);
  }

  function deleteRecette(id) {
    if (!confirm('Supprimer cette recette ?')) return;
    Store.deleteRecette(id); toast('Recette supprimée', 'info'); renderRecettes();
  }

  // ============================================================ PRODUITS
  function renderProduits() {
    const q = (document.getElementById('searchProduit').value || '').toLowerCase();
    const cat = document.getElementById('filterCatProduit').value;
    const rows = Store.db.produits.filter(p => p.nom.toLowerCase().includes(q) && (!cat || p.categorie === cat));
    document.getElementById('tbodyProduits').innerHTML = rows.length ? rows.map(p => `
      <tr>
        <td class="txt-muted">${p.id}</td><td>${esc(p.nom)}</td><td>${esc(p.categorie)}</td><td>${p.unite}</td>
        <td>${fmtMoney(p.prixAchat)}</td><td class="txt-muted">${esc(p.fournisseur)}</td>
        <td><span class="pill ${p.statut === 'actif' ? 'pill-green' : 'pill-muted'}">${p.statut}</span></td>
        <td class="row-actions">
          <button class="btn-icon" title="Modifier" onclick="UI.modalProduit('${p.id}')">✎</button>
          <button class="btn-icon" title="Supprimer" onclick="UI.deleteProduit('${p.id}')">✕</button>
        </td>
      </tr>`).join('') : emptyRow(8, 'Aucun produit trouvé');
  }

  function modalProduit(id) {
    const p = id ? Store.produit(id) : { nom: '', categorie: 'Food', unite: 'kg', prixAchat: '', fournisseur: '', stockInitial: 0, seuilAlerte: 0, statut: 'actif' };
    openModal(id ? 'Modifier le produit' : 'Nouveau produit', `
      <div class="form-grid">
        <label class="field field-wide"><span>Nom du produit</span><input type="text" id="fProdNom" value="${esc(p.nom)}"></label>
        <label class="field"><span>Catégorie</span>
          <select id="fProdCat"><option ${p.categorie==='Food'?'selected':''}>Food</option><option ${p.categorie==='Boisson'?'selected':''}>Boisson</option><option ${p.categorie==='Autre'?'selected':''}>Autre</option></select>
        </label>
        <label class="field"><span>Unité</span><input type="text" id="fProdUnite" value="${esc(p.unite)}" placeholder="kg, L, unité…"></label>
        <label class="field"><span>Prix d'achat (Ar)</span><input type="number" id="fProdPrix" min="0" value="${p.prixAchat}"></label>
        <label class="field"><span>Fournisseur</span><input type="text" id="fProdFourn" value="${esc(p.fournisseur)}"></label>
        <label class="field"><span>Stock initial</span><input type="number" id="fProdStockInit" min="0" step="0.01" value="${p.stockInitial}"></label>
        <label class="field"><span>Seuil d'alerte</span><input type="number" id="fProdSeuil" min="0" step="0.01" value="${p.seuilAlerte}"></label>
        <label class="field"><span>Statut</span>
          <select id="fProdStatut"><option value="actif" ${p.statut==='actif'?'selected':''}>Actif</option><option value="inactif" ${p.statut==='inactif'?'selected':''}>Inactif</option></select>
        </label>
      </div>`, () => {
      const nom = document.getElementById('fProdNom').value.trim();
      const prixAchat = parseFloat(document.getElementById('fProdPrix').value) || 0;
      if (!nom || prixAchat <= 0) { toast('Merci de renseigner au moins le nom et le prix d’achat.', 'error'); return false; }
      Store.upsertProduit({
        id, nom, categorie: document.getElementById('fProdCat').value, unite: document.getElementById('fProdUnite').value.trim() || 'unité',
        prixAchat, fournisseur: document.getElementById('fProdFourn').value.trim(),
        stockInitial: parseFloat(document.getElementById('fProdStockInit').value) || 0,
        seuilAlerte: parseFloat(document.getElementById('fProdSeuil').value) || 0,
        statut: document.getElementById('fProdStatut').value,
      });
      toast(id ? 'Produit mis à jour ✓' : 'Produit créé ✓'); renderProduits();
    });
  }

  function deleteProduit(id) {
    if (!confirm('Supprimer ce produit ?')) return;
    Store.deleteProduit(id); toast('Produit supprimé', 'info'); renderProduits();
  }

  // ---- Utilitaires d'affichage ----
  function emptyRow(colspan, msg) { return `<tr><td colspan="${colspan}" class="empty-state">${esc(msg)}</td></tr>`; }
  function fmtDate(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }

  return {
    toast, closeModal,
    renderDashboard, renderVentes, renderStock, renderRecettes, renderProduits,
    modalVente, deleteVente,
    modalMouvement,
    modalRecette, addIngRow, deleteRecette,
    modalProduit, deleteProduit,
  };
})();
