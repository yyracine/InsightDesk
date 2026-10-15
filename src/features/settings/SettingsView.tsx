import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Save,
  Moon,
  Sun,
  Bot,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { AppSettings } from '../../types';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = { ...formData };
      if (apiKeyInput.trim()) {
        updated.ai_api_key = apiKeyInput.trim();
        updated.ai_api_key_masked = `****${apiKeyInput.slice(-4)}`;
      }
      await onSaveSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <span>Paramètres & Préférences Générales</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gérez vos options d'affichage, devises, formats et fournisseurs d'intelligence augmentée.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Paramètres sauvegardés</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Affichage & Régionalisation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Affichage & Régionalisation</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Thème de l'interface
              </label>
              <select
                value={formData.theme}
                onChange={(e) =>
                  setFormData({ ...formData, theme: e.target.value as any })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="dark">Mode Sombre (Recommandé)</option>
                <option value="light">Mode Clair</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Devise par défaut (Monnaie)
              </label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <optgroup label="Afrique de l'Ouest & CEMAC">
                  <option value="XOF">FCFA — Franc CFA UEMOA (Sénégal, Côte d'Ivoire, Mali, Burkina, Bénin, Togo, Niger, Guinée-Bissau)</option>
                  <option value="GNF">FG — Franc Guinéen (Guinée Conakry)</option>
                  <option value="GHS">GH₵ — Cedi Ghanéen (Ghana)</option>
                  <option value="NGN">₦ — Naira Nigérian (Nigéria)</option>
                  <option value="XAF">FCFA — Franc CFA CEMAC (Cameroun, Gabon, Congo, Tchad, RCA, Guinée Équatoriale)</option>
                  <option value="GMD">D — Dalasi Gambien (Gambie)</option>
                  <option value="CVE">Esc — Escudo Cap-Verdien (Cap-Vert)</option>
                  <option value="LRD">$ — Dollar Libérien (Libéria)</option>
                  <option value="SLE">Le — Leone Sierra-Léonais (Sierra Leone)</option>
                </optgroup>
                <optgroup label="Autres Monnaies Africaines">
                  <option value="MAD">DH — Dirham Marocain (Maroc)</option>
                  <option value="DZD">DA — Dinar Algérien (Algérie)</option>
                  <option value="TND">DT — Dinar Tunisien (Tunisie)</option>
                  <option value="CDF">FC — Franc Congolais (RDC)</option>
                  <option value="KES">KSh — Shilling Kényan (Kenya)</option>
                  <option value="ZAR">R — Rand Sud-Africain (Afrique du Sud)</option>
                </optgroup>
                <optgroup label="Monnaies Internationales">
                  <option value="EUR">€ — Euro (Union Européenne)</option>
                  <option value="USD">$ — Dollar US (États-Unis)</option>
                  <option value="CAD">$ CA — Dollar Canadien (Canada)</option>
                  <option value="GBP">£ — Livre Sterling (Royaume-Uni)</option>
                  <option value="CHF">CHF — Franc Suisse (Suisse)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Format d'affichage des dates
              </label>
              <select
                value={formData.date_format}
                onChange={(e) =>
                  setFormData({ ...formData, date_format: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Standard Européen)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (Standard ISO)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Langue du système
              </label>
              <select
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Fournisseur d'IA & Confidentialité */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span>Configuration de l'Assistant Documentaire</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Contrôlez si les questions sont résolues localement ou envoyées à une API distante.
              </p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zéro fuite par défaut</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Moteur d'assistance sélectionné
            </label>
            <select
              value={formData.ai_provider}
              onChange={(e) =>
                setFormData({ ...formData, ai_provider: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="local_deterministic">
                Moteur Déterministe Local (100% Hors-ligne, Sans API, Gratuit, Recommandé)
              </option>
              <option value="openai_compatible">
                Fournisseur API LLM Compatible OpenAI (Requiert une clé API externe)
              </option>
            </select>
          </div>

          {formData.ai_provider === 'openai_compatible' && (
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL du point de terminaison (Endpoint)
                </label>
                <input
                  type="text"
                  placeholder="https://api.openai.com/v1/chat/completions ou http://localhost:1234/v1/chat/completions"
                  value={formData.ai_endpoint || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, ai_endpoint: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom du Modèle
                  </label>
                  <input
                    type="text"
                    placeholder="gpt-4o-mini ou mistral-7b"
                    value={formData.ai_model || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, ai_model: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Clé API (Optionnelle si serveur local)
                  </label>
                  <input
                    type="password"
                    placeholder={formData.ai_api_key_masked || 'sk-...'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-amber-400">
                ⚠️ Les questions envoyées utiliseront votre quota API auprès du fournisseur configuré.
                Vos clés sont stockées localement dans SQLite sans aucun relais tiers.
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Confidentialité & Télémétrie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Confidentialité & Données Télémétriques</span>
            </h3>
            <p className="text-xs text-slate-400">
              InsightDesk respecte votre vie privée : aucun document ni métrique n'est transmis à des serveurs tiers.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.telemetry_enabled}
              onChange={(e) =>
                setFormData({ ...formData, telemetry_enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les Paramètres'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
