// ============================================================
// DONNEES INITIALES — structure normalisée utilisée par Store
// ============================================================
const DB_DEFAULT = {
  produits: [
    { id:'p1', nom:'Pomme de terre', categorie:'Food', unite:'kg', prixAchat:1500, fournisseur:'Fournisseur A', stockInitial:10, seuilAlerte:2, statut:'actif' },
    { id:'p2', nom:'Échine de porc', categorie:'Food', unite:'kg', prixAchat:20000, fournisseur:'Fournisseur B', stockInitial:5, seuilAlerte:1, statut:'actif' },
    { id:'p3', nom:'Huile', categorie:'Food', unite:'L', prixAchat:8000, fournisseur:'Fournisseur C', stockInitial:3, seuilAlerte:0.5, statut:'actif' },
    { id:'p4', nom:'Boisson gazeuse', categorie:'Boisson', unite:'bouteille', prixAchat:2000, fournisseur:'Fournisseur D', stockInitial:0, seuilAlerte:5, statut:'actif' }
  ],
  recettes: [
    { id:'r1', nom:'Échine + frites', prixVente:8000, ingredients:[
      { produitId:'p2', qte:0.20 },
      { produitId:'p1', qte:0.30 },
      { produitId:'p3', qte:0.05 }
    ]}
  ],
  ventes: [
    { id:'v1', date:'2026-01-01', recetteId:'r1', quantite:10, prixUnit:8000 }
  ],
  mouvements: [],
  nextIds:{produit:1, recette:1, vente:1, mouvement:0}
};
