/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ArrowRight,
  ShieldAlert,
  Send,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  ProductRecord,
  ProductComparisonResult,
  ComparisonFeedback,
  FeedbackRating,
  SimilarityCategory
} from '../../types';
import { compareProducts, getComparisonKey } from '../../services/similarityEngine';
import { dbService } from '../../services/db';

interface ProductComparisonModalProps {
  productA: ProductRecord;
  productB: ProductRecord;
  allProducts: ProductRecord[];
  onClose: () => void;
  onSelectProductB?: (newProductB: ProductRecord) => void;
}

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  productA,
  productB,
  allProducts,
  onClose,
  onSelectProductB
}) => {
  const [feedback, setFeedback] = useState<ComparisonFeedback | null>(null);
  const [comparison, setComparison] = useState<ProductComparisonResult>(() =>
    compareProducts(productA, productB, null)
  );
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // User feedback form states
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>('accurate');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [overrideCategory, setOverrideCategory] = useState<SimilarityCategory | 'none'>('none');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const comparisonKey = getComparisonKey(productA.id, productB.id);

  // Load existing feedback if present
  useEffect(() => {
    dbService.getComparisonFeedback(comparisonKey).then((saved) => {
      if (saved) {
        setFeedback(saved);
        setFeedbackRating(saved.rating);
        setFeedbackNotes(saved.userNotes || '');
        setOverrideCategory(saved.adjustedCategory || 'none');
        setComparison(compareProducts(productA, productB, saved));
      } else {
        setFeedback(null);
        setFeedbackRating('accurate');
        setFeedbackNotes('');
        setOverrideCategory('none');
        setComparison(compareProducts(productA, productB, null));
      }
    });
  }, [productA, productB, comparisonKey]);

  // Request deep Gemini AI comparison
  const handleRunAiComparison = async () => {
    setIsLoadingAI(true);
    setAiError(null);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productA,
          productB
        })
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
      } else {
        const rawText = await res.text().catch(() => '');
        const cleanMsg = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
        throw new Error(`Server returned status ${res.status}${cleanMsg ? `: ${cleanMsg}` : ''}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Server returned error ${res.status}`);
      }

      if (data && data.success && data.result) {
        setComparison(data.result);
      } else {
        throw new Error(data?.error || 'AI comparison returned empty results.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to execute AI comparison.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Submit feedback / correction
  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFeedback(true);
    try {
      const newFeedback: ComparisonFeedback = {
        id: feedback?.id || `fb_${comparisonKey}_${Date.now().toString(36)}`,
        comparisonKey,
        productAId: productA.id,
        productBId: productB.id,
        rating: feedbackRating,
        userNotes: feedbackNotes.trim(),
        adjustedCategory: overrideCategory !== 'none' ? overrideCategory : undefined,
        submittedAt: feedback?.submittedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbService.saveComparisonFeedback(newFeedback);
      setFeedback(newFeedback);
      setComparison(compareProducts(productA, productB, newFeedback));
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 2500);
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const getCategoryBadgeStyle = (cat: SimilarityCategory) => {
    switch (cat) {
      case 'near_duplicate':
        return 'bg-red-50 text-red-800 border-red-300 font-bold';
      case 'strongly_overlapping':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      case 'distinct_positioning':
        return 'bg-blue-50 text-[#1E3A8A] border-blue-300 font-semibold';
      case 'complementary':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
      case 'unrelated':
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getDimensionLevelBadge = (level: string) => {
    switch (level) {
      case 'identical':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Identical</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">High</span>;
      case 'moderate':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-[#1E3A8A]">Moderate</span>;
      case 'low':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">Low</span>;
      case 'none':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-normal bg-stone-100 text-stone-600">None</span>;
      case 'insufficient_data':
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Insufficient Data</span>;
    }
  };

  const dimensions = Object.values(comparison.dimensions);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-[#E8E4DC] rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E4DC] bg-[#FAF8F5] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Multidimensional Product Comparison
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Explainable evaluation of conceptual, subject, recipient, visual, and editorial overlaps.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Side-by-Side Product Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#FBF9F5] border border-[#E8E4DC]">
            {/* Product A */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-semibold">
                Product A (Reference)
              </span>
              <h3 className="font-serif text-sm font-bold text-stone-900 leading-tight">
                {productA.details.workingName || 'Untitled'}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-600 pt-0.5">
                <span className="px-2 py-0.5 rounded bg-white border border-stone-200 font-mono text-[10px] uppercase">
                  {productA.details.productType}
                </span>
                <span className="truncate max-w-[200px]" title={productA.details.giftGuideName}>
                  {productA.details.giftGuideName || 'No guide'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 line-clamp-2 italic pt-1">
                Recipient: {productA.details.primaryRecipient || 'Unspecified'}
              </p>
            </div>

            {/* Product B (Switchable) */}
            <div className="space-y-1.5 sm:border-l sm:border-[#E8E4DC] sm:pl-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-semibold">
                  Product B (Comparison Target)
                </span>
                {onSelectProductB && allProducts.length > 2 && (
                  <select
                    value={productB.id}
                    onChange={(e) => {
                      const found = allProducts.find((p) => p.id === e.target.value);
                      if (found) onSelectProductB(found);
                    }}
                    className="text-[11px] bg-white border border-stone-300 rounded px-1.5 py-0.5 text-stone-700 focus:outline-none"
                  >
                    {allProducts
                      .filter((p) => p.id !== productA.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          Switch to: {p.details.workingName || 'Untitled'}
                        </option>
                      ))}
                  </select>
                )}
              </div>
              <h3 className="font-serif text-sm font-bold text-stone-900 leading-tight">
                {productB.details.workingName || 'Untitled'}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-600 pt-0.5">
                <span className="px-2 py-0.5 rounded bg-white border border-stone-200 font-mono text-[10px] uppercase">
                  {productB.details.productType}
                </span>
                <span className="truncate max-w-[200px]" title={productB.details.giftGuideName}>
                  {productB.details.giftGuideName || 'No guide'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 line-clamp-2 italic pt-1">
                Recipient: {productB.details.primaryRecipient || 'Unspecified'}
              </p>
            </div>
          </div>

          {/* Overall Categorization & Qualitative Synthesis */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E4DC] pb-2">
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm font-bold text-stone-900">Overall Relationship:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs border ${getCategoryBadgeStyle(comparison.overallCategory)}`}>
                  {comparison.categoryLabel}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {comparison.heuristicScore !== null && (
                  <span
                    className="text-stone-500 font-mono text-xs"
                    title="Transparent weighted heuristic score (not an empirical statistical percentage)."
                  >
                    Heuristic Overlap Index: <strong className="text-stone-800">{comparison.heuristicScore}/100</strong>
                  </span>
                )}
                <span className="text-[10px] text-stone-400 font-mono uppercase bg-stone-100 px-2 py-0.5 rounded">
                  Engine: {comparison.engine}
                </span>
              </div>
            </div>

            <p className="text-stone-800 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200">
              {comparison.qualitativeAssessment}
            </p>

            {comparison.missingInformationWarnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Missing Information & Assessment Uncertainty:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
                  {comparison.missingInformationWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 6 Dimensions Breakdown */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-stone-900 border-b border-[#E8E4DC] pb-1.5">
              Dimensional Evidence Breakdown
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dimensions.map((dim) => (
                <div
                  key={dim.dimension}
                  className="p-3.5 rounded-lg border border-[#E8E4DC] bg-white space-y-2 hover:border-stone-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 text-xs">{dim.dimensionName}</span>
                    {getDimensionLevelBadge(dim.level)}
                  </div>

                  <p className="text-stone-600 text-[11px] leading-relaxed">{dim.summary}</p>

                  {dim.specificEvidence.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">
                        Specific Evidence:
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-stone-700">
                        {dim.specificEvidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {dim.meaningfulDifferences.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">
                        Distinctions:
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-stone-700">
                        {dim.meaningfulDifferences.map((diff, i) => (
                          <li key={i}>{diff}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Implications & Recommended Action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-blue-50/40 border border-blue-200/70">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A] block mb-1">
                Catalogue & Positioning Implications
              </span>
              <p className="text-stone-800 text-xs leading-relaxed">{comparison.positioningImplications}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A] block mb-1">
                Recommended Strategic Action
              </span>
              <p className="text-stone-800 text-xs leading-relaxed font-medium">{comparison.recommendedAction}</p>
            </div>
          </div>

          {/* AI Nuance Deep Dive Trigger */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-[#E8E4DC] bg-[#FAF8F5]">
            <div>
              <span className="font-semibold text-stone-900 block text-xs">Deep AI Comparative Nuance</span>
              <span className="text-stone-500 text-[11px]">
                Request server-side Gemini multidimensional reasoning for edge cases.
              </span>
            </div>
            <button
              onClick={handleRunAiComparison}
              disabled={isLoadingAI}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors disabled:opacity-50"
            >
              {isLoadingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isLoadingAI ? 'Analyzing with Gemini...' : 'Run Gemini Comparison'}</span>
            </button>
          </div>
          {aiError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{aiError}</p>}

          {/* Feedback & Correction Section (Section 8 of prompt) */}
          <div className="border-t border-[#E8E4DC] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif text-sm font-bold text-stone-900">
                  Curator Feedback & Comparative Correction
                </h4>
                <p className="text-stone-500 text-[11px]">
                  Mark accuracy or provide a correction. Feedback is stored in IndexedDB and informs future comparisons.
                </p>
              </div>
              {feedback && (
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Feedback recorded
                </span>
              )}
            </div>

            <form onSubmit={handleSaveFeedback} className="space-y-3 bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E8E4DC]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Accuracy Rating */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Assessment Accuracy
                  </label>
                  <select
                    value={feedbackRating}
                    onChange={(e) => setFeedbackRating(e.target.value as FeedbackRating)}
                    className="w-full text-xs bg-white border border-[#E8E4DC] rounded p-1.5 text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                  >
                    <option value="accurate">Accurate — Agree with analysis</option>
                    <option value="partially_accurate">Partially Accurate — Some distinctions missed</option>
                    <option value="incorrect">Incorrect — Overlap or distinction misjudged</option>
                    <option value="insufficient_information">Insufficient Information — Missing key product context</option>
                  </select>
                </div>

                {/* Optional Category Override */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Manual Category Override (Optional)
                  </label>
                  <select
                    value={overrideCategory}
                    onChange={(e) => setOverrideCategory(e.target.value as any)}
                    className="w-full text-xs bg-white border border-[#E8E4DC] rounded p-1.5 text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                  >
                    <option value="none">No override (keep system category)</option>
                    <option value="near_duplicate">Near-Duplicate Concepts</option>
                    <option value="strongly_overlapping">Strongly Overlapping Products</option>
                    <option value="distinct_positioning">Related with Distinct Positioning</option>
                    <option value="complementary">Complementary Products</option>
                    <option value="unrelated">Unrelated Products</option>
                  </select>
                </div>
              </div>

              {/* Explanatory Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Correction or Editorial Explanation:
                </label>
                <textarea
                  rows={2}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Explain why this assessment was adjusted (e.g. 'Both feature 1863 Gettysburg, but the canvas portfolio is an archival collector piece while the shirt is casual tourist wear')."
                  className="w-full text-xs bg-white border border-[#E8E4DC] rounded p-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                {feedbackSuccess ? (
                  <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correction persisted to database!</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-400">
                    Corrections are reversible and associated with this pair key.
                  </span>
                )}

                <button
                  type="submit"
                  disabled={isSavingFeedback}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 rounded transition-colors shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5 text-stone-600" />
                  <span>{isSavingFeedback ? 'Saving...' : 'Save Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8E4DC] bg-[#FAF8F5] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 rounded-md transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
