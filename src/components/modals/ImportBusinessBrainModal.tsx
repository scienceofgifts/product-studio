/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BusinessBrainData } from '../../types';
import { BusinessBrainDiffSummary } from '../../utils/businessBrainImportExport';
import { X, CheckCircle2, AlertCircle, Compass, Sparkles, Upload, ChevronDown } from 'lucide-react';

interface ImportBusinessBrainModalProps {
  mergedBrain: BusinessBrainData;
  diffSummary?: BusinessBrainDiffSummary;
  onConfirm: () => void;
  onClose: () => void;
}

export const ImportBusinessBrainModal: React.FC<ImportBusinessBrainModalProps> = ({
  mergedBrain,
  diffSummary,
  onConfirm,
  onClose
}) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#E8E4DC] rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-[#1E3A8A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-200">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold">Import Business Brain Configuration</h3>
              <p className="text-xs text-blue-200">Review proposed knowledge base updates before applying</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-700">
          {/* Version Banner */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-mono">Target Version</span>
              <span className="font-mono font-bold text-[#1E3A8A] text-[12px]">Version {mergedBrain.version}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-mono">Modified Sections</span>
              <span className="font-mono font-bold text-stone-900 text-[12px]">
                {diffSummary?.fieldsModifiedCount || 0} Section(s)
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-mono">Update Timestamp</span>
              <span className="font-mono text-stone-800 text-[11px]">
                {new Date(mergedBrain.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Section Diff Summary */}
          <div className="space-y-2">
            <h4 className="font-serif text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#1E3A8A]" />
              <span>Sections Selected for Update ({diffSummary?.modifiedFieldLabels.length || 0})</span>
            </h4>

            {diffSummary && diffSummary.modifiedFieldLabels.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto p-3 bg-stone-50 border border-stone-200 rounded-xl">
                {diffSummary.modifiedFieldLabels.map((label, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 bg-white border border-stone-200/80 rounded-lg text-xs font-semibold text-stone-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]"></span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic p-3 bg-stone-50 border border-stone-200 rounded-xl">
                No text changes detected compared to current configuration.
              </p>
            )}
          </div>

          {/* Preview Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
              <span>{showPreview ? 'Hide Imported Text Preview' : 'Show Imported Text Preview'}</span>
            </button>

            {showPreview && (
              <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-xl max-h-60 overflow-y-auto space-y-3 font-mono text-[11px]">
                <div>
                  <span className="font-bold text-stone-900 block mb-1">1. Business Positioning & Philosophy:</span>
                  <p className="whitespace-pre-wrap text-stone-700 bg-white p-2.5 rounded border border-stone-200">
                    {mergedBrain.businessPositioning}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-stone-900 block mb-1">4. Editorial Voice & Writing Rules:</span>
                  <p className="whitespace-pre-wrap text-stone-700 bg-white p-2.5 rounded border border-stone-200">
                    {mergedBrain.editorialVoiceAndRules}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl text-sky-950 flex items-start gap-2 text-[11px]">
            <Compass className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Confirming this import will update your active Business Brain in IndexedDB. Non-mentioned fields preserve their current values. Subsequent AI product analyses will consume this updated knowledge base.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-[#FAF8F5] border-t border-[#E8E4DC] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-[#E8E4DC] text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-[#1E3A8A] text-white font-semibold text-xs hover:bg-[#172554] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Apply Import</span>
          </button>
        </div>
      </div>
    </div>
  );
};
