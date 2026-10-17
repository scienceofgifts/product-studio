/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Scale,
  Sparkles,
  AlertTriangle,
  Compass,
  BookOpen,
  PieChart,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  FileText,
  Filter,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { ProductRecord, GiftGuide, ComparisonFeedback } from '../../types';
import { analyzePortfolio } from '../../services/portfolioEngine';
import { ProductComparisonModal } from '../modals/ProductComparisonModal';

interface PortfolioIntelligenceViewProps {
  products: ProductRecord[];
  giftGuides: GiftGuide[];
  feedbackList: ComparisonFeedback[];
  onOpenProduct?: (product: ProductRecord) => void;
  onNavigateToWorkspace?: () => void;
}

export const PortfolioIntelligenceView: React.FC<PortfolioIntelligenceViewProps> = ({
  products,
  giftGuides,
  feedbackList,
  onOpenProduct,
  onNavigateToWorkspace
}) => {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'clusters' | 'guides' | 'opportunities' | 'audit'
  >('overview');

  const [selectedGuideId, setSelectedGuideId] = useState<string>(
    giftGuides[0]?.id || 'guide-viking-history'
  );

  // Comparison modal state
  const [comparisonPair, setComparisonPair] = useState<{
    productA: ProductRecord;
    productB: ProductRecord;
  } | null>(null);

  const portfolio = useMemo(
    () => analyzePortfolio(products, giftGuides, feedbackList),
    [products, giftGuides, feedbackList]
  );

  const selectedGuideCoverage = portfolio.guideCoverageMap[selectedGuideId] || null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1E3A8A]"></span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
              Strategic Research & Catalogue Analysis
            </span>
          </div>
          <h2 className="font-serif text-xl font-bold text-stone-900 mt-0.5">
            Portfolio Intelligence & Conceptual Similarity
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
            Examines the conceptual structure of your catalogue, identifies redundant designs vs. distinctive anchors, and audits gift-guide coverage.
          </p>
        </div>

        {/* Quick Stat Tiles */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-2 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg text-center">
            <span className="block text-xs font-mono font-bold text-stone-800">{portfolio.totalProducts}</span>
            <span className="block text-[10px] text-stone-400 uppercase tracking-wider">Total Items</span>
          </div>
          <div className="px-3 py-2 bg-emerald-50/60 border border-emerald-200/60 rounded-lg text-center">
            <span className="block text-xs font-mono font-bold text-emerald-800">{portfolio.publishedCount}</span>
            <span className="block text-[10px] text-emerald-600 uppercase tracking-wider">Published</span>
          </div>
          <div className="px-3 py-2 bg-amber-50/60 border border-amber-200/60 rounded-lg text-center">
            <span className="block text-xs font-mono font-bold text-amber-800">{portfolio.redundantPairs.length}</span>
            <span className="block text-[10px] text-amber-600 uppercase tracking-wider">Overlap Alerts</span>
          </div>
          <div className="px-3 py-2 bg-blue-50/60 border border-blue-200/60 rounded-lg text-center">
            <span className="block text-xs font-mono font-bold text-[#1E3A8A]">{portfolio.developmentOpportunities.length}</span>
            <span className="block text-[10px] text-[#1E3A8A] uppercase tracking-wider">Opportunities</span>
          </div>
        </div>
      </div>

      {/* Strategic Takeaway Banner */}
      <div className="p-3.5 bg-blue-50/50 border border-blue-200/70 rounded-xl flex items-start gap-3 text-xs text-stone-800">
        <Compass className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-[#1E3A8A] block">Curatorial Portfolio Summary:</span>
          <p className="mt-0.5 leading-relaxed text-stone-700">{portfolio.strategicTakeaway}</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-[#E8E4DC] flex items-center gap-6 text-xs font-medium text-stone-600 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSection('overview')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeSection === 'overview'
              ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
              : 'border-transparent hover:text-stone-900'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Catalogue Distribution</span>
        </button>

        <button
          onClick={() => setActiveSection('clusters')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeSection === 'clusters'
              ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
              : 'border-transparent hover:text-stone-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Concept Clusters & Redundancies ({portfolio.redundantPairs.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('guides')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeSection === 'guides'
              ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
              : 'border-transparent hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Gift-Guide Coverage</span>
        </button>

        <button
          onClick={() => setActiveSection('opportunities')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeSection === 'opportunities'
              ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
              : 'border-transparent hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Development Opportunities ({portfolio.developmentOpportunities.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('audit')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeSection === 'audit'
              ? 'text-[#1E3A8A] border-[#1E3A8A] font-semibold'
              : 'border-transparent hover:text-stone-900'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Data Completeness Audit ({portfolio.incompleteRecords.length})</span>
        </button>
      </div>

      {/* SECTION 1: CATALOGUE DISTRIBUTION */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Format Breakdown */}
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-2">
              <h3 className="font-serif text-sm font-bold text-stone-900">Products by Format</h3>
              <span className="text-[10px] text-stone-400 font-mono">Tactile Diversity</span>
            </div>
            <div className="space-y-2">
              {portfolio.formatDistribution.map((item) => (
                <div key={item.format} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono capitalize text-stone-700">{item.format}</span>
                    <span className="font-mono text-stone-500">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1E3A8A] h-full rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 pt-2 border-t border-stone-100">
              Note: Balanced guides require a mix of functional daily items (drinkware), identity apparel (tees), and reflective desk tools (stationery).
            </p>
          </div>

          {/* Guide Assignment & Publication Status */}
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-2">
              <h3 className="font-serif text-sm font-bold text-stone-900">Guide Assignment & Status</h3>
              <span className="text-[10px] text-stone-400 font-mono">Publication Ratio</span>
            </div>
            <div className="space-y-2.5">
              {portfolio.guideDistribution.map((g) => (
                <div key={g.guideId} className="p-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-900 truncate max-w-[200px]" title={g.guideName}>
                      {g.guideName}
                    </span>
                    <span className="font-mono font-semibold text-stone-700">{g.count} items</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>Published in shop: {g.publishedCount}</span>
                    <span className="text-stone-400">Drafts: {g.count - g.publishedCount}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 pt-1">
              Publication status is tracked independently of guide assignment to avoid assuming unreleased drafts are live in guides.
            </p>
          </div>

          {/* Niche & Subject Distribution */}
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-2">
              <h3 className="font-serif text-sm font-bold text-stone-900">Historical Niches</h3>
              <span className="text-[10px] text-stone-400 font-mono">Thematic Breadth</span>
            </div>
            <div className="space-y-2">
              {portfolio.nicheDistribution.slice(0, 6).map((n) => (
                <div key={n.niche} className="p-2 rounded bg-stone-50 border border-stone-200 text-xs flex items-center justify-between">
                  <span className="font-medium text-stone-800 truncate max-w-[180px]">{n.niche}</span>
                  <span className="font-mono text-stone-500">{n.count} designs</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 pt-1">
              Having more products in one niche is neither good nor bad—what matters is whether they communicate distinct intellectual angles or duplicate the same idea.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 2: CONCEPT CLUSTERS & REDUNDANCIES */}
      {activeSection === 'clusters' && (
        <div className="space-y-6">
          {/* Redundancy Alerts */}
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Potentially Redundant Designs ({portfolio.redundantPairs.length})</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Products that communicate substantially overlapping ideas or compete for the same recipient persona in the same guide.
                </p>
              </div>
            </div>

            {portfolio.redundantPairs.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-lg text-stone-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <span>No high-risk redundant designs detected in the current catalogue.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {portfolio.redundantPairs.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          {alert.comparison.categoryLabel}
                        </span>
                        <span className="text-xs font-semibold text-stone-900">
                          Overlap Index: {alert.comparison.heuristicScore}/100
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          setComparisonPair({ productA: alert.productA, productB: alert.productB })
                        }
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Inspect Multidimensional Evidence</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-amber-200/60">
                      <div>
                        <span className="text-[10px] uppercase text-stone-400 font-semibold block">Design A:</span>
                        <p className="font-bold text-stone-900">{alert.productA.details.workingName}</p>
                        <span className="text-[11px] text-stone-500 font-mono capitalize">
                          {alert.productA.details.productType} · {alert.productA.details.giftGuideName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-stone-400 font-semibold block">Design B:</span>
                        <p className="font-bold text-stone-900">{alert.productB.details.workingName}</p>
                        <span className="text-[11px] text-stone-500 font-mono capitalize">
                          {alert.productB.details.productType} · {alert.productB.details.giftGuideName}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      ⚠️ {alert.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conceptual Clusters */}
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-[#E8E4DC] pb-3">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Thematic Concept Clusters
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Groups of designs clustered around identical cultural archetypes or historical events.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolio.clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className="p-4 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-stone-500 font-semibold">
                      {cluster.niche}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                        cluster.riskLevel === 'high_redundancy'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-[#1E3A8A]'
                      }`}
                    >
                      {cluster.riskLevel === 'high_redundancy' ? 'High Overlap' : 'Healthy Diversity'}
                    </span>
                  </div>

                  <h4 className="font-serif text-sm font-bold text-stone-900">
                    {cluster.centralConcept}
                  </h4>

                  <p className="text-xs text-stone-600 leading-relaxed">{cluster.summary}</p>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                      Clustered Products:
                    </span>
                    <ul className="list-disc pl-4 text-[11px] text-stone-700 space-y-0.5">
                      {cluster.productNames.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded bg-white border border-[#E8E4DC] text-[11px] text-[#1E3A8A] font-medium">
                    💡 Recommendation: {cluster.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distinctive Products */}
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-[#E8E4DC] pb-3">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Distinctive Anchor Products (Low Overlap)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Designs with unique positioning that face virtually zero internal cannibalization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {portfolio.distinctiveProducts.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 text-xs space-y-1">
                  <h4 className="font-serif text-sm font-bold text-stone-900">
                    {item.product.details.workingName}
                  </h4>
                  <p className="text-stone-700 leading-relaxed">{item.standoutReason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: GIFT-GUIDE COVERAGE */}
      {activeSection === 'guides' && (
        <div className="space-y-6">
          {/* Guide Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {giftGuides.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGuideId(g.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedGuideId === g.id
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'bg-white border border-[#E8E4DC] text-stone-700 hover:bg-stone-50'
                }`}
              >
                {g.name.split(':')[0]}
              </button>
            ))}
          </div>

          {selectedGuideCoverage && (
            <div className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs space-y-5">
              <div className="border-b border-[#E8E4DC] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    {selectedGuideCoverage.guideName}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Assigned Products: <strong>{selectedGuideCoverage.totalAssigned}</strong> (Published: {selectedGuideCoverage.publishedCount}, In Review: {selectedGuideCoverage.inReviewCount}, Drafts: {selectedGuideCoverage.draftCount})
                  </p>
                </div>

                <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#FAF8F5] border border-[#E8E4DC] text-stone-700">
                  Recipient Breadth: {selectedGuideCoverage.recipientBreadth}
                </span>
              </div>

              {/* Format Diversity in this guide */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-700 block">
                  Product Format Balance:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedGuideCoverage.formatDiversity.map((fd) => (
                    <div key={fd.format} className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E8E4DC] text-center">
                      <span className="text-xs font-bold text-stone-900 font-mono capitalize">{fd.format}</span>
                      <span className="block text-[11px] text-stone-500 mt-0.5">
                        {fd.count} design(s) ({fd.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editorial Angles & Interchangeable Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                    Editorial Angles Represented:
                  </span>
                  <ul className="list-disc pl-4 text-xs text-stone-700 space-y-1">
                    {selectedGuideCoverage.editorialAnglesRepresented.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                    Interchangeable Entries Risk:
                  </span>
                  {selectedGuideCoverage.interchangeableEntriesRisk.length === 0 ? (
                    <p className="text-xs text-stone-600">No interchangeable entries currently identified.</p>
                  ) : (
                    <ul className="list-disc pl-4 text-xs text-amber-900 space-y-1">
                      {selectedGuideCoverage.interchangeableEntriesRisk.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Identified Coverage Gaps (Evidence-Grounded) */}
              <div className="space-y-3 pt-2">
                <h4 className="font-serif text-sm font-bold text-stone-900 border-b border-[#E8E4DC] pb-1.5">
                  Identified Guide Coverage Gaps (Grounded in Imported Catalogue)
                </h4>

                {selectedGuideCoverage.identifiedCoverageGaps.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">No evidence-supported gaps found.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedGuideCoverage.identifiedCoverageGaps.map((gap) => (
                      <div
                        key={gap.id}
                        className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1E3A8A] text-sm">{gap.gapTitle}</span>
                          <span className="text-[10px] font-mono text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded">
                            {gap.missingAudienceOrFormat}
                          </span>
                        </div>
                        <p className="text-stone-800 leading-relaxed">{gap.gapDescription}</p>
                        <div className="text-[11px] text-stone-600 bg-white p-2.5 rounded border border-blue-200/60 space-y-1">
                          <p><strong>Catalogue Evidence:</strong> {gap.evidenceFromCatalogue}</p>
                          <p><strong>Strategic Opportunity:</strong> {gap.strategicOpportunity}</p>
                          <p><strong>Recommended Action:</strong> {gap.suggestedAction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-600 italic">
                {selectedGuideCoverage.dataCompletenessAssessment}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: PRODUCT DEVELOPMENT OPPORTUNITIES */}
      {activeSection === 'opportunities' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs space-y-2">
            <h3 className="font-serif text-base font-bold text-stone-900">
              Differentiated Product Development Opportunities
            </h3>
            <p className="text-xs text-stone-500">
              Specific, defensible opportunities identified by evaluating underserved recipient tiers, formats, and material culture against the current catalogue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolio.developmentOpportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-stone-500 font-semibold">
                      {opp.niche}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Confidence: {opp.confidenceLevel.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="font-serif text-sm font-bold text-stone-900 leading-tight">
                    {opp.opportunityTitle}
                  </h4>

                  <p className="text-stone-700 leading-relaxed">{opp.opportunityDescription}</p>

                  <div className="p-3 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg space-y-1.5 text-[11px]">
                    <div>
                      <strong className="text-stone-800">Target Recipient:</strong>{' '}
                      <span className="text-stone-600">{opp.intendedRecipient}</span>
                    </div>
                    <div>
                      <strong className="text-stone-800">Why Worthwhile:</strong>{' '}
                      <span className="text-stone-600">{opp.whyWorthwhile}</span>
                    </div>
                    <div>
                      <strong className="text-stone-800">Catalogue Evidence:</strong>{' '}
                      <span className="text-stone-600">{opp.evidenceFromCatalogue}</span>
                    </div>
                    <div>
                      <strong className="text-stone-800">What Makes It Different:</strong>{' '}
                      <span className="text-stone-600">{opp.whatMakesNewProductDifferent}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E4DC] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-[#1E3A8A]">
                    Next Step: {opp.recommendedNextAction}
                  </span>
                  {onNavigateToWorkspace && (
                    <button
                      onClick={onNavigateToWorkspace}
                      className="px-3 py-1.5 bg-[#1E3A8A] text-white rounded font-medium hover:bg-[#172554] transition-colors text-xs"
                    >
                      Draft in Workspace
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: DATA COMPLETENESS AUDIT */}
      {activeSection === 'audit' && (
        <div className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-[#E8E4DC] pb-3">
            <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Catalogue Information Completeness Audit ({portfolio.incompleteRecords.length})</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Records with missing mockup images, empty descriptions, or missing recipient definitions produce appropriate uncertainty in comparative algorithms.
            </p>
          </div>

          {portfolio.incompleteRecords.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-lg text-stone-600 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <span>All imported product records have complete images, descriptions, and recipient profiles.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {portfolio.incompleteRecords.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-sm">
                      {item.product.details.workingName || 'Untitled Product'}
                    </span>
                    <span className="font-mono text-[10px] text-stone-500 uppercase">
                      ID: {item.product.id}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {item.missingFields.map((field, fIdx) => (
                      <span
                        key={fIdx}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800"
                      >
                        ⚠️ {field}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] text-amber-900">{item.riskAssessment}</p>

                  {onOpenProduct && (
                    <button
                      onClick={() => onOpenProduct(item.product)}
                      className="text-xs text-[#1E3A8A] font-medium hover:underline pt-1 block"
                    >
                      Open in Workspace to Complete Metadata →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparison Modal */}
      {comparisonPair && (
        <ProductComparisonModal
          productA={comparisonPair.productA}
          productB={comparisonPair.productB}
          allProducts={products}
          onClose={() => setComparisonPair(null)}
          onSelectProductB={(newB) =>
            setComparisonPair((prev) => (prev ? { ...prev, productB: newB } : null))
          }
        />
      )}
    </div>
  );
};
