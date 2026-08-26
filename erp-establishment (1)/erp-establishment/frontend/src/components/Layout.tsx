import { NavLink, Outlet } from "react-router-dom";
import { clearSession, getCurrentUser } from "../lib/api";

const MODULES = [
  { path: "/dashboard", label: "Tableau de bord", ready: true },
  { path: "/pos", label: "POS (caisse)", ready: true },
  { path: "#", label: "Gestion des tables", ready: false },
  { path: "#", label: "Cuisine (KDS)", ready: false },
  { path: "#", label: "Stock", ready: false },
  { path: "#", label: "Achats", ready: false },
  { path: "#", label: "Fournisseurs", ready: false },
  { path: "#", label: "Recettes", ready: false },
  { path: "#", label: "Inventaire", ready: false },
  { path: "#", label: "Comptabilité", ready: false },
  { path: "#", label: "CRM clients", ready: false },
  { path: "#", label: "Fidélité", ready: false },
  { path: "#", label: "Réservations", ready: false },
  { path: "#", label: "Événementiel", ready: false },
  { path: "#", label: "Piscine", ready: false },
  { path: "#", label: "Pâtisserie", ready: false },
  { path: "#", label: "Rapports", ready: false },
  { path: "#", label: "Administration", ready: false },
  { path: "#", label: "Paramètres", ready: false },
];

export default function Layout() {
  const user = getCurrentUser();

  return (
    <div className="flex h-screen bg-paper">
      <aside className="w-64 flex-shrink-0 bg-ink text-paper flex flex-col">
        <div className="px-5 py-6">
          <div className="font-display text-lg font-semibold tracking-tight">ERP Établissement</div>
          <div className="text-xs text-paper/50 mt-0.5">EventFlow · module commun</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {MODULES.map((m) => (
            <NavLink
              key={m.label}
              to={m.ready ? m.path : "#"}
              onClick={(e) => !m.ready && e.preventDefault()}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  m.ready
                    ? isActive
                      ? "bg-amber text-inkdark font-medium"
                      : "text-paper/85 hover:bg-white/10"
                    : "text-paper/30 cursor-not-allowed"
                }`
              }
            >
              <span>{m.label}</span>
              {!m.ready && <span className="text-[10px] font-mono">bientôt</span>}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <div className="text-sm font-medium">{user?.name}</div>
          <div className="text-xs text-paper/50 mb-2">{user?.role}</div>
          <button
            onClick={() => {
              clearSession();
              window.location.href = "/login";
            }}
            className="text-xs text-amber hover:underline"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
