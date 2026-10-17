/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { BusinessBrainData } from '../../types';
import {
  BookOpen,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  AlertCircle,
  HelpCircle,
  Shield,
  Compass,
  FileCheck,
  Search,
  History,
  Ban
} from 'lucide-react';
import { downloadFile } from '../../utils/exportUtils';
import { validateBusinessBrainImport, BusinessBrainDiffSummary } from '../../utils/businessBrainImportExport';
import { ImportBusinessBrainModal } from '../modals/ImportBusinessBrainModal';
import { SyncStatusWidget } from '../common/SyncStatusWidget';

interface BusinessBrainViewProps {
  brainData: BusinessBrainData;
  onSaveBrain: (updated: BusinessBrainData) => Promise<void>;
  onResetToDefault: () => Promise<void>;
}

export const BusinessBrainView: React.FC<BusinessBrainViewProps> = ({
  brainData,
  onSaveBrain,
  onResetToDefault
}) => {
  const [formData, setFormData] = useState<BusinessBrainData>({ ...brainData });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importModalData, setImportModalData] = useState<{
    mergedBrain: BusinessBrainData;
    diffSummary?: BusinessBrainDiffSummary;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof BusinessBrainData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSaveBrain(formData);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportBrainJSON = () => {
    const jsonStr = JSON.stringify(formData, null, 2);
    downloadFile(jsonStr, `science_of_gifts_business_brain_v${formData.version}.json`, 'application/json;charset=utf-8;');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setImportError(null);
    const file = e.target.files[0];
    try {
      const text = await file.text();
      const validation = validateBusinessBrainImport(text, formData);
      if (!validation.isValid || !validation.mergedBrain) {
        setImportError(validation.error || 'Failed to validate Business Brain JSON file.');
        return;
      }
      setImportModalData({
        mergedBrain: validation.mergedBrain,
        diffSummary: validation.diffSummary
      });
    } catch (err: any) {
      setImportError(`Failed to read file: ${err.message || 'Unknown error'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importModalData) return;
    setIsSaving(true);
    try {
      const { mergedBrain } = importModalData;
      setFormData(mergedBrain);
      await onSaveBrain(mergedBrain);
      setImportModalData(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setImportError(`Failed to save imported Business Brain: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    {
      key: 'businessPositioning' as const,
      label: '1. Business Positioning & Philosophy',
      description: 'How Science of Gifts differs fundamentally from conventional commodity ecommerce stores.',
      icon: Compass,
      rows: 4
    },
    {
      key: 'websiteShopStructure' as const,
      label: '2. Website & Shop Structure',
      description: 'The operational dynamic between editorial gift-guide articles and the print-on-demand shop.',
      icon: BookOpen,
      rows: 3
    },
    {
      key: 'targetAudiences' as const,
      label: '3. Target Audiences & Sub-Niche Distinctions',
      description: 'Specialist niches and vital distinctions (e.g., Norse history vs mythology vs aesthetic).',
      icon: Shield,
      rows: 5
    },
    {
      key: 'editorialVoiceAndRules' as const,
      label: '4. Editorial Voice & Writing Rules',
      description: 'Core tone principles: writing for the buyer while honoring recipient nuance.',
      icon: FileCheck,
      rows: 4
    },
    {
      key: 'giftGuidePhilosophy' as const,
      label: '5. Gift-Guide Philosophy',
      description: 'Why items deserve inclusion, variety balance, and avoidance of catalog dumps.',
      icon: Compass,
      rows: 4
    },
    {
      key: 'productPositioningPrinciples' as const,
      label: '6. Product-Positioning Principles',
      description: 'Treating products as an "insider handshake", highlighting authentic design subtleties.',
      icon: Shield,
      rows: 4
    },
    {
      key: 'seoPrinciples' as const,
      label: '7. SEO Principles & Discovery',
      description: 'Search intent focused on gift buyers, zero keyword stuffing, no fabricated search metrics.',
      icon: Search,
      rows: 3
    },
    {
      key: 'knownCollections' as const,
      label: '8. Known Product Collections',
      description: 'Existing design themes, series, and historical catalog lines.',
      icon: BookOpen,
      rows: 4
    },
    {
      key: 'historicalCulturalAccuracy' as const,
      label: '9. Historical & Cultural Accuracy Requirements',
      description: 'Distinguishing archaeological facts from romanticized tropes, verification rules.',
      icon: History,
      rows: 4
    },
    {
      key: 'prohibitedPatterns' as const,
      label: '10. Prohibited Writing Patterns & Clichés',
      description: 'Strictly banned marketing hype, sales slogans, and generic AI filler phrases.',
      icon: Ban,
      rows: 4
    },
    {
      key: 'additionalInstructions' as const,
      label: '11. Additional Instructions for Analysis Engine',
      description: 'Global directives injected into the model system instruction on every run.',
      icon: HelpCircle,
      rows: 3
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Import Modal */}
      {importModalData && (
        <ImportBusinessBrainModal
          mergedBrain={importModalData.mergedBrain}
          diffSummary={importModalData.diffSummary}
          onConfirm={handleConfirmImport}
          onClose={() => setImportModalData(null)}
        />
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Header Card */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Business Brain
            </h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-blue-50 text-[#1E3A8A] rounded-md border border-blue-200">
              Version {brainData.version}
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Last persistent update: {new Date(brainData.lastUpdated).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportBrainJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 rounded-md transition-colors cursor-pointer shadow-2xs"
            title="Export complete Business Brain configuration as JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#1E3A8A]" />
            <span>Export (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 rounded-md transition-colors cursor-pointer shadow-2xs"
            title="Import Business Brain configuration JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-[#1E3A8A]" />
            <span>Import (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      <SyncStatusWidget />

      {/* Error Alert */}
      {importError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{importError}</span>
          </div>
          <button onClick={() => setImportError(null)} className="text-red-600 hover:text-red-900 font-bold">×</button>
        </div>
      )}

      {/* Persistence Notice */}
      <div className="p-4 bg-sky-50/60 border border-sky-200/60 rounded-xl text-xs text-sky-950 flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold block mb-0.5">Authoritative Business Knowledge Base:</span>
          This is a manually curated knowledge repository consumed directly by the Gemini reasoning pipeline during product analyses.
          Saving updates will increment the Brain version and preserve your editorial policies persistently in IndexedDB.
          The AI is strictly prohibited from silently modifying these rules.
        </div>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.key}
              className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs transition-colors hover:border-stone-400"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="p-2 bg-[#FAF8F5] border border-stone-200 rounded-lg text-[#1E3A8A] shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 leading-tight">
                    {cat.label}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {cat.description}
                  </p>
                </div>
              </div>

              <textarea
                rows={cat.rows}
                value={formData[cat.key]}
                onChange={(e) => handleFieldChange(cat.key, e.target.value)}
                className="w-full mt-2 p-3 text-xs leading-relaxed text-stone-800 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] focus:bg-white font-sans transition-colors"
              />
            </div>
          );
        })}

        {/* Sticky Save Bar */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md border border-[#E8E4DC] rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div className="text-xs text-stone-600">
            {saveSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <Check className="w-4 h-4" />
                <span>Business Brain v{formData.version + 1} saved successfully to IndexedDB!</span>
              </span>
            ) : (
              <span>Ready to save editorial rules for future product analyses.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-60 rounded-md transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save & Increment Version'}</span>
          </button>
        </div>
      </form>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 max-w-md w-full shadow-xl animate-in fade-in duration-150">
            <h4 className="font-serif text-base font-bold text-stone-900 mb-2">Reset Business Brain to Initial Defaults?</h4>
            <p className="text-xs text-stone-600 leading-relaxed mb-5">
              This will restore all 11 categories to the pristine default editorial guidelines provided in the Science of Gifts specification. Any custom rules you added will be replaced.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onResetToDefault();
                  setShowResetConfirm(false);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
