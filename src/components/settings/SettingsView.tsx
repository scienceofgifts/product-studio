/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Server,
  Database,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Check,
  ShieldCheck,
  RotateCcw,
  Save,
  HelpCircle
} from 'lucide-react';
import { SUPPORTED_MODELS, DEFAULT_MODEL_ID, PREFERRED_FALLBACK_MODEL_ID } from '../../config/models';
import { DEFAULT_EDITORIAL_RULES } from '../../data/defaultEditorialRules';
import { SyncStatusWidget } from '../common/SyncStatusWidget';

interface SettingsViewProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  editorialRules: string;
  onSaveEditorialRules: (rules: string) => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => Promise<void>;
  onClearAllData: () => Promise<void>;
  productCount: number;
  lastUsedModel?: string;
  lastRequestedModel?: string;
  lastFallbackOccurred?: boolean;
  lastFallbackReason?: string;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentModel,
  onModelChange,
  editorialRules,
  onSaveEditorialRules,
  onExportBackup,
  onImportBackup,
  onClearAllData,
  productCount,
  lastUsedModel,
  lastRequestedModel,
  lastFallbackOccurred,
  lastFallbackReason,
  showToast
}) => {
  const [rulesDraft, setRulesDraft] = useState<string>(editorialRules);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [healthStatus, setHealthStatus] = useState<{
    status?: string;
    hasApiKey?: boolean;
    defaultModel?: string;
    fallbackModel?: string;
    allowedModels?: string[];
    serverTime?: string;
    error?: string;
  } | null>(null);

  const [verificationResults, setVerificationResults] = useState<Record<string, { available: boolean; latencyMs?: number; error?: string }> | null>(null);
  const [lastVerifiedTime, setLastVerifiedTime] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync draft when prop updates from storage
  useEffect(() => {
    setRulesDraft(editorialRules);
    setHasUnsavedChanges(false);
  }, [editorialRules]);

  const handleRulesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setRulesDraft(nextVal);
    setHasUnsavedChanges(nextVal !== editorialRules);
    setJustSaved(false);
  };

  const handleSaveRules = async () => {
    setIsSavingRules(true);
    try {
      await onSaveEditorialRules(rulesDraft);
      setHasUnsavedChanges(false);
      setJustSaved(true);
      showToast('Global Editorial Rules saved successfully');
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err: any) {
      showToast(err.message || 'Failed to save editorial rules', 'error');
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleResetToDefaults = async () => {
    setRulesDraft(DEFAULT_EDITORIAL_RULES);
    try {
      await onSaveEditorialRules(DEFAULT_EDITORIAL_RULES);
      setHasUnsavedChanges(false);
      setJustSaved(true);
      setShowResetConfirm(false);
      showToast('Reset to recommended editorial rules');
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset editorial rules', 'error');
    }
  };

  const checkServerHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data);
      } else {
        setHealthStatus({ error: `Server responded with status ${res.status}` });
      }

      const modelsRes = await fetch('/api/models');
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        if (modelsData.verification?.results && Object.keys(modelsData.verification.results).length > 0) {
          setVerificationResults(modelsData.verification.results);
          setLastVerifiedTime(modelsData.verification.lastVerified);
        }
      }
    } catch (e: any) {
      setHealthStatus({ error: e.message || 'Failed to reach server API.' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleVerifyModels = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/models/verify', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setVerificationResults(data.results);
        setLastVerifiedTime(data.lastVerified);
      }
    } catch (e) {
      console.error('Failed to verify models:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    checkServerHealth();
  }, []);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          await onImportBackup(text);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  // Word and character counts for the rules text
  const trimmedRules = rulesDraft.trim();
  const wordCount = trimmedRules ? trimmedRules.split(/\s+/).filter(Boolean).length : 0;
  const charCount = rulesDraft.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Studio Settings & Editorial Rules
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage permanent global editorial rules, centralized Gemini model selector, and persistent database storage.
          </p>
        </div>
        <SyncStatusWidget compact={true} />
      </div>

      {/* 1. CANONICAL GLOBAL EDITORIAL RULES */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E4DC] pb-4">
          <div className="flex items-start gap-2.5">
            <FileText className="w-5 h-5 text-[#1E3A8A] mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-stone-900 leading-tight">
                  Global Editorial Rules
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-[#1E3A8A]">
                  Applies Globally
                </span>
                {justSaved && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                These permanent rules govern every product analysis, editorial brief, and generated writing prompt across Science of Gifts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-[#E8E4DC] rounded-md transition-colors cursor-pointer"
              title="Restore standard recommended Science of Gifts rules"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleSaveRules}
              disabled={isSavingRules || (!hasUnsavedChanges && !justSaved)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all shadow-xs cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-[#1E3A8A] text-white hover:bg-[#172554]'
                  : justSaved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
              }`}
            >
              {justSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Rules Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingRules ? 'Saving...' : hasUnsavedChanges ? 'Save Editorial Rules' : 'Saved'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Empty State Warning */}
        {rulesDraft.trim().length === 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Editorial Rules are currently empty.</p>
                <p className="text-amber-800 mt-0.5">
                  Prompts and analyses require core editorial standards to enforce tone, formatting, and avoid banned clichés.
                </p>
              </div>
            </div>
            <button
              onClick={handleResetToDefaults}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-[11px] shrink-0 cursor-pointer"
            >
              Load Recommended Defaults
            </button>
          </div>
        )}

        {/* Precedence Notice */}
        <div className="bg-stone-50 border border-[#E8E4DC] rounded-lg p-3 text-xs text-stone-600 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-semibold text-stone-800">Precedence Hierarchy: </span>
            Verified physical specifications take absolute precedence over editorial styling. Global Editorial Rules below apply by default. Explicit choices selected in the 6-step workflow (target recipient, creative angle, word count) guide the current product.
          </div>
        </div>

        {/* Large Multiline Plain-Text Field */}
        <div className="space-y-1.5">
          <label htmlFor="editorial-rules-textarea" className="block text-xs font-semibold text-stone-700">
            Permanent Editorial Instructions (Plain Text)
          </label>
          <textarea
            id="editorial-rules-textarea"
            rows={18}
            value={rulesDraft}
            onChange={handleRulesChange}
            placeholder="Paste or write your permanent global editorial instructions here..."
            className="w-full p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-stone-800 bg-[#FCFBF9] border border-[#E8E4DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all resize-y shadow-inner"
          />
          <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
            <span>
              {wordCount.toLocaleString()} words &bull; {charCount.toLocaleString()} characters
            </span>
            {hasUnsavedChanges && (
              <span className="text-amber-700 font-medium">
                Unsaved changes &mdash; click Save Editorial Rules above
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. CENTRALIZED MODEL SELECTOR */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E4DC] pb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#1E3A8A]" />
            <div>
              <h3 className="font-serif text-base font-bold text-stone-900 leading-tight">
                Centralized Model Selector
              </h3>
              <p className="text-xs text-stone-500">
                Governs Full Product Analysis, Title Laboratory, Recipient Intelligence, and Writing Briefs.
              </p>
            </div>
          </div>

          <button
            onClick={handleVerifyModels}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
            title="Perform live availability ping test across all approved models"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Testing Models...' : 'Verify Model Availability'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUPPORTED_MODELS.map((m) => {
            const isSelected = currentModel === m.id;
            const status = verificationResults?.[m.id];

            return (
              <div
                key={m.id}
                onClick={() => onModelChange(m.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/70 border-[#1E3A8A] shadow-xs'
                    : 'bg-stone-50/60 border-[#E8E4DC] hover:border-stone-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-serif text-sm font-bold text-stone-900">{m.name}</span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1E3A8A] text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-stone-500">{m.id}</p>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">{m.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">Status:</span>
                  {status ? (
                    status.available ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Available ({status.latencyMs}ms)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold" title={status.error}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Degraded</span>
                      </span>
                    )
                  ) : (
                    <span className="text-stone-400 italic">Not tested</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SYSTEM HEALTH STATUS */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E8E4DC] pb-4">
          <ShieldCheck className="w-5 h-5 text-[#1E3A8A]" />
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900 leading-tight">
              Server Proxy & API Health
            </h3>
            <p className="text-xs text-stone-500">
              Secure server-side proxy route status and API credentials verification.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-stone-50 p-3.5 rounded-lg border border-[#E8E4DC]">
            <span className="text-stone-500 block font-medium">API Key Configured</span>
            <span className={`font-semibold text-sm mt-1 block ${healthStatus?.hasApiKey ? 'text-emerald-700' : 'text-amber-700'}`}>
              {healthStatus?.hasApiKey ? 'Yes (GEMINI_API_KEY active)' : 'Checking...'}
            </span>
          </div>
          <div className="bg-stone-50 p-3.5 rounded-lg border border-[#E8E4DC]">
            <span className="text-stone-500 block font-medium">Default Model ID</span>
            <span className="font-mono font-semibold text-stone-800 mt-1 block truncate">
              {healthStatus?.defaultModel || DEFAULT_MODEL_ID}
            </span>
          </div>
          <div className="bg-stone-50 p-3.5 rounded-lg border border-[#E8E4DC]">
            <span className="text-stone-500 block font-medium">Fallback Model ID</span>
            <span className="font-mono font-semibold text-stone-800 mt-1 block truncate">
              {healthStatus?.fallbackModel || PREFERRED_FALLBACK_MODEL_ID}
            </span>
          </div>
        </div>
      </div>

      {/* 4. CLOUD SYNCHRONIZATION STATUS */}
      <SyncStatusWidget compact={false} />

      {/* 5. BACKUP, RESTORE & DATA MANAGEMENT */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-[#E8E4DC] pb-4">
          <Database className="w-5 h-5 text-[#1E3A8A]" />
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900 leading-tight">
              Backup, Restore & Storage
            </h3>
            <p className="text-xs text-stone-500">
              Export complete studio backups including saved products, editorial rules, gift guides, and context profiles.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg hover:bg-[#172554] shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Complete Studio Backup ({productCount} products)</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 text-stone-800 text-xs font-semibold rounded-lg hover:bg-stone-200 border border-[#E8E4DC] transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-stone-600" />
            <span>Restore from Backup JSON</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <p className="text-xs text-stone-500">
            Clearing local storage will reset all products, custom guides, and rules to default state.
          </p>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Database</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 max-w-sm w-full shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-[#1E3A8A] mb-2">
              <RotateCcw className="w-5 h-5" />
              <h4 className="font-serif text-base font-bold text-stone-900">Reset Editorial Rules?</h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-5">
              This will overwrite your current editorial rules with the recommended Science of Gifts defaults (brand positioning, voice & tone, em-dash ban, factual guardrails).
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors cursor-pointer"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 max-w-sm w-full shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-serif text-base font-bold text-stone-900">Erase All Local Data?</h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-5">
              This will clear all saved products, custom gift guides, and reset the studio. Make sure you have exported a backup first.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onClearAllData();
                  setShowClearConfirm(false);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors cursor-pointer"
              >
                Erase Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
