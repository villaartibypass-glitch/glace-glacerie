import { useEffect, useMemo, useState } from "react";
import { apiFetch, getCurrentUser } from "../lib/api";
import { buildReceiptText, sendToPrinter } from "../lib/print";

interface Product {
  id: string;
  name: string;
  price: number;
  station: string;
}
interface Category {
  id: string;
  name: string;
  color: string;
  products: Product[];
}
interface Table {
  id: string;
  label: string;
  seats: number;
  status: string;
}
interface Zone {
  id: string;
  name: string;
  tables: Table[];
}
interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string | number;
  product: Product;
}
interface Order {
  id: string;
  number: number;
  status: string;
  table?: Table | null;
  items: OrderItem[];
}

export default function POS() {
  const user = getCurrentUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState<"CASH" | "CARD" | "MOBILE_MONEY">("CASH");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/pos/catalogue").then((cats) => {
      setCategories(cats);
      if (cats.length) setActiveCategory(cats[0].id);
    });
    apiFetch("/pos/tables").then(setZones);
  }, []);

  const total = useMemo(
    () => (order ? order.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0) : 0),
    [order]
  );

  async function startOrder(tableId?: string) {
    setError(null);
    try {
      const newOrder = await apiFetch("/pos/orders", {
        method: "POST",
        body: JSON.stringify({ tableId }),
      });
      setOrder({ ...newOrder, items: [] });
      setShowTablePicker(false);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function addProduct(product: Product) {
    if (!order) {
      setShowTablePicker(true);
      return;
    }
    try {
      await apiFetch(`/pos/orders/${order.id}/items`, {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const refreshed = await apiFetch(`/pos/orders/${order.id}`);
      setOrder(refreshed);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function removeItem(itemId: string) {
    if (!order) return;
    await apiFetch(`/pos/orders/${order.id}/items/${itemId}`, { method: "DELETE" });
    const refreshed = await apiFetch(`/pos/orders/${order.id}`);
    setOrder(refreshed);
  }

  async function sendToKitchen() {
    if (!order) return;
    const refreshed = await apiFetch(`/pos/orders/${order.id}/send`, { method: "POST" });
    setOrder(refreshed);
  }

  async function confirmPayment() {
    if (!order) return;
    await apiFetch(`/pos/orders/${order.id}/pay`, {
      method: "POST",
      body: JSON.stringify({ method: payMethod, amount: total }),
    });

    const receipt = buildReceiptText({
      establishmentName: "EventFlow",
      orderNumber: order.number,
      table: order.table?.label,
      lines: order.items.map((i) => ({
        label: i.product.name,
        qty: i.quantity,
        price: Number(i.unitPrice) * i.quantity,
      })),
      total,
    });
    await sendToPrinter(receipt);

    setShowPay(false);
    setOrder(null);
  }

  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <div className="flex h-full">
      {/* Colonne produits */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-semibold text-inkdark">Caisse</h1>
          <button
            onClick={() => setShowTablePicker(true)}
            className="text-xs font-mono px-3 py-1.5 rounded-full bg-ink text-paper hover:bg-inkdark"
          >
            {order?.table ? `Table ${order.table.label}` : order ? "À emporter" : "Choisir une table"}
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeCategory === c.id ? "bg-amber text-inkdark font-medium" : "bg-white border border-line text-inkdark/70"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1">
          {activeCat?.products.map((p) => (
            <button
              key={p.id}
              onClick={() => addProduct(p)}
              className="bg-white border border-line rounded-xl p-4 text-left hover:border-amber hover:shadow-sm transition-all"
            >
              <div className="text-sm font-medium text-inkdark mb-2">{p.name}</div>
              <div className="font-mono text-xs text-amberdark">{p.price.toLocaleString()} Ar</div>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket / panier */}
      <div className="w-80 flex-shrink-0 border-l border-line bg-paperdim p-5 flex flex-col">
        <div className="bg-white rounded-lg ticket-edge pb-6 flex-1 flex flex-col overflow-hidden mb-4">
          <div className="px-4 pt-4 pb-3">
            <div className="font-mono text-xs text-inkdark/40">
              {order ? `Commande n°${order.number}` : "Aucune commande en cours"}
            </div>
          </div>
          <div className="ticket-perforation mx-4" />
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {order?.items.length === 0 && (
              <div className="text-xs text-inkdark/30 text-center pt-6">Ajoutez des articles</div>
            )}
            {order?.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm group">
                <div>
                  <span className="font-mono text-xs text-inkdark/40 mr-1.5">{item.quantity}×</span>
                  {item.product.name}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-inkdark/60">
                    {(Number(item.unitPrice) * item.quantity).toLocaleString()}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-inkdark/20 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm text-inkdark/60">Total</span>
          <span className="font-mono text-lg font-semibold text-inkdark">{total.toLocaleString()} Ar</span>
        </div>

        {error && <div className="text-red-600 text-xs mb-3">{error}</div>}

        <button
          onClick={sendToKitchen}
          disabled={!order || order.items.length === 0}
          className="w-full mb-2 py-2.5 rounded-lg border border-ink text-ink text-sm font-medium disabled:opacity-30"
        >
          Envoyer en cuisine
        </button>
        <button
          onClick={() => setShowPay(true)}
          disabled={!order || order.items.length === 0}
          className="w-full py-2.5 rounded-lg bg-amber hover:bg-amberdark text-inkdark font-medium text-sm disabled:opacity-30"
        >
          Encaisser
        </button>
      </div>

      {showTablePicker && (
        <Modal onClose={() => setShowTablePicker(false)}>
          <h2 className="font-display font-semibold text-inkdark mb-4">Choisir une table</h2>
          <button
            onClick={() => startOrder(undefined)}
            className="w-full mb-3 py-2.5 rounded-lg border border-line text-sm text-inkdark hover:border-amber"
          >
            À emporter (sans table)
          </button>
          {zones.map((zone) => (
            <div key={zone.id} className="mb-3">
              <div className="text-xs uppercase text-inkdark/40 font-medium mb-1.5">{zone.name}</div>
              <div className="grid grid-cols-4 gap-2">
                {zone.tables.map((t) => (
                  <button
                    key={t.id}
                    disabled={t.status === "OCCUPIED"}
                    onClick={() => startOrder(t.id)}
                    className={`py-2 rounded-lg text-sm font-mono ${
                      t.status === "OCCUPIED"
                        ? "bg-inkdark/10 text-inkdark/30 cursor-not-allowed"
                        : "bg-paper border border-line hover:border-amber text-inkdark"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      )}

      {showPay && order && (
        <Modal onClose={() => setShowPay(false)}>
          <h2 className="font-display font-semibold text-inkdark mb-1">Encaissement</h2>
          <div className="font-mono text-2xl font-semibold text-inkdark mb-5">{total.toLocaleString()} Ar</div>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {(["CASH", "CARD", "MOBILE_MONEY"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPayMethod(m)}
                className={`py-2 rounded-lg text-xs font-medium ${
                  payMethod === m ? "bg-amber text-inkdark" : "bg-paper border border-line text-inkdark/60"
                }`}
              >
                {m === "CASH" ? "Espèces" : m === "CARD" ? "Carte" : "Mobile Money"}
              </button>
            ))}
          </div>
          <button
            onClick={confirmPayment}
            className="w-full py-2.5 rounded-lg bg-ink text-paper font-medium text-sm"
          >
            Confirmer et imprimer le ticket
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-inkdark/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
