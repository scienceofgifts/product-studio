/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Download,
  Copy,
  Check,
  Edit3,
  RefreshCw,
  AlertCircle,
  FileCheck2,
  BookOpen,
  Eye
} from 'lucide-react';
import { WorkflowState } from '../../types/workflow';
import { BusinessBrainData, WritingGuidelinesSettings } from '../../types';
import { downloadFile } from '../../utils/exportUtils';

interface Step5EditorialBriefProps {
  state: WorkflowState;
  onBriefChange: (briefMarkdown: string) => void;
  onGenerateBrief: () => void;
  isGeneratingBrief: boolean;
  onBack: () => void;
  onNext: () => void;
}

export const Step5EditorialBrief: React.FC<Step5EditorialBriefProps> = ({
  state,
  onBriefChange,
  onGenerateBrief,
  isGeneratingBrief,
  onBack,
  onNext
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasBrief = Boolean(state.editorialBriefMarkdown && state.editorialBriefMarkdown.trim().length > 0);

  const handleCopyBrief = () => {
    if (!state.editorialBriefMarkdown) return;
    navigator.clipboard.writeText(state.editorialBriefMarkdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadBrief = () => {
    if (!state.editorialBriefMarkdown) return;
    const titleSlug = (state.editorialSelections.selectedTitle || state.details.workingName || 'editorial_brief')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 30);
    downloadFile(state.editorialBriefMarkdown, `${titleSlug}_editorial_brief.md`, 'text/markdown;charset=utf-8;');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Step Header */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center">
              5
            </span>
            <h2 className="font-serif font-bold text-lg text-stone-900">
              Consolidated Editorial Writing Brief
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Synthesizes confirmed product specifications, your editorial decisions, recipient profiles, and formatting rules.
          </p>
        </div>

        {hasBrief && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                isEditing
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Viewing Mode' : 'Edit Brief'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyBrief}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadBrief}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors shadow-2xs"
              title="Download as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        )}
      </div>

      {/* Upstream Changed Notification */}
      {state.isBriefStale && hasBrief && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Upstream inputs or editorial decisions have changed since this brief was generated.
            </span>
          </div>
          <button
            type="button"
            onClick={onGenerateBrief}
            disabled={isGeneratingBrief}
            className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-xs transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBrief ? 'animate-spin' : ''}`} />
            <span>Update Brief</span>
          </button>
        </div>
      )}

      {/* Empty State: Ready to Generate */}
      {!hasBrief ? (
        <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-8 sm:p-12 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-[#1E3A8A] mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Ready to Consolidate Editorial Brief
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Your product inputs, confirmed specifications, creative angles, recipient profiles, and style rules are ready to be consolidated into a standalone brief.
            </p>
          </div>

          {/* Quick Recap Chips */}
          <div className="max-w-xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2 text-left pt-2">
            <div className="p-2.5 bg-stone-50 rounded border border-stone-200 text-[11px]">
              <span className="text-stone-400 block font-mono">PRODUCT</span>
              <span className="font-bold text-stone-800 truncate block">
                {state.editorialSelections.selectedTitle || state.details.workingName || 'Item'}
              </span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded border border-stone-200 text-[11px]">
              <span className="text-stone-400 block font-mono">ANGLES</span>
              <span className="font-bold text-stone-800 truncate block">
                {state.editorialSelections.selectedAngles.length || 1} Selected
              </span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded border border-stone-200 text-[11px]">
              <span className="text-stone-400 block font-mono">VOICE</span>
              <span className="font-bold text-stone-800 truncate block capitalize">
                {state.copyConfig.writingStyle}
              </span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded border border-stone-200 text-[11px]">
              <span className="text-stone-400 block font-mono">LENGTH</span>
              <span className="font-bold text-stone-800 truncate block capitalize">
                {state.copyConfig.targetLength === 'custom'
                  ? `${state.copyConfig.customWordCount}w`
                  : state.copyConfig.targetLength}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onGenerateBrief}
              disabled={isGeneratingBrief}
              className="inline-flex items-center gap-2 px-8 py-3 text-sm font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isGeneratingBrief ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Brief...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Editorial Brief &rarr;</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Rendered / Editable Editorial Brief */
        <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
          <div className="px-6 py-3 bg-stone-50/80 border-b border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span className="font-semibold text-stone-800 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              Approved Editorial Brief Content
            </span>
            <span>
              {isEditing ? (
                <span className="text-amber-700 font-semibold">Editing Mode Active</span>
              ) : (
                'Review details before generating prompt'
              )}
            </span>
          </div>

          {isEditing ? (
            <div className="p-6">
              <textarea
                rows={22}
                value={state.editorialBriefMarkdown || ''}
                onChange={(e) => onBriefChange(e.target.value)}
                className="w-full font-mono text-xs border border-stone-300 rounded-lg p-4 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden leading-relaxed text-stone-900"
              />
            </div>
          ) : (
            <div className="p-6 max-h-[600px] overflow-y-auto prose prose-stone prose-xs max-w-none text-stone-800 font-sans leading-relaxed">
              <pre className="whitespace-pre-wrap font-sans text-xs bg-stone-50/70 p-5 rounded-lg border border-stone-200 text-stone-800 leading-relaxed font-normal">
                {state.editorialBriefMarkdown}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>&larr; Back to Configuration (Step 4)</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasBrief}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Proceed to Writing Prompt (Step 6) &rarr;</span>
        </button>
      </div>
    </div>
  );
};
