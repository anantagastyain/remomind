import React, { useState } from 'react';
import {
  X,
  Key,
  Github,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sliders
} from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, currentSettings, onSaveSettings }) {
  const [googleKey, setGoogleKey] = useState(currentSettings?.google_api_key || '');
  const [githubToken, setGithubToken] = useState(currentSettings?.github_token || '');
  const [model, setModel] = useState(currentSettings?.gemma_model || 'gemini-1.5-flash');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const resp = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_api_key: googleKey,
          github_token: githubToken,
          gemma_model: model,
        }),
      });
      if (resp.ok) {
        setStatusMessage({ type: 'success', text: 'Settings saved and connection verified!' });
        if (onSaveSettings) {
          onSaveSettings({ google_api_key: googleKey, github_token: githubToken, gemma_model: model });
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to update settings on the server.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Connection error: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0F172A] border border-cyan-500/30 shadow-2xl shadow-cyan-950/80 overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">RepoMind Platform Settings</h3>
              <p className="text-xs text-slate-400">Configure AI Studio Gemma and GitHub API credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Google AI Studio API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-cyan-400" />
                Google AI Studio API Key (Gemma / Gemini)
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
              >
                Get free key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Powers RepoMind's grounded Gemma Q&A and Hacktoberfest Theme 2 RAG evaluation. When left blank, RepoMind uses high-precision extractive local RAG.
            </p>
          </div>

          {/* Gemma Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Gemma Model Engine
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="gemini-1.5-flash">gemini-1.5-flash (Fastest, High Quota)</option>
              <option value="gemma-2-9b-it">gemma-2-9b-it (Google Gemma 2 9B Instruct)</option>
              <option value="gemma-2-27b-it">gemma-2-27b-it (Google Gemma 2 27B Instruct)</option>
            </select>
          </div>

          {/* GitHub Personal Access Token */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Github className="w-4 h-4 text-violet-400" />
                GitHub Personal Access Token (Optional)
              </label>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:underline flex items-center gap-1 font-medium"
              >
                Create token <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_... or github_pat_..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-violet-400"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Increases GitHub REST API rate limits from 60 to 5,000 requests/hour. (No scopes required for public repositories).
            </p>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
