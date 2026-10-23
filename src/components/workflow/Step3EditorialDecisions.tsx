/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  PlusCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Users,
  Target,
  Palette,
  Type,
  HelpCircle,
  ThumbsUp,
  Tag,
  AlertCircle
} from 'lucide-react';
import { StructuredAnalysisResult, ProductDetailsInput } from '../../types';
import { EditorialSelections } from '../../types/workflow';

interface Step3EditorialDecisionsProps {
  details: ProductDetailsInput;
  analysis: StructuredAnalysisResult | null;
  selections: EditorialSelections;
  onSelectionsChange: (selections: EditorialSelections) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step3EditorialDecisions: React.FC<Step3EditorialDecisionsProps> = ({
  details,
  analysis,
  selections,
  onSelectionsChange,
  onBack,
  onNext
}) => {
  const [showAddCustomInterpretation, setShowAddCustomInterpretation] = useState(false);
  const [showAddCustomAngle, setShowAddCustomAngle] = useState(false);
  const [showAddCustomRecipient, setShowAddCustomRecipient] = useState(false);

  // Helper toggle functions
  const toggleInterpretation = (val: string) => {
    const exists = selections.selectedInterpretations.includes(val);
    const updated = exists
      ? selections.selectedInterpretations.filter((x) => x !== val)
      : [...selections.selectedInterpretations, val];
    onSelectionsChange({ ...selections, selectedInterpretations: updated });
  };

  const toggleAngle = (val: string) => {
    const exists = selections.selectedAngles.includes(val);
    const updated = exists
      ? selections.selectedAngles.filter((x) => x !== val)
      : [...selections.selectedAngles, val];
    onSelectionsChange({ ...selections, selectedAngles: updated });
  };

  const toggleRecipient = (val: string) => {
    const exists = selections.selectedRecipients.includes(val);
    const updated = exists
      ? selections.selectedRecipients.filter((x) => x !== val)
      : [...selections.selectedRecipients, val];
    onSelectionsChange({ ...selections, selectedRecipients: updated });
  };

  const selectTitle = (title: string) => {
    onSelectionsChange({ ...selections, selectedTitle: title });
  };

  // Pre-populate candidate options from analysis findings
  const candidateInterpretations: { text: string; rationale?: string }[] = [];
  if (analysis?.productPositioning?.distinctiveEssence) {
    candidateInterpretations.push({
      text: analysis.productPositioning.distinctiveEssence,
      rationale: 'Primary distinctive concept derived from visual analysis.'
    });
  }
  if (analysis?.visualConceptual?.mainSubjectAndSecondaryElements) {
    candidateInterpretations.push({
      text: analysis.visualConceptual.mainSubjectAndSecondaryElements,
      rationale: 'Core visual composition and motif focus.'
    });
  }
  if (analysis?.visualConceptual?.humorIronyMetaphors && analysis.visualConceptual.humorIronyMetaphors !== 'None noted') {
    candidateInterpretations.push({
      text: analysis.visualConceptual.humorIronyMetaphors,
      rationale: 'Visual metaphor & subtle humor layer.'
    });
  }
  if (details.initialPositioningIdea) {
    candidateInterpretations.push({
      text: details.initialPositioningIdea,
      rationale: 'Merchant/Author initial concept from Step 1.'
    });
  }

  const candidateAngles = analysis?.productPositioning?.positioningAngles || [];

  const candidateRecipients: { profile: string; note?: string }[] = [];
  if (details.primaryRecipient) {
    candidateRecipients.push({ profile: details.primaryRecipient, note: 'User specified primary recipient' });
  }
  if (analysis?.recipientIntelligence?.primaryRecipientProfile && analysis.recipientIntelligence.primaryRecipientProfile !== details.primaryRecipient) {
    candidateRecipients.push({ profile: analysis.recipientIntelligence.primaryRecipientProfile, note: 'AI suggested enthusiast target' });
  }
  if (details.secondaryRecipient) {
    candidateRecipients.push({ profile: details.secondaryRecipient, note: 'Secondary audience' });
  }
  if (analysis?.recipientIntelligence?.secondaryAudiences) {
    analysis.recipientIntelligence.secondaryAudiences.forEach((sec) => {
      if (!candidateRecipients.some((r) => r.profile === sec)) {
        candidateRecipients.push({ profile: sec, note: 'Complementary niche audience' });
      }
    });
  }

  const titleOptions = analysis?.titleLaboratory?.titleOptions || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Step Header */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center">
            3
          </span>
          <h2 className="font-serif font-bold text-lg text-stone-900">
            Editorial Direction & Recipient Decisions
          </h2>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Make explicit editorial decisions. AI proposals are recommendations, not silent choices. Select, refine, or add custom options.
        </p>
      </div>

      {/* Decision 1: Design Interpretations & Concept */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#1E3A8A]" />
            <h3 className="font-serif font-bold text-base text-stone-900">
              1. Select Design Interpretation(s) to Emphasize
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {selections.selectedInterpretations.length} selected
          </span>
        </div>

        <p className="text-xs text-stone-600">
          Which core visual metaphor, symbolism, or concept should the writer focus on? (Choose 1 or more, or add your own).
        </p>

        <div className="grid grid-cols-1 gap-2.5">
          {candidateInterpretations.map((item, idx) => {
            const isSelected = selections.selectedInterpretations.includes(item.text);
            return (
              <div
                key={idx}
                onClick={() => toggleInterpretation(item.text)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'border-[#1E3A8A] bg-blue-50/60 shadow-2xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                }`}
              >
                <div className="mt-0.5 text-[#1E3A8A]">
                  {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-stone-400" />}
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-stone-900 leading-snug">{item.text}</p>
                  {item.rationale && (
                    <span className="text-[11px] text-stone-500 mt-0.5 block">{item.rationale}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Interpretation Input */}
        <div>
          {!showAddCustomInterpretation && !selections.customInterpretation ? (
            <button
              type="button"
              onClick={() => setShowAddCustomInterpretation(true)}
              className="text-xs text-[#1E3A8A] hover:underline font-semibold flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Custom Interpretation or Specific Meaning</span>
            </button>
          ) : (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Custom Design Meaning / Interpretation:
              </label>
              <input
                type="text"
                value={selections.customInterpretation || ''}
                onChange={(e) => onSelectionsChange({ ...selections, customInterpretation: e.target.value })}
                placeholder="e.g. A subtle nod to the Icelandic stave protecting travelers through rough weather and life changes."
                className="w-full text-xs border border-stone-300 rounded px-3 py-1.5 bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Decision 2: Creative Angles & Writing Directions */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#1E3A8A]" />
            <h3 className="font-serif font-bold text-base text-stone-900">
              2. Select Creative Angle / Writing Direction
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {selections.selectedAngles.length} selected
          </span>
        </div>

        <p className="text-xs text-stone-600">
          Select which strategic positioning angle(s) will anchor the product description and gift appeal:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {candidateAngles.map((angle, idx) => {
            const isSelected = selections.selectedAngles.includes(angle.angleName);
            return (
              <div
                key={idx}
                onClick={() => toggleAngle(angle.angleName)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-[#1E3A8A] bg-blue-50/60 shadow-xs ring-1 ring-[#1E3A8A]'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[#1E3A8A]">
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-stone-400" />}
                      </div>
                      <span className="font-bold text-xs text-stone-900">{angle.angleName}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        angle.recommendation === 'preferred'
                          ? 'bg-emerald-100 text-emerald-800'
                          : angle.recommendation === 'viable'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {angle.recommendation}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 mt-2 leading-relaxed">
                    <span className="font-semibold text-stone-900">Central Appeal:</span> {angle.centralAppeal}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    <span className="font-medium text-stone-700">Design Evidence:</span> {angle.supportingDesignEvidence}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
                  <span>Target: {angle.intendedRecipient}</span>
                  <span className="font-medium text-stone-700">Motivation: {angle.giftBuyingMotivation}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Angle Input */}
        <div>
          {!showAddCustomAngle && !selections.customAngle ? (
            <button
              type="button"
              onClick={() => setShowAddCustomAngle(true)}
              className="text-xs text-[#1E3A8A] hover:underline font-semibold flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Custom Positioning Angle</span>
            </button>
          ) : (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Custom Angle Name & Strategic Focus:
              </label>
              <input
                type="text"
                value={selections.customAngle || ''}
                onChange={(e) => onSelectionsChange({ ...selections, customAngle: e.target.value })}
                placeholder="e.g. Archival Authenticity vs. Pop Culture Clichés: Focus on 17th-century manuscript roots."
                className="w-full text-xs border border-stone-300 rounded px-3 py-1.5 bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Decision 3: Recipient Selection */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1E3A8A]" />
            <h3 className="font-serif font-bold text-base text-stone-900">
              3. Target Recipient Selection
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {selections.selectedRecipients.length} selected
          </span>
        </div>

        <p className="text-xs text-stone-600">
          Confirm the intended recipients. Single or multiple recipient profiles can be targeted in the copy brief:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {candidateRecipients.map((rec, idx) => {
            const isSelected = selections.selectedRecipients.includes(rec.profile);
            return (
              <div
                key={idx}
                onClick={() => toggleRecipient(rec.profile)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  isSelected
                    ? 'border-[#1E3A8A] bg-blue-50/60 shadow-2xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                }`}
              >
                <div className="mt-0.5 text-[#1E3A8A]">
                  {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-stone-400" />}
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-stone-900 block">{rec.profile}</span>
                  {rec.note && <span className="text-[11px] text-stone-500">{rec.note}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Recipient Input */}
        <div>
          {!showAddCustomRecipient && !selections.customRecipient ? (
            <button
              type="button"
              onClick={() => setShowAddCustomRecipient(true)}
              className="text-xs text-[#1E3A8A] hover:underline font-semibold flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Custom Recipient Persona</span>
            </button>
          ) : (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Custom Recipient Persona:
              </label>
              <input
                type="text"
                value={selections.customRecipient || ''}
                onChange={(e) => onSelectionsChange({ ...selections, customRecipient: e.target.value })}
                placeholder="e.g. Classical history teacher or university professor with a dry sense of humor."
                className="w-full text-xs border border-stone-300 rounded px-3 py-1.5 bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Decision 4: Editorial Title Selection */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#1E3A8A]" />
            <h3 className="font-serif font-bold text-base text-stone-900">
              4. Working Editorial Title for the Brief
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            Active: <span className="font-semibold text-stone-900">{selections.selectedTitle || details.workingName || 'Untitled'}</span>
          </span>
        </div>

        <p className="text-xs text-stone-600">
          Select an editorial title from the Title Laboratory suggestions or stick with your working name:
        </p>

        {titleOptions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {titleOptions.slice(0, 6).map((opt, idx) => {
              const isSelected = (selections.selectedTitle || details.workingName) === opt.proposedTitle;
              return (
                <div
                  key={idx}
                  onClick={() => selectTitle(opt.proposedTitle)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'border-[#1E3A8A] bg-blue-50/60 shadow-2xs ring-1 ring-[#1E3A8A]'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="mt-0.5 text-[#1E3A8A]">
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-stone-400" />}
                  </div>
                  <div className="text-xs flex-1">
                    <span className="font-semibold text-stone-900 block">{opt.proposedTitle}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-mono">
                        {opt.strategicApproach.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-stone-500 truncate">{opt.intendedAudience}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-600">
            Using manual working name: <span className="font-bold text-stone-900">{details.workingName || 'Untitled'}</span>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>&larr; Back to Findings (Step 2)</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-all shadow-sm cursor-pointer"
        >
          <span>Proceed to Copy Configuration (Step 4) &rarr;</span>
        </button>
      </div>
    </div>
  );
};
