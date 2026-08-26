import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, saveSession } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@eventflow.mg");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveSession(data.token, data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-2xl font-semibold text-paper tracking-tight">
            ERP Établissement
          </div>
          <div className="text-paper/50 text-sm mt-1">Connexion au poste de caisse</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-paper rounded-2xl p-7 ticket-edge pb-9 shadow-xl">
          <label className="block text-xs font-medium text-inkdark/60 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-3 py-2.5 rounded-lg border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber"
            required
          />
          <label className="block text-xs font-medium text-inkdark/60 mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-5 px-3 py-2.5 rounded-lg border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber"
            required
          />
          {error && <div className="text-red-600 text-xs mb-4">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber hover:bg-amberdark transition-colors text-inkdark font-medium py-2.5 rounded-lg text-sm disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <p className="text-center text-paper/40 text-xs mt-5 font-mono">
          Démo : admin@eventflow.mg / admin123
        </p>
      </div>
    </div>
  );
}
