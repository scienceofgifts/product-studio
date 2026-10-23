/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Eye,
  Users,
  Target,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  Palette,
  GraduationCap,
  Scale,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { StructuredAnalysisResult, ProductDetailsInput } from '../../types';
import { UploadedImageItem } from '../../types/workflow';

interface Step2AnalysisFindingsProps {
  details: ProductDetailsInput;
  analysis: StructuredAnalysisResult | null;
  images: UploadedImageItem[];
  onBack: () => void;
  onNext: () => void;
}

export const Step2AnalysisFindings: React.FC<Step2AnalysisFindingsProps> = ({
  details,
  analysis,
  images,
  onBack,
  onNext
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'visual' | 'recipients' | 'positioning' | 'facts'>('all');

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-12 text-center max-w-3xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-bold text-lg text-stone-900">
          No Analysis Data Available
        </h3>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          Please return to Step 1 and click &quot;Analyze Product&quot; with a product image or working details.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Step 1 (Product Input)</span>
        </button>
      </div>
    );
  }

  const { visualConceptual, recipientIntelligence, productPositioning } = analysis;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Step Header */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="font-serif font-bold text-lg text-stone-900">
              Product & Recipient Analysis Findings
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Structured intelligence derived from your inputs. Concrete observations are strictly distinguished from editorial inferences.
          </p>
        </div>

        {/* Section Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap bg-stone-100 p-1 rounded-lg">
          {(['all', 'visual', 'recipients', 'positioning', 'facts'] as const).map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setActiveSection(sec)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeSection === sec
                  ? 'bg-white text-[#1E3A8A] font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {sec === 'all' && 'All Findings'}
              {sec === 'visual' && 'Design & Visual'}
              {sec === 'recipients' && 'Recipient Intelligence'}
              {sec === 'positioning' && 'Appeal & Angles'}
              {sec === 'facts' && 'Verified Facts & Limits'}
            </button>
          ))}
        </div>
      </div>

      {/* Observation vs Inference Transparency Banner */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-950">
        <Info className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold block text-stone-900">Observation vs. Inference Framework</span>
          <p className="text-stone-600 leading-relaxed text-[11px]">
            Items tagged <span className="bg-emerald-100 text-emerald-800 font-semibold px-1 py-0.5 rounded text-[10px]">Observation</span> are verified visible characteristics or confirmed source specs. Items tagged <span className="bg-purple-100 text-purple-800 font-semibold px-1 py-0.5 rounded text-[10px]">Inference</span> are strategic hypotheses for editorial curation. No claims are treated as final until chosen in Step 3.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Visual & Conceptual Characteristics */}
        {(activeSection === 'all' || activeSection === 'visual') && visualConceptual && (
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#1E3A8A]" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  1. Visual Identity & Design Concept
                </h3>
              </div>
              <span className="text-xs bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded font-medium">
                Apparent Format: {visualConceptual.productTypeApparent || details.productType}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Main Subject & Elements */}
                <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Subject & Design Elements</span>
                    <span className="bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded text-[10px]">Observation</span>
                  </div>
                  <p className="text-stone-700 leading-relaxed pt-1">
                    {visualConceptual.mainSubjectAndSecondaryElements || 'No specific visual subject identified.'}
                  </p>
                </div>

                {/* Visible Typography */}
                <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Visible Typography & Lettering</span>
                    <span className="bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded text-[10px]">Observation</span>
                  </div>
                  <p className="text-stone-700 leading-relaxed pt-1">
                    {visualConceptual.visibleTextAndTypography || 'No visible inscriptions or text detected.'}
                  </p>
                </div>

                {/* Aesthetic & Color Palette */}
                <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Color Palette & Composition</span>
                    <span className="bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded text-[10px]">Observation</span>
                  </div>
                  <p className="text-stone-700 leading-relaxed pt-1">
                    {visualConceptual.colorPaletteAndAesthetic} — {visualConceptual.compositionAndHierarchy}
                  </p>
                </div>

                {/* Tone, Humor & Metaphors */}
                <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Likely Tone, Humor & Symbolism</span>
                    <span className="bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.2 rounded text-[10px]">Inference</span>
                  </div>
                  <p className="text-stone-700 leading-relaxed pt-1">
                    <span className="font-medium text-stone-900">Tone:</span> {visualConceptual.likelyToneAndAesthetic || 'Restrained, authentic'}
                    <br />
                    <span className="font-medium text-stone-900">Humor/Metaphors:</span> {visualConceptual.humorIronyMetaphors || 'None noted'}
                  </p>
                </div>
              </div>

              {/* Distinctive Characteristics */}
              {visualConceptual.distinctiveCharacteristics?.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-stone-900 block mb-2">
                    Distinctive Visual Characteristics:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {visualConceptual.distinctiveCharacteristics.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-md text-xs text-stone-800 font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Recipient Intelligence & Profiles */}
        {(activeSection === 'all' || activeSection === 'recipients') && recipientIntelligence && (
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1E3A8A]" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  2. Recipient Intelligence & Audience Depth
                </h3>
              </div>
              <span className="bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                Inference Model
              </span>
            </div>

            <div className="p-6 space-y-4">
              {/* Primary Profile & Knowledge Depth */}
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-900">Primary Recipient Persona</span>
                  <span className="text-[11px] font-mono font-medium text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                    Depth: {recipientIntelligence.knowledgeDepth}
                  </span>
                </div>
                <p className="text-xs text-stone-800 font-medium">
                  {recipientIntelligence.primaryRecipientProfile}
                </p>

                {/* Knowledge Depth Spectrum */}
                {recipientIntelligence.knowledgeSpectrum && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-200 text-xs">
                    <div className="p-2 bg-white rounded border border-stone-200">
                      <span className="font-bold text-stone-700 block text-[11px]">Casual Admirer:</span>
                      <p className="text-stone-600 text-[11px] mt-0.5">{recipientIntelligence.knowledgeSpectrum.casualLevel}</p>
                    </div>
                    <div className="p-2 bg-white rounded border border-stone-200">
                      <span className="font-bold text-blue-900 block text-[11px]">Enthusiast / Collector:</span>
                      <p className="text-stone-600 text-[11px] mt-0.5">{recipientIntelligence.knowledgeSpectrum.enthusiastLevel}</p>
                    </div>
                    <div className="p-2 bg-white rounded border border-stone-200">
                      <span className="font-bold text-indigo-900 block text-[11px]">Specialist Scholar:</span>
                      <p className="text-stone-600 text-[11px] mt-0.5">{recipientIntelligence.knowledgeSpectrum.specialistLevel}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Buyer Motivation vs Recipient Perspective */}
              {recipientIntelligence.buyerMotivationVsRecipientPerspective && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <span className="font-bold text-stone-800 block mb-1">Gift Buyer Motivation</span>
                    <p className="text-stone-600 leading-relaxed text-[11px]">
                      {recipientIntelligence.buyerMotivationVsRecipientPerspective.buyerMotivation}
                    </p>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <span className="font-bold text-stone-800 block mb-1">Recipient Perspective</span>
                    <p className="text-stone-600 leading-relaxed text-[11px]">
                      {recipientIntelligence.buyerMotivationVsRecipientPerspective.recipientPreference}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                    <span className="font-bold text-amber-900 block mb-1">Alignment Risk</span>
                    <p className="text-amber-800 leading-relaxed text-[11px]">
                      {recipientIntelligence.buyerMotivationVsRecipientPerspective.alignmentRisk}
                    </p>
                  </div>
                </div>
              )}

              {/* Audience Mismatches: Who NOT to buy this for */}
              {recipientIntelligence.audienceMismatches?.length > 0 && (
                <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-red-900 font-bold">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Audience Mismatches (&quot;Who NOT to Buy This For&quot;)</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-red-800 text-[11px] pl-1">
                    {recipientIntelligence.audienceMismatches.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 3: Potential Gift Appeal & Positioning Angles */}
        {(activeSection === 'all' || activeSection === 'positioning') && productPositioning && (
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#1E3A8A]" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  3. Gift Appeal & Positioning Angles
                </h3>
              </div>
              <span className="bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                Inference Model
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-900 block">Distinctive Essence</span>
                  <p className="text-stone-700 leading-relaxed">
                    {productPositioning.distinctiveEssence}
                  </p>
                </div>
                <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-900 block">Why It Deserves Gift Consideration</span>
                  <p className="text-stone-700 leading-relaxed">
                    {productPositioning.whyDeservesGiftConsideration}
                  </p>
                </div>
              </div>

              {/* Identified Positioning Angles */}
              {productPositioning.positioningAngles?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-stone-900 block">
                    Candidate Editorial Angles Identified:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {productPositioning.positioningAngles.map((angle, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-lg border border-stone-200 shadow-2xs space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">{angle.angleName}</span>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
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
                        <p className="text-[11px] text-stone-600">
                          <span className="font-medium text-stone-800">Appeal:</span> {angle.centralAppeal}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          <span className="font-medium text-stone-700">Evidence:</span> {angle.supportingDesignEvidence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Verified Facts & Uncertainties */}
        {(activeSection === 'all' || activeSection === 'facts') && (
          <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#1E3A8A]" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  4. Facts, Specifications & Outstanding Uncertainties
                </h3>
              </div>
              <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                Factual Integrity Mandate
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Verified Facts */}
                <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Confirmed Physical Specifications</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-emerald-950 text-[11px]">
                    {details.productSpecs ? <li>{details.productSpecs}</li> : null}
                    {details.extractedFacts?.fabricComposition?.value ? <li>Composition: {details.extractedFacts.fabricComposition.value}</li> : null}
                    {details.extractedFacts?.fabricWeight?.value ? <li>Fabric Weight: {details.extractedFacts.fabricWeight.value}</li> : null}
                    {details.extractedFacts?.fit?.value ? <li>Fit: {details.extractedFacts.fit.value}</li> : null}
                    {details.extractedFacts?.sizeRange?.value ? <li>Size Range: {details.extractedFacts.sizeRange.value}</li> : null}
                    {!details.productSpecs && !details.extractedFacts ? (
                      <li className="text-stone-500 italic">No physical specs confirmed yet.</li>
                    ) : null}
                  </ul>
                </div>

                {/* Uncertainties requiring verification */}
                <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Uncertainties — Do NOT Invent as Facts</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-amber-950 text-[11px]">
                    {visualConceptual?.undeterminedInformation?.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                    {visualConceptual?.potentialAmbiguities?.map((a, i) => (
                      <li key={i}>Ambiguity: {a}</li>
                    ))}
                    {(!visualConceptual?.undeterminedInformation?.length && !visualConceptual?.potentialAmbiguities?.length) && (
                      <li className="text-stone-500 italic">No specific ambiguities noted.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
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
          <span>&larr; Back to Product Input</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-all shadow-sm cursor-pointer"
        >
          <span>Proceed to Editorial Direction (Step 3) &rarr;</span>
        </button>
      </div>
    </div>
  );
};
