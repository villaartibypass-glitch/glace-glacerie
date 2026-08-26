// ============================================================
// STORE — Persistance (localStorage) & logique métier
// ============================================================
const Store = (function () {
  const KEY = 'resto_ctrl_v1';
  let db = { produits: [], recettes: [], ventes: [], mouvements: [] };

  function normalizeData(data) {
    if (!data || !Array.isArray(data.produits) || !Array.isArray(data.recettes) ||
        !Array.isArray(data.ventes) || !Array.isArray(data.mouvements)) return null;

    // Compatibilité avec l'ancienne structure du fichier.
    const produits = data.produits.map((p, i) => ({
      id: p.id || `p${i+1}`,
      nom: p.nom || 'Produit',
      categorie: p.categorie || 'Food',
      unite: p.unite || 'unité',
      prixAchat: Number(p.prixAchat ?? 0),
      fournisseur: p.fournisseur || '',
      stockInitial: Number(p.stockInitial ?? 0),
      seuilAlerte: Number(p.seuilAlerte ?? 0),
      statut: p.statut || (p.actif === false ? 'inactif' : 'actif')
    }));

    const idMap = new Map();
    data.produits.forEach((p, i) => idMap.set(p.id, produits[i].id));

    const recettes = data.recettes.map((r, i) => ({
      id: r.id || `r${i+1}`,
      nom: r.nom || 'Recette',
      prixVente: Number(r.prixVente ?? r.prixUnitaire ?? 0),
      ingredients: (r.ingredients || []).map(ing => ({
        produitId: idMap.get(ing.produitId ?? ing.idProduit) || ing.produitId || ing.idProduit,
        qte: Number(ing.qte ?? ing.quantite ?? 0)
      })).filter(ing => ing.produitId && ing.qte > 0)
    }));

    const recetteIds = new Set(recettes.map(r => r.id));
    const ventes = data.ventes.map((v, i) => ({
      id: v.id || `v${i+1}`,
      date: v.date || new Date().toISOString().slice(0,10),
      recetteId: v.recetteId || v.idRecette,
      quantite: Number(v.quantite ?? v.qteVendue ?? 0),
      prixUnit: Number(v.prixUnit ?? v.prixUnitaire ?? 0),
      ...(v.ticketId ? {ticketId:v.ticketId} : {}),
      ...(v.paymentMode ? {paymentMode:v.paymentMode} : {})
    })).filter(v => recetteIds.has(v.recetteId) && v.quantite > 0);

    return { produits, recettes, ventes, mouvements: data.mouvements || [] };
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const normalized = normalizeData(JSON.parse(raw));
        if (normalized) { db = normalized; save(); return; }
      } catch (e) { /* données corrompues -> reset */ }
    }
    db = JSON.parse(JSON.stringify(DB_DEFAULT));
    save();
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function nextId(list, prefix) {
    let max = 0;
    list.forEach(x => { const n = parseInt(String(x.id).replace(prefix, ''), 10); if (n > max) max = n; });
    return prefix + (max + 1);
  }

  // ---- Lecture ----
  function produit(id) { return db.produits.find(p => p.id === id); }
  function recette(id) { return db.recettes.find(r => r.id === id); }

  // ---- Calculs métier ----
  function coutRecette(rec) {
    return rec.ingredients.reduce((s, ing) => {
      const p = produit(ing.produitId);
      return s + (p ? p.prixAchat * ing.qte : 0);
    }, 0);
  }

  function ligneVente(v) {
    const rec = recette(v.recetteId);
    const ca = v.prixUnit * v.quantite;
    const coutUnitaire = rec ? coutRecette(rec) : 0;
    const coutMat = coutUnitaire * v.quantite;
    const marge = ca - coutMat;
    const foodCost = ca > 0 ? (coutMat / ca) * 100 : 0;
    return { ...v, recette: rec, ca, coutMat, marge, foodCost };
  }

  function ventesEnrichies(dateDebut, dateFin) {
    return db.ventes
      .filter(v => (!dateDebut || v.date >= dateDebut) && (!dateFin || v.date <= dateFin))
      .map(ligneVente)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function consommation(produitId) {
    // Quantité de ce produit consommée par toutes les ventes enregistrées
    let total = 0;
    db.ventes.forEach(v => {
      const rec = recette(v.recetteId);
      if (!rec) return;
      rec.ingredients.forEach(ing => { if (ing.produitId === produitId) total += ing.qte * v.quantite; });
    });
    return total;
  }

  function mouvementsProduit(produitId, type) {
    return db.mouvements.filter(m => m.produitId === produitId && m.type === type).reduce((s, m) => s + m.quantite, 0);
  }

  function stockFinal(p) {
    const entrees = mouvementsProduit(p.id, 'entrée');
    const sorties = mouvementsProduit(p.id, 'sortie');
    return p.stockInitial + entrees - sorties - consommation(p.id);
  }

  function alertes() {
    return db.produits.filter(p => p.statut === 'actif' && stockFinal(p) <= p.seuilAlerte);
  }

  // ---- Écriture ----
  function upsertProduit(data) {
    if (data.id) { Object.assign(produit(data.id), data); }
    else { data.id = nextId(db.produits, 'p'); db.produits.push(data); }
    save();
  }
  function deleteProduit(id) { db.produits = db.produits.filter(p => p.id !== id); save(); }

  function upsertRecette(data) {
    if (data.id) { Object.assign(recette(data.id), data); }
    else { data.id = nextId(db.recettes, 'r'); db.recettes.push(data); }
    save();
  }
  function deleteRecette(id) { db.recettes = db.recettes.filter(r => r.id !== id); save(); }

  function addVente(data) { data.id = nextId(db.ventes, 'v'); db.ventes.push(data); save(); }
  function deleteVente(id) { db.ventes = db.ventes.filter(v => v.id !== id); save(); }

  function addMouvement(data) { data.id = nextId(db.mouvements, 'm'); db.mouvements.push(data); save(); }

  // ---- Import / Export ----
  function exportJSON() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `controle-resto-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(text) {
    try {
      const data = JSON.parse(text);
      if (!data.produits || !data.recettes || !data.ventes || !data.mouvements) return false;
      db = data; save(); return true;
    } catch (e) { return false; }
  }

  function reset() {
    db = JSON.parse(JSON.stringify(DB_DEFAULT));
    save();
  }

  return {
    load, save, get db() { return db; },
    produit, recette, coutRecette, ligneVente, ventesEnrichies,
    consommation, stockFinal, alertes,
    upsertProduit, deleteProduit, upsertRecette, deleteRecette,
    addVente, deleteVente, addMouvement,
    exportJSON, importJSON, reset,
  };
})();
