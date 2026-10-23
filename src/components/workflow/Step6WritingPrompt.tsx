/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  ArrowLeft,
  Sparkles,
  Bot,
  ExternalLink,
  Edit3,
  CheckCircle2,
  RefreshCw,
  Info,
  Layers,
  BookOpen
} from 'lucide-react';
import { WorkflowState } from '../../types/workflow';
import { downloadFile } from '../../utils/exportUtils';

interface Step6WritingPromptProps {
  state: WorkflowState;
  onModelSelect: (model: 'chatgpt' | 'claude') => void;
  onPromptChange: (prompt: string) => void;
  onRegeneratePrompt: () => void;
  onBack: () => void;
  onNewProduct: () => void;
}

export const Step6WritingPrompt: React.FC<Step6WritingPromptProps> = ({
  state,
  onModelSelect,
  onPromptChange,
  onRegeneratePrompt,
  onBack,
  onNewProduct
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = () => {
    if (!state.generatedPrompt) return;
    navigator.clipboard.writeText(state.generatedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownload = () => {
    if (!state.generatedPrompt) return;
    const titleSlug = (state.editorialSelections.selectedTitle || state.details.workingName || 'writing_prompt')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 30);
    downloadFile(state.generatedPrompt, `${titleSlug}_${state.selectedPromptModel}_prompt.txt`, 'text/plain;charset=utf-8;');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Step Header */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center">
              6
            </span>
            <h2 className="font-serif font-bold text-lg text-stone-900">
              Calibrated Writing Prompt
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Complete, copyable writing prompt calibrated for external AI models (ChatGPT or Claude) to produce the final product entry.
          </p>
        </div>

        {/* Model Selector: ChatGPT vs Claude */}
        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onModelSelect('chatgpt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              state.selectedPromptModel === 'chatgpt'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-600" />
            <span>ChatGPT (GPT-4o)</span>
          </button>

          <button
            type="button"
            onClick={() => onModelSelect('claude')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              state.selectedPromptModel === 'claude'
                ? 'bg-white text-orange-800 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span>Claude (3.7 Sonnet)</span>
          </button>
        </div>
      </div>

      {/* Role & External Delegation Banner */}
      <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-start justify-between gap-4 text-xs text-stone-700">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#1E3A8A] shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <span className="font-bold text-stone-900 block">External Execution Protocol</span>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              This studio prepares the high-context editorial brief, specifications, and guardrails. The prompt below is tailored for{' '}
              <strong className="text-stone-900">{state.selectedPromptModel === 'chatgpt' ? 'ChatGPT' : 'Claude'}</strong>. Paste it into your external model to generate the finished, publication-ready prose.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'View Mode' : 'Edit Prompt'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-all shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
          </button>
        </div>
      </div>

      {/* Prompt Editor / Viewer */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="px-6 py-3 bg-stone-50/80 border-b border-stone-100 flex items-center justify-between text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">Prompt Payload</span>
            <span className="font-mono text-[10px] bg-stone-200/60 px-1.5 py-0.5 rounded text-stone-700">
              {state.selectedPromptModel === 'chatgpt' ? 'Standard Markdown Prompt' : 'Claude XML Tagged Structure'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRegeneratePrompt}
              className="text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium"
              title="Reset prompt from brief"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset to Brief</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium"
            >
              <Download className="w-3 h-3" />
              <span>Download (.txt)</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <textarea
            rows={20}
            value={state.generatedPrompt || ''}
            onChange={(e) => onPromptChange(e.target.value)}
            className="w-full font-mono text-xs border border-stone-300 rounded-lg p-4 bg-stone-50/60 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden leading-relaxed text-stone-900"
          />
        </div>
      </div>

      {/* Recommended Next Step & Navigation */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>&larr; Back to Editorial Brief (Step 5)</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNewProduct}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors shadow-2xs"
          >
            <span>+ Start Next Product</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-all shadow-sm cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Prompt!' : 'Copy Prompt for LLM'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
