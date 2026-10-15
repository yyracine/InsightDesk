import React, { useState } from 'react';
import {
  MessageSquareText,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { AssistantMessage, Dataset, Project } from '../../types';

interface AssistantViewProps {
  project: Project | null;
  dataset: Dataset | null;
  onSendMessage: (query: string) => Promise<AssistantMessage>;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  project,
  dataset,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content:
        "Bonjour ! Je suis votre analyste documentaire déterministe. Je peux analyser vos documents, identifier les segments clés, calculer les variations et vérifier la qualité de vos données sans jamais inventer de chiffres. Que souhaitez-vous savoir ?",
      sources: project ? [`Projet : ${project.name}`] : [],
      is_deterministic: true,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const suggestionPrompts = [
    'Résume les principaux enseignements de ce document.',
    'Quels sont les 5 éléments les plus importants (Top catégories) ?',
    'Quelles anomalies ou valeurs atypiques méritent mon attention ?',
    'Quelle est l\'évolution temporelle et la variation récente ?',
  ];

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputQuery;
    if (!text.trim() || isLoading) return;

    const userMsg: AssistantMessage = {
      role: 'user',
      content: text,
      sources: [],
      is_deterministic: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      const reply = await onSendMessage(text);
      setMessages((prev) => [...prev, reply]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Erreur lors de la réponse : ${err?.message || String(err)}`,
          sources: [],
          is_deterministic: true,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Header info */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <MessageSquareText className="w-5 h-5 text-blue-400" />
            <span>Assistant Conversationnel Documentaire</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interrogez vos documents en langage naturel • Moteur déterministe local sans hallucination.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Calculs Certifiés</span>
        </div>
      </div>

      {/* Messages stream */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${
                isUser ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-blue-400 border border-slate-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-lg'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Sources & provenance */}
                {m.sources && m.sources.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider block">
                      Sources & Justifications :
                    </span>
                    {m.sources.map((s, sIdx) => (
                      <div key={sIdx} className="flex items-center space-x-1 text-slate-400">
                        <FileText className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl p-3 w-fit">
            <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
            <span>Calcul et analyse des données en cours...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts */}
      <div className="py-2 flex flex-wrap gap-2 shrink-0">
        {suggestionPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[11px] px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors text-left"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-3 border-t border-slate-800 flex items-center space-x-2 shrink-0"
      >
        <input
          type="text"
          placeholder="Posez une question sur vos documents (ex: Quel est le montant moyen ?)"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
