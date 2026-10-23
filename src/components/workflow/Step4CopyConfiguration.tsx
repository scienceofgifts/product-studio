/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  SlidersHorizontal,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileText,
  AlignLeft,
  LayoutList,
  ShieldAlert,
  Hash,
  HelpCircle,
  Check
} from 'lucide-react';
import { ProductDetailsInput } from '../../types';
import {
  CopyConfiguration,
  WritingStyleKey,
  OutputFormatKey,
  TargetLengthKey,
  AVAILABLE_COPY_SECTIONS
} from '../../types/workflow';

interface Step4CopyConfigurationProps {
  details: ProductDetailsInput;
  config: CopyConfiguration;
  onConfigChange: (config: CopyConfiguration) => void;
  onBack: () => void;
  onNext: () => void;
}

const STYLE_OPTIONS: { id: WritingStyleKey; label: string; desc: string }[] = [
  {
    id: 'scholarly',
    label: 'Perceptive & Scholarly',
    desc: 'Authoritative, perceptive historical/cultural literacy without academic stiffness.'
  },
  {
    id: 'witty',
    label: 'Witty & Conversational',
    desc: 'Clever insider humor, light irony, and engaging conversational charm.'
  },
  {
    id: 'restrained',
    label: 'Restrained & Sophisticated',
    desc: 'Understated elegance, minimal hype, and quiet confidence in the design.'
  },
  {
    id: 'insider',
    label: 'Enthusiast Insider',
    desc: 'Deep subculture literacy, authentic terminology, and passionate shared lore.'
  },
  {
    id: 'direct',
    label: 'Direct & Practical',
    desc: 'Clean, immediate clarity highlighting gift utility and recipient resonance.'
  },
  {
    id: 'custom',
    label: 'Custom Voice & Tone',
    desc: 'Specify your own bespoke tone and style directives below.'
  }
];

const CONTENT_EMPHASIS_OPTIONS = [
  'Design & Meaning',
  'Gift Buyer Perspective',
  'Recipient Persona Fit',
  'Verified Physical Specs',
  'Cultural & Historical Context',
  'Humor & Subversive Irony'
];

export const Step4CopyConfiguration: React.FC<Step4CopyConfigurationProps> = ({
  details,
  config,
  onConfigChange,
  onBack,
  onNext
}) => {
  const toggleSection = (sectionId: string) => {
    const exists = config.selectedSections.includes(sectionId);
    const updated = exists
      ? config.selectedSections.filter((id) => id !== sectionId)
      : [...config.selectedSections, sectionId];
    onConfigChange({ ...config, selectedSections: updated });
  };

  const toggleEmphasis = (item: string) => {
    const exists = config.contentEmphasis.includes(item);
    const updated = exists
      ? config.contentEmphasis.filter((x) => x !== item)
      : [...config.contentEmphasis, item];
    onConfigChange({ ...config, contentEmphasis: updated });
  };

  const toggleRestriction = (restriction: string) => {
    const exists = config.requiredInfoAndRestrictions.includes(restriction);
    const updated = exists
      ? config.requiredInfoAndRestrictions.filter((x) => x !== restriction)
      : [...config.requiredInfoAndRestrictions, restriction];
    onConfigChange({ ...config, requiredInfoAndRestrictions: updated });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Step Header */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center">
            4
          </span>
          <h2 className="font-serif font-bold text-lg text-stone-900">
            Product Copy Configuration
          </h2>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Configure writing voice, desired length, output structure, and selectable content sections for the brief.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Style, Length, Format (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Writing Style & Tone */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Writing Voice & Tone
              </span>
              <span className="text-xs font-semibold text-[#1E3A8A] capitalize">
                {STYLE_OPTIONS.find((s) => s.id === config.writingStyle)?.label}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {STYLE_OPTIONS.map((style) => (
                <div
                  key={style.id}
                  onClick={() => onConfigChange({ ...config, writingStyle: style.id })}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    config.writingStyle === style.id
                      ? 'border-[#1E3A8A] bg-blue-50/60 shadow-2xs ring-1 ring-[#1E3A8A]'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900">{style.label}</span>
                    <input
                      type="radio"
                      name="writingStyle"
                      checked={config.writingStyle === style.id}
                      onChange={() => onConfigChange({ ...config, writingStyle: style.id })}
                      className="text-[#1E3A8A]"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{style.desc}</p>
                </div>
              ))}
            </div>

            {config.writingStyle === 'custom' && (
              <div className="pt-2">
                <input
                  type="text"
                  value={config.customStyleDescription || ''}
                  onChange={(e) => onConfigChange({ ...config, customStyleDescription: e.target.value })}
                  placeholder="Describe your custom voice (e.g. Victorian naturalist with dry British wit)..."
                  className="w-full text-xs border border-stone-300 rounded px-3 py-2 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Desired Length & Target Word Count */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-100 pb-2.5">
              Desired Length & Target Word Count
            </span>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div
                onClick={() => onConfigChange({ ...config, targetLength: 'short', customWordCount: 125 })}
                className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${
                  config.targetLength === 'short'
                    ? 'border-[#1E3A8A] bg-blue-50/60 font-bold text-[#1E3A8A] ring-1 ring-[#1E3A8A]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                }`}
              >
                <span className="block font-bold">Short</span>
                <span className="text-[11px] text-stone-500 block mt-0.5">100–150 words</span>
              </div>

              <div
                onClick={() => onConfigChange({ ...config, targetLength: 'standard', customWordCount: 210 })}
                className={`p-3 rounded-lg border cursor-pointer text-center transition-all relative ${
                  config.targetLength === 'standard'
                    ? 'border-[#1E3A8A] bg-blue-50/60 font-bold text-[#1E3A8A] ring-1 ring-[#1E3A8A]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                }`}
              >
                <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                  Recommended
                </span>
                <span className="block font-bold">Standard</span>
                <span className="text-[11px] text-stone-500 block mt-0.5">180–240 words</span>
              </div>

              <div
                onClick={() => onConfigChange({ ...config, targetLength: 'long', customWordCount: 350 })}
                className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${
                  config.targetLength === 'long'
                    ? 'border-[#1E3A8A] bg-blue-50/60 font-bold text-[#1E3A8A] ring-1 ring-[#1E3A8A]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                }`}
              >
                <span className="block font-bold">Feature</span>
                <span className="text-[11px] text-stone-500 block mt-0.5">300–450 words</span>
              </div>
            </div>

            {/* Custom Word Count Setting */}
            <div className="pt-2 flex items-center justify-between text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-200">
              <label className="text-stone-700 font-medium flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-stone-500" />
                Precise Target Word Count:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={50}
                  max={800}
                  step={10}
                  value={config.customWordCount || 210}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 210;
                    onConfigChange({
                      ...config,
                      targetLength: 'custom',
                      customWordCount: count
                    });
                  }}
                  className="w-20 text-xs text-center border border-stone-300 rounded px-2 py-1 bg-white font-bold text-stone-900 focus:ring-1 focus:ring-[#1E3A8A]"
                />
                <span className="text-stone-500 text-xs">words</span>
              </div>
            </div>
          </div>

          {/* Output Format */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-100 pb-2.5">
              Output Format Structure
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                onClick={() => onConfigChange({ ...config, outputFormat: 'prose' })}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  config.outputFormat === 'prose'
                    ? 'border-[#1E3A8A] bg-blue-50/60 ring-1 ring-[#1E3A8A]'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="mt-0.5 text-[#1E3A8A]">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 block">Single Prose Block</span>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Seamless 2-3 paragraph editorial flow without explicit section headers.
                  </p>
                </div>
              </div>

              <div
                onClick={() => onConfigChange({ ...config, outputFormat: 'structured' })}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  config.outputFormat === 'structured'
                    ? 'border-[#1E3A8A] bg-blue-50/60 ring-1 ring-[#1E3A8A]'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="mt-0.5 text-[#1E3A8A]">
                  <LayoutList className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 block">Structured Entry</span>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Organized into explicit thematic subsections with editorial headings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Selectable Sections, Restrictions, SEO (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Selectable Content Sections */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Selectable Content Sections
              </span>
              <span className="text-xs text-stone-500 font-medium">
                {config.selectedSections.length} of {AVAILABLE_COPY_SECTIONS.length} active
              </span>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              Choose which components the writer must include. Recommended sections are flagged for gift-guide conversion:
            </p>

            <div className="space-y-2">
              {AVAILABLE_COPY_SECTIONS.map((sec) => {
                const isSelected = config.selectedSections.includes(sec.id);
                return (
                  <div
                    key={sec.id}
                    onClick={() => toggleSection(sec.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 text-xs ${
                      isSelected
                        ? 'border-[#1E3A8A] bg-blue-50/40'
                        : 'border-stone-200 bg-stone-50/40 text-stone-500'
                    }`}
                  >
                    <div className="mt-0.5 text-[#1E3A8A]">
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-stone-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${isSelected ? 'text-stone-900' : 'text-stone-600'}`}>
                          {sec.label}
                        </span>
                        {sec.isRecommended && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            Rec
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5 leading-tight">{sec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content Emphasis Priorities */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-100 pb-2.5">
              Content Emphasis Priorities
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CONTENT_EMPHASIS_OPTIONS.map((opt) => {
                const isSelected = config.contentEmphasis.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleEmphasis(opt)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#1E3A8A] text-white shadow-2xs font-semibold'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {isSelected ? `✓ ${opt}` : `+ ${opt}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEO & Required Restrictions */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-100 pb-2.5">
              SEO & Strict Prohibitions
            </span>

            {/* SEO Keyword Guidance */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 block">
                Target SEO Keywords <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={config.seoKeywords || ''}
                onChange={(e) => onConfigChange({ ...config, seoKeywords: e.target.value })}
                placeholder="e.g. viking compass gift, vegvisir mug, norse mythology gifts"
                className="w-full text-xs border border-stone-300 rounded px-2.5 py-1.5 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
              />
            </div>

            {/* Active Guardrails */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-stone-700 block">Mandatory Guardrails:</span>
              {config.requiredInfoAndRestrictions.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-stone-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Custom Instructions */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-medium text-stone-700 block">
                Optional Custom Brief Instructions:
              </label>
              <textarea
                rows={2}
                value={config.customInstructions || ''}
                onChange={(e) => onConfigChange({ ...config, customInstructions: e.target.value })}
                placeholder="Any special client instructions, seasonal promotions, or custom wording..."
                className="w-full text-xs border border-stone-300 rounded p-2 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>&larr; Back to Editorial Decisions (Step 3)</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-all shadow-sm cursor-pointer"
        >
          <span>Proceed to Editorial Brief (Step 5) &rarr;</span>
        </button>
      </div>
    </div>
  );
};
