/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExportedWritingConfiguration, GuidelinesDiffSummary } from '../../utils/writingGuidelinesImportExport';
import { X, CheckCircle2, AlertCircle, FileText, Sparkles, BookOpen, Download, Upload, ArrowRight } from 'lucide-react';

interface ImportWritingGuidelinesModalProps {
  payload: ExportedWritingConfiguration;
  diffSummary?: GuidelinesDiffSummary;
  onConfirm: () => void;
  onClose: () => void;
}

export const ImportWritingGuidelinesModal: React.FC<ImportWritingGuidelinesModalProps> = ({
  payload,
  diffSummary,
  onConfirm,
  onClose
}) => {
  const [showDetails, setShowDetails] = useState(false);

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
              <h3 className="font-serif text-lg font-bold">Import Writing Guidelines & Style Profiles</h3>
              <p className="text-xs text-blue-200">Review proposed configuration changes before applying</p>
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
          {/* Metadata Banner */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-mono">Format</span>
              <span className="font-mono font-bold text-stone-900 text-[11px] truncate block">{payload.formatIdentifier}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-mono">Version</span>
              <span className="font-mono font-bold text-[#1E3A8A] text-[11px]">{payload.schemaVersion}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-mono">Export Date</span>
              <span className="font-mono text-stone-800 text-[11px]">
                {payload.exportTimestamp ? new Date(payload.exportTimestamp).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          {/* Change Impact Summary */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#1E3A8A]" />
              <span>Import Impact & Diff Summary</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-[#E8E4DC] rounded-xl flex items-start gap-2.5">
                <div className={`p-1.5 rounded-lg ${diffSummary?.universalRulesChanged ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 block text-xs">Universal Rules</span>
                  <span className="text-[11px] text-stone-500">
                    {diffSummary?.universalRulesChanged ? 'Will be updated' : 'Identical to current'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E8E4DC] rounded-xl flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-100 text-[#1E3A8A]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 block text-xs">Content Profiles</span>
                  <span className="text-[11px] text-stone-500">
                    {diffSummary?.contentTypeProfilesModified?.length || 0} profile(s) modified
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E8E4DC] rounded-xl flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-900">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 block text-xs">Approved Examples</span>
                  <span className="text-[11px] text-stone-500">
                    {payload.examples.length} example(s) total
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showDetails ? 'Hide Imported Configuration Preview' : 'Show Imported Configuration Preview'}</span>
            </button>

            {showDetails && (
              <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-xl max-h-60 overflow-y-auto space-y-3 font-mono text-[11px]">
                <div>
                  <span className="font-bold text-stone-900 block mb-1">Universal Guidelines:</span>
                  <p className="whitespace-pre-wrap text-stone-700 bg-white p-2.5 rounded border border-stone-200">
                    {payload.guidelines.universalGuidelines}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-stone-900 block mb-1">Voice & Tone:</span>
                  <p className="text-stone-700 bg-white p-2.5 rounded border border-stone-200">
                    {payload.guidelines.voiceAndTone}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-stone-900 block mb-1">Imported Examples ({payload.examples.length}):</span>
                  <ul className="list-disc pl-4 space-y-1 text-stone-700">
                    {payload.examples.map((ex, i) => (
                      <li key={i}>
                        <strong>{ex.title}</strong> ({ex.contentType || 'general'})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 flex items-start gap-2 text-[11px]">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Applying this import will replace your active writing rules and style profiles in the workspace. You can click <strong>Save Changes</strong> to make them permanent or click <strong>Restore Defaults</strong> at any time.
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
