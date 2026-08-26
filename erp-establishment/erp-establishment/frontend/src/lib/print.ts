// Le navigateur ne peut pas parler nativement ESC/POS à une imprimante thermique.
// On envoie un texte de reçu formaté à un petit "print bridge" local (voir README,
// dossier print-bridge/) qui tourne sur le PC caisse et pilote la Xprinter en USB.

const PRINT_BRIDGE_URL = import.meta.env.VITE_PRINT_BRIDGE_URL || "http://localhost:9100/print";

export interface ReceiptLine {
  label: string;
  qty?: number;
  price?: number;
}

export function buildReceiptText(params: {
  establishmentName: string;
  orderNumber: number;
  table?: string;
  lines: ReceiptLine[];
  total: number;
}) {
  const { establishmentName, orderNumber, table, lines, total } = params;
  const width = 32; // largeur standard papier 58mm
  const sep = "-".repeat(width);

  const rows = lines.map((l) => {
    const qtyPart = l.qty ? `${l.qty}x ` : "";
    const pricePart = l.price !== undefined ? `${l.price.toLocaleString()} Ar` : "";
    const left = `${qtyPart}${l.label}`;
    const pad = Math.max(width - left.length - pricePart.length, 1);
    return `${left}${" ".repeat(pad)}${pricePart}`;
  });

  return [
    establishmentName.toUpperCase(),
    sep,
    `Commande n°${orderNumber}${table ? `  Table ${table}` : ""}`,
    sep,
    ...rows,
    sep,
    `TOTAL${" ".repeat(width - 5 - `${total.toLocaleString()} Ar`.length)}${total.toLocaleString()} Ar`,
    sep,
    "Merci de votre visite !",
  ].join("\n");
}

export async function sendToPrinter(text: string) {
  try {
    await fetch(PRINT_BRIDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: text,
    });
  } catch {
    // Bridge non disponible (ex: pas encore installé sur ce poste) -> échec silencieux,
    // le ticket reste consultable/imprimable manuellement.
    console.warn("Print bridge injoignable : impression manuelle nécessaire.");
  }
}
