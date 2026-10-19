/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Server,
  Database,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Check,
  ShieldCheck,
  Zap,
  Info,
  BookOpen
} from 'lucide-react';
import { SUPPORTED_MODELS, DEFAULT_MODEL_ID, PREFERRED_FALLBACK_MODEL_ID, ModelDefinition } from '../../config/models';
import { WritingGuidelinesSettings, ApprovedWritingExample } from '../../types/writingGuidelines';
import { WritingGuidelinesSettingsView } from './WritingGuidelinesSettingsView';
import { SyncStatusWidget } from '../common/SyncStatusWidget';

interface SettingsViewProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => Promise<void>;
  onClearAllData: () => Promise<void>;
  productCount: number;
  lastUsedModel?: string;
  lastRequestedModel?: string;
  lastFallbackOccurred?: boolean;
  lastFallbackReason?: string;
  writingGuidelines: WritingGuidelinesSettings;
  writingExamples: ApprovedWritingExample[];
  onSaveWritingGuidelines: (updated: WritingGuidelinesSettings, updatedExamples?: ApprovedWritingExample[]) => Promise<void>;
  onSaveWritingExample: (example: ApprovedWritingExample) => Promise<void>;
  onDeleteWritingExample: (id: string) => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentModel,
  onModelChange,
  onExportBackup,
  onImportBackup,
  onClearAllData,
  productCount,
  lastUsedModel,
  lastRequestedModel,
  lastFallbackOccurred,
  lastFallbackReason,
  writingGuidelines,
  writingExamples,
  onSaveWritingGuidelines,
  onSaveWritingExample,
  onDeleteWritingExample,
  showToast
}) => {
  const [settingsTab, setSettingsTab] = useState<'system' | 'guidelines'>('system');
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
  const [maxImageDimension, setMaxImageDimension] = useState(1400);

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Settings Navigation Tabs */}
      <div className="flex border-b border-[#E8E4DC] bg-white rounded-xl p-1 gap-2">
        <button
          onClick={() => setSettingsTab('system')}
          className={`flex-1 py-3 px-4 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            settingsTab === 'system'
              ? 'bg-[#1E3A8A] text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>System & Model Configuration</span>
        </button>
        <button
          onClick={() => setSettingsTab('guidelines')}
          className={`flex-1 py-3 px-4 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            settingsTab === 'guidelines'
              ? 'bg-[#1E3A8A] text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Writing Guidelines & Style Profiles</span>
        </button>
      </div>

      <SyncStatusWidget />

      {settingsTab === 'guidelines' ? (
        <WritingGuidelinesSettingsView
          guidelines={writingGuidelines}
          examples={writingExamples}
          onSaveGuidelines={onSaveWritingGuidelines}
          onSaveExample={onSaveWritingExample}
          onDeleteExample={onDeleteWritingExample}
          showToast={showToast}
        />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 shadow-xs">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Studio Settings & Model Configuration
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Centralized Gemini Flash-class model selector, fallback policy, and persistent storage management.
            </p>
          </div>

          {/* Model Selection & Registry Section */}
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

          {/* System Health Status */}
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

          {/* Backup, Restore & Data Management */}
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-[#E8E4DC] pb-4">
              <Database className="w-5 h-5 text-[#1E3A8A]" />
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 leading-tight">
                  Backup, Restore & IndexedDB Storage
                </h3>
                <p className="text-xs text-stone-500">
                  Export complete studio backups (products, gift guides, brain, context profiles, writing guidelines) or restore from JSON.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onExportBackup}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg hover:bg-[#1e3a8aec] shadow-xs transition-all cursor-pointer"
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
                Clearing local storage will reset all products, custom guides, and guidelines to initial default state.
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
              This will clear all saved products, custom gift guides, writing guidelines, and reset the studio. Make sure you have exported a backup first.
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
                Yes, Erase Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
