import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Summary {
  revenueToday: number;
  ordersToday: number;
  avgTicket: number;
  openTables: number;
  openOrders: number;
  salesByHour: { hour: number; total: number }[];
  topProducts: { id: string; name: string; price: number; quantity: number }[];
}

function StatCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-white rounded-xl border border-line p-5">
      <div className="text-xs uppercase tracking-wide text-inkdark/50 font-medium mb-2">{label}</div>
      <div className="font-mono text-2xl font-semibold text-inkdark">
        {value}
        {suffix && <span className="text-sm text-inkdark/40 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/dashboard/summary")
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>;
  if (!summary) return <div className="p-8 text-inkdark/40 text-sm">Chargement...</div>;

  const maxHourTotal = Math.max(...summary.salesByHour.map((h) => h.total), 1);
  const activeHours = summary.salesByHour.filter((h) => h.hour >= 6 && h.hour <= 23);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-inkdark mb-1">Tableau de bord</h1>
      <p className="text-inkdark/50 text-sm mb-6">Aujourd'hui</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Chiffre d'affaires" value={`${summary.revenueToday.toLocaleString()}`} suffix="Ar" />
        <StatCard label="Commandes" value={`${summary.ordersToday}`} />
        <StatCard label="Ticket moyen" value={`${Math.round(summary.avgTicket).toLocaleString()}`} suffix="Ar" />
        <StatCard label="Tables occupées" value={`${summary.openTables}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-line p-6">
          <div className="text-sm font-medium text-inkdark mb-4">Ventes par heure</div>
          <div className="flex items-end gap-1.5 h-40">
            {activeHours.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div
                  className="w-full bg-amber/80 group-hover:bg-amber rounded-t-sm transition-colors"
                  style={{ height: `${(h.total / maxHourTotal) * 100}%`, minHeight: h.total > 0 ? 4 : 1 }}
                  title={`${h.total.toLocaleString()} Ar`}
                />
                <div className="text-[10px] font-mono text-inkdark/40">{h.hour}h</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-line p-6">
          <div className="text-sm font-medium text-inkdark mb-4">Top produits</div>
          <div className="space-y-3">
            {summary.topProducts.length === 0 && (
              <div className="text-xs text-inkdark/40">Aucune vente pour l'instant</div>
            )}
            {summary.topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-inkdark/30 w-4">{i + 1}</span>
                  <span className="text-inkdark">{p.name}</span>
                </div>
                <span className="font-mono text-xs text-inkdark/50">×{p.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
