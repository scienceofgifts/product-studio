/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  StructuredAnalysisResult,
  ProductRecord,
  AnalysisMode,
  ProductComparisonResult,
  TitleOption
} from '../../types';
import {
  Copy,
  Check,
  Download,
  Sparkles,
  Eye,
  Users,
  Target,
  Compass,
  Type as TypeIcon,
  ShieldCheck,
  FileText,
  AlertTriangle,
  HelpCircle,
  Award,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Scale,
  BookOpen,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Tag,
  ThumbsUp,
  AlertCircle,
  LayoutGrid,
  Table,
  Palette,
  GraduationCap,
  Gift,
  Feather
} from 'lucide-react';
import { formatWritingBriefMarkdown, downloadFile } from '../../utils/exportUtils';
import { findRelevantCatalogueMatches } from '../../services/similarityEngine';
import { evaluateCatalogueFitForProduct } from '../../services/fourthwallRecommendationEngine';

interface StrategyConfigItem {
  label: string;
  icon: React.ElementType;
  badgeBg: string;
  textCol: string;
  borderCol: string;
  desc: string;
}

const STRATEGY_CONFIG: Record<string, StrategyConfigItem> = {
  design_specific: {
    label: 'Design-Specific',
    icon: Palette,
    badgeBg: 'bg-[#99BFF9]/25',
    textCol: 'text-[#1B3D5F]',
    borderCol: 'border-[#99BFF9]/60',
    desc: 'Focuses on visual concept, inscription, or tangible design elements'
  },
  recipient_oriented: {
    label: 'Recipient-Oriented',
    icon: Users,
    badgeBg: 'bg-[#C3F3DF]/50',
    textCol: 'text-[#064E3B]',
    borderCol: 'border-[#A7E8CD]',
    desc: 'Connects directly to recipient persona, profession, or passion'
  },
  intellectual_appeal: {
    label: 'Intellectual Appeal',
    icon: GraduationCap,
    badgeBg: 'bg-indigo-50',
    textCol: 'text-indigo-900',
    borderCol: 'border-indigo-200',
    desc: 'Emphasizes scholarly knowledge, historical depth, or cultural literacy'
  },
  witty_irreverent: {
    label: 'Witty & Irreverent',
    icon: Sparkles,
    badgeBg: 'bg-amber-50',
    textCol: 'text-amber-900',
    borderCol: 'border-amber-200',
    desc: 'Playful humor, double meanings, and clever insider irony'
  },
  practical_gift_appeal: {
    label: 'Practical Gift Appeal',
    icon: Gift,
    badgeBg: 'bg-emerald-50',
    textCol: 'text-emerald-900',
    borderCol: 'border-emerald-200',
    desc: 'Communicates format, material utility, and immediate gift readiness'
  },
  concise_editorial: {
    label: 'Concise Editorial',
    icon: Feather,
    badgeBg: 'bg-sky-50',
    textCol: 'text-sky-900',
    borderCol: 'border-sky-200',
    desc: 'Punchy, elegant, and natural as a gift guide entry header'
  },
  specificity_led: {
    label: 'Specificity-Led',
    icon: Target,
    badgeBg: 'bg-rose-50',
    textCol: 'text-rose-900',
    borderCol: 'border-rose-200',
    desc: 'Distinguishes the item through unique, granular features'
  },
  historical_cultural_reference: {
    label: 'Historical / Cultural',
    icon: BookOpen,
    badgeBg: 'bg-purple-50',
    textCol: 'text-purple-900',
    borderCol: 'border-purple-200',
    desc: 'Anchors the item in authentic documentary or cultural history'
  },
  direct_identification: {
    label: 'Direct Identification',
    icon: Tag,
    badgeBg: 'bg-stone-100',
    textCol: 'text-stone-800',
    borderCol: 'border-stone-300',
    desc: 'Clear, straightforward product nomenclature'
  },
  distinctive_concept: {
    label: 'Distinctive Concept',
    icon: Sparkles,
    badgeBg: 'bg-blue-50',
    textCol: 'text-[#1E3A8A]',
    borderCol: 'border-blue-200',
    desc: 'Highlights the unique thematic angle'
  }
};

const BEST_USE_CONTEXT_LABELS: Record<string, string> = {
  editorial_guide_heading: 'Editorial Gift Guide Heading',
  shop_product_page: 'Shop Product Title',
  social_hook: 'Social / Marketing Hook',
  seo_title: 'SEO / Search Title'
};

interface AnalysisResultsPanelProps {
  product: ProductRecord | null;
  analysis: StructuredAnalysisResult | null;
  isAnalyzing: boolean;
  onRerun: () => void;
  businessBrainVersion: number;
  catalogueProducts?: ProductRecord[];
  onInspectComparison?: (productB: ProductRecord) => void;
  onApplyTitle?: (title: string) => void;
}

type ResultTab = 'overview' | 'moduleA' | 'moduleB' | 'moduleC' | 'moduleD' | 'moduleE' | 'moduleF' | 'moduleG';

export const AnalysisResultsPanel: React.FC<AnalysisResultsPanelProps> = ({
  product,
  analysis,
  isAnalyzing,
  onRerun,
  businessBrainVersion,
  catalogueProducts = [],
  onInspectComparison,
  onApplyTitle
}) => {
  const [activeTab, setActiveTab] = useState<ResultTab>('overview');
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Mode-based auto tab selection
  useEffect(() => {
    if (!analysis) return;
    if (analysis.mode === 'title') {
      setActiveTab('moduleE');
    } else if (analysis.mode === 'recipient') {
      setActiveTab('moduleB');
    } else if (analysis.mode === 'brief') {
      setActiveTab('moduleG');
    } else {
      setActiveTab('overview');
    }
  }, [analysis?.analysisId, analysis?.mode]);

  // Title Laboratory interactive state
  const [extraTitles, setExtraTitles] = useState<TitleOption[]>([]);
  const [isGeneratingMoreTitles, setIsGeneratingMoreTitles] = useState(false);
  const [selectedStrategyFilter, setSelectedStrategyFilter] = useState<string>('all');
  const [titleSearchQuery, setTitleSearchQuery] = useState('');
  const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | string | null>(null);
  const [appliedTitle, setAppliedTitle] = useState<string | null>(null);
  const [titleViewMode, setTitleViewMode] = useState<'cards' | 'table'>('cards');
  const [showDiagnosticEvaluation, setShowDiagnosticEvaluation] = useState(true);

  const catalogueComparisons = useMemo(() => {
    if (!product || catalogueProducts.length <= 1) return [];
    return findRelevantCatalogueMatches(product, catalogueProducts);
  }, [product, catalogueProducts]);

  const [fourthwallFilter, setFourthwallFilter] = useState<'all' | 'prioritize' | 'test' | 'consider_later' | 'skip'>('all');

  const fourthwallReport = useMemo(() => {
    if (!product) return null;
    return evaluateCatalogueFitForProduct(product);
  }, [product]);

  const handleCopyBrief = () => {
    if (!analysis?.writingBrief) return;
    const md = formatWritingBriefMarkdown(analysis.writingBrief);
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(md);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2500);
    }
  };



  const handleExportBriefMD = () => {
    if (!analysis?.writingBrief) return;
    const md = formatWritingBriefMarkdown(analysis.writingBrief);
    const titleSlug = (analysis.writingBrief.productIdentity?.workingTitle || 'brief')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    downloadFile(md, `${titleSlug}_chatgpt_brief.md`, 'text/markdown;charset=utf-8;');
  };

  const handleExportFullJSON = () => {
    if (!analysis) return;
    const jsonStr = JSON.stringify(analysis, null, 2);
    downloadFile(jsonStr, `product_analysis_${analysis.analysisId}.json`, 'application/json;charset=utf-8;');
  };

  const handleGenerateMoreTitles = async () => {
    if (!analysis) return;
    setIsGeneratingMoreTitles(true);
    try {
      const allExisting = [
        ...(analysis.titleLaboratory?.titleOptions || []).map((t) => t.proposedTitle),
        ...extraTitles.map((t) => t.proposedTitle)
      ];
      const res = await fetch('/api/title-laboratory/generate-more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: product?.details || {
            workingName: analysis.writingBrief?.productIdentity?.workingTitle || '',
            productType: analysis.writingBrief?.productIdentity?.productType || 'item',
            giftGuideName: analysis.writingBrief?.guideContext?.guideName || '',
            primaryRecipient: analysis.writingBrief?.recipientProfile?.primaryRecipient || '',
            currentTitle: product?.details?.currentTitle || '',
            audienceInterest: product?.details?.audienceInterest || '',
            productSpecs: product?.details?.productSpecs || '',
            knownDesignReferences: product?.details?.knownDesignReferences || ''
          },
          existingTitles: allExisting,
          modelName: analysis.actualModel || 'gemini-3.8-flash',
          count: 6
        })
      });
      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
      } else {
        const rawText = await res.text().catch(() => '');
        throw new Error(`Server returned non-JSON response (${res.status}). ${rawText.slice(0, 100)}`);
      }

      if (!res.ok) throw new Error(data?.error || `Failed to generate additional titles (${res.status})`);

      if (data && data.newTitles && Array.isArray(data.newTitles)) {
        setExtraTitles((prev) => [...prev, ...data.newTitles]);
      }
    } catch (err: any) {
      console.error('Error generating more titles:', err);
    } finally {
      setIsGeneratingMoreTitles(false);
    }
  };

  const handleCopySingleTitle = (title: string, id: number | string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(title);
      setCopiedTitleIndex(id);
      setTimeout(() => setCopiedTitleIndex(null), 2000);
    }
  };

  const handleApplyTitle = (title: string) => {
    if (onApplyTitle) {
      onApplyTitle(title);
      setAppliedTitle(title);
      setTimeout(() => setAppliedTitle(null), 3000);
    }
  };

  const combinedTitleOptions = useMemo(() => {
    const base = analysis?.titleLaboratory?.titleOptions || [];
    return [...base, ...extraTitles];
  }, [analysis?.titleLaboratory?.titleOptions, extraTitles]);

  const filteredTitleOptions = useMemo(() => {
    return combinedTitleOptions.filter((opt) => {
      const matchesFilter = selectedStrategyFilter === 'all' || opt.strategicApproach === selectedStrategyFilter;
      const query = titleSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        Boolean(opt.proposedTitle?.toLowerCase().includes(query)) ||
        Boolean(opt.intendedAudience?.toLowerCase().includes(query)) ||
        Boolean(opt.strengths?.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [combinedTitleOptions, selectedStrategyFilter, titleSearchQuery]);

  // Loading state
  if (isAnalyzing) {
    return (
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mb-5 animate-pulse">
          <Sparkles className="w-7 h-7 text-[#1E3A8A]" />
        </div>
        <h3 className="font-serif text-xl font-semibold text-stone-900 mb-2">
          Synthesizing Product Intelligence
        </h3>
        <p className="text-sm text-stone-600 max-w-md mb-6 leading-relaxed">
          Reasoning over visual observations, recipient psychology, cultural provenance, and formulating a standalone ChatGPT writing brief...
        </p>
        <div className="w-full max-w-xs space-y-2 text-xs text-stone-500 font-mono text-left bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E8E4DC]">
          <div className="flex items-center gap-2 text-stone-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]"></span>
            <span>Inspecting visual motifs & typography</span>
          </div>
          <div className="flex items-center gap-2 text-stone-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]"></span>
            <span>Disentangling buyer motivation vs recipient criteria</span>
          </div>
          <div className="flex items-center gap-2 text-stone-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]"></span>
            <span>Developing distinct positioning angles</span>
          </div>
          <div className="flex items-center gap-2 text-stone-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]"></span>
            <span>Drafting actionable ChatGPT editorial brief</span>
          </div>
        </div>
      </div>
    );
  }

  // Idle state when no analysis exists yet
  if (!analysis) {
    return (
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center min-h-[500px] text-center shadow-xs h-full">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex items-center justify-center mb-5 text-[#1E3A8A] shadow-xs">
          <Sparkles className="w-7 h-7 text-[#1E3A8A]" />
        </div>
        <h3 className="font-serif text-2xl font-bold text-stone-900 mb-2">
          Ready for Product Analysis
        </h3>
        <p className="text-sm text-stone-600 max-w-md mb-8 leading-relaxed">
          Upload a product mockup image and set your gift guide context on the left, then click <span className="font-semibold text-[#1E3A8A]">Run Analysis</span>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl text-left">
          <div className="p-4 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl transition-all">
            <div className="w-8 h-8 rounded-lg bg-blue-100/70 flex items-center justify-center text-[#1E3A8A] mb-2.5">
              <Eye className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-stone-900 mb-1">Visual Observation</h4>
            <p className="text-xs text-stone-500 leading-normal">
              Separates objective visible artwork from speculative context.
            </p>
          </div>

          <div className="p-4 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl transition-all">
            <div className="w-8 h-8 rounded-lg bg-indigo-100/70 flex items-center justify-center text-indigo-900 mb-2.5">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-stone-900 mb-1">Recipient Intelligence</h4>
            <p className="text-xs text-stone-500 leading-normal">
              Maps recipient knowledge depth and buyer motivations.
            </p>
          </div>

          <div className="p-4 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl transition-all">
            <div className="w-8 h-8 rounded-lg bg-sky-100/70 flex items-center justify-center text-sky-900 mb-2.5">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-stone-900 mb-1">Writing Brief Engine</h4>
            <p className="text-xs text-stone-500 leading-normal">
              Formulates standalone, step-by-step ChatGPT writing briefs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E8E4DC] rounded-xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Top Results Header */}
      <div className="px-5 py-3.5 border-b border-[#E8E4DC] bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-serif text-base font-semibold text-stone-900">
              {analysis.mode === 'title'
                ? 'Title Development Laboratory'
                : analysis.mode === 'recipient'
                ? 'Recipient Intelligence Dossier'
                : analysis.mode === 'brief'
                ? 'ChatGPT Editorial Writing Brief'
                : 'Full 360° Product Intelligence Audit'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-200">
              {analysis.mode === 'title'
                ? 'Mode: Title Lab'
                : analysis.mode === 'recipient'
                ? 'Mode: Recipient Intel'
                : analysis.mode === 'brief'
                ? 'Mode: Writing Brief'
                : 'Mode: Full Analysis'}
            </span>
            <span className="text-xs text-stone-500">
              · Business Brain v{analysis.businessBrainVersion}
            </span>
            {analysis.fallbackOccurred && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded border border-amber-200">
                Fallback active
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {analysis.mode === 'title'
              ? 'Multi-candidate exploration across 8+ distinct editorial approaches with critical evaluations.'
              : analysis.mode === 'recipient'
              ? 'Deep psychographic mapping, knowledge depth spectrum, buyer-recipient dynamics, and mismatch warnings.'
              : analysis.mode === 'brief'
              ? 'Actionable, prompt-ready writing brief calibrated for immediate pasting into ChatGPT.'
              : 'Complete 360° intelligence audit across visual observation, recipient psychology, angles, guide fit, and titles.'}
            {' · Analyzed ' + new Date(analysis.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {analysis.mode === 'title' && analysis.titleLaboratory && (
            <button
              onClick={handleGenerateMoreTitles}
              disabled={isGeneratingMoreTitles}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#FAF8F5] border border-[#1E3A8A]/40 text-[#1E3A8A] hover:bg-blue-50 transition-colors disabled:opacity-60"
              title="Generate 6 more diverse title candidates"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingMoreTitles ? 'animate-spin' : ''}`} />
              <span>{isGeneratingMoreTitles ? 'Generating...' : '+6 More Titles'}</span>
            </button>
          )}

          {analysis.writingBrief && (
            <button
              onClick={handleCopyBrief}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                copiedBrief
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#1E3A8A] text-white hover:bg-[#172554]'
              }`}
            >
              {copiedBrief ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBrief ? 'Brief Copied!' : 'Copy Brief for ChatGPT'}</span>
            </button>
          )}

          {analysis.writingBrief && (
            <button
              onClick={handleExportBriefMD}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 rounded-md transition-colors"
              title="Download Brief as Markdown file"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Brief (.md)</span>
            </button>
          )}

          <button
            onClick={handleExportFullJSON}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 rounded-md transition-colors"
            title="Export structured analysis as JSON"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="px-5 border-b border-[#E8E4DC] bg-white overflow-x-auto flex items-center gap-1 text-xs font-medium text-stone-600 scrollbar-none">
        {analysis.mode === 'title' ? (
          <>
            <button
              onClick={() => setActiveTab('moduleE')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                activeTab === 'moduleE'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-bold bg-blue-50/30'
                  : 'border-transparent text-stone-700 hover:text-[#1E3A8A]'
              }`}
            >
              <TypeIcon className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Title Laboratory & Candidate Matrix</span>
            </button>
          </>
        ) : analysis.mode === 'recipient' ? (
          <>
            <button
              onClick={() => setActiveTab('moduleB')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                activeTab === 'moduleB'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-bold bg-blue-50/30'
                  : 'border-transparent text-stone-700 hover:text-[#1E3A8A]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Recipient Intelligence Dossier</span>
            </button>
          </>
        ) : analysis.mode === 'brief' ? (
          <>
            <button
              onClick={() => setActiveTab('moduleG')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                activeTab === 'moduleG'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-bold bg-blue-50/30'
                  : 'border-transparent text-stone-700 hover:text-[#1E3A8A]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>ChatGPT Writing Brief (Core)</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'overview'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-200'
              }`}
            >
              Overview & Rubric
            </button>

            <button
              onClick={() => setActiveTab('moduleG')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                activeTab === 'moduleG'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-bold bg-blue-50/30'
                  : 'border-transparent text-stone-800 hover:text-[#1E3A8A]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>ChatGPT Writing Brief (Core)</span>
            </button>

            <button
              onClick={() => setActiveTab('moduleA')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'moduleA'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-200'
              }`}
            >
              Mod A: Visual & Conceptual
            </button>

            <button
              onClick={() => setActiveTab('moduleB')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'moduleB'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-200'
              }`}
            >
              Mod B: Recipient Intel
            </button>

            <button
              onClick={() => setActiveTab('moduleC')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'moduleC'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-200'
              }`}
            >
              Mod C: Positioning Angles
            </button>

            <button
              onClick={() => setActiveTab('moduleD')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'moduleD'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-200'
              }`}
            >
              Mod D: Guide Fit
            </button>

            <button
              onClick={() => setActiveTab('moduleE')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'moduleE'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-200'
              }`}
            >
              Mod E: Title Laboratory
            </button>

            <button
              onClick={() => setActiveTab('moduleF')}
              className={`px-3 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'moduleF'
                  ? 'border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                  : 'border-transparent hover:text-stone-900 hover:border-stone-200'
              }`}
            >
              Mod F: Differentiation (Phase 1)
            </button>
          </>
        )}
      </div>

      {/* Tab Content Display Area */}
      <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(100vh-17rem)] space-y-6">
        {/* Model Fallback Notice Banner */}
        {analysis.fallbackOccurred && (
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-bold text-sm block mb-0.5 text-amber-900">
                Notice: Automatic Model Fallback Executed
              </span>
              <p>
                The analysis was originally requested using <strong className="font-mono text-stone-900">{analysis.requestedModel}</strong>, but that model was temporarily unavailable from the Gemini API. To ensure continuous workflow without data loss, the studio safely executed the analysis using your preferred fallback engine: <strong className="font-mono text-[#1E3A8A]">{analysis.actualModel}</strong>.
              </p>
              {analysis.fallbackReason && (
                <p className="mt-1.5 text-[11px] text-amber-900/80 italic font-mono bg-amber-100/60 p-2 rounded border border-amber-200">
                  {analysis.fallbackReason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Missing / Incomplete info warning if flagged */}
        {analysis.incompleteInformationNotices && analysis.incompleteInformationNotices.length > 0 && (
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700">
            <span className="font-semibold text-stone-900 block mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Unverified / Incomplete Inputs Noted in this Report:</span>
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-stone-600">
              {analysis.incompleteInformationNotices.map((notice, i) => (
                <li key={i}>{notice}</li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB 1: OVERVIEW & SCORING */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Executive Editorial Summary */}
            <div className="bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A8A] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1E3A8A]"></span>
                  <span>Editorial Positioning Strategy</span>
                </span>
              </div>

              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {analysis.productPositioning?.distinctiveEssence || 'Product Positioning Synthesis'}
                </h3>
                <p className="text-sm text-stone-700 leading-relaxed mt-2">
                  {analysis.productPositioning?.whyDeservesGiftConsideration}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#E8E4DC] pt-4 text-xs">
                <div>
                  <span className="font-semibold text-stone-800 block mb-1">Best Served Recipient Profile</span>
                  <p className="text-stone-600 leading-normal">{analysis.productPositioning?.bestServedRecipient || 'Unspecified'}</p>
                </div>

                <div className="p-3 bg-white border border-[#E8E4DC] rounded-lg">
                  <span className="font-semibold text-stone-800 block mb-1">Recommended Product Title</span>
                  <p className="text-[#1E3A8A] font-semibold text-sm font-serif leading-snug">
                    {analysis.titleLaboratory?.recommendedTitle || analysis.writingBrief?.productIdentity?.workingTitle || 'Untitled Product'}
                  </p>
                </div>
              </div>
            </div>

            {/* Transparent Scoring Rubric */}
            <div className="space-y-3">
              <div>
                <h4 className="font-serif text-base sm:text-lg font-bold text-stone-900">
                  Transparent Recommendation Rubric
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Evaluated strictly from available evidence. Insufficient data yields &quot;Insufficient data&quot;, not arbitrary high scores.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.scoring?.dimensions.map((dim) => (
                  <div
                    key={dim.id}
                    className="p-4 bg-white border border-[#E8E4DC] rounded-xl flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-100">
                        <span className="text-sm font-bold text-stone-900">{dim.name}</span>
                        {dim.score !== null ? (
                          <span className="text-xs font-mono font-bold text-[#1E3A8A] bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">
                            {dim.score} / {dim.maxScore}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Insufficient data
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed">{dim.explanation}</p>
                    </div>

                    <div className="text-xs pt-2.5 border-t border-stone-100 text-stone-600 bg-stone-50/60 p-2.5 rounded-lg">
                      <span className="font-semibold text-stone-800">Supporting evidence: </span>
                      <span>{dim.supportingEvidence}</span>
                      {dim.missingEvidenceOrLimitations && (
                        <p className="text-amber-800/90 mt-1 text-[11px]">
                          <span className="font-semibold">Limitation: </span>
                          <span>{dim.missingEvidenceOrLimitations}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {analysis.scoring?.limitationsNotice && (
                <p className="text-[11px] text-stone-400 mt-1 italic">
                  Note: {analysis.scoring.limitationsNotice}
                </p>
              )}
            </div>

            {/* Optional Collapsible Technical Details */}
            <div className="border-t border-[#E8E4DC] pt-4">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`} />
                <span>{showTechnicalDetails ? 'Hide technical details & execution diagnostics' : 'Show technical details & execution diagnostics'}</span>
              </button>

              {showTechnicalDetails && (
                <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-2 text-stone-600 font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Business Brain</span>
                      <span className="text-stone-800 font-bold">Version {analysis.businessBrainVersion}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Requested Engine</span>
                      <span className="text-stone-800 font-bold">{analysis.requestedModel || analysis.modelIdentifier}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Executed Engine</span>
                      <span className="text-stone-800 font-bold">{analysis.actualModel || analysis.modelIdentifier}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Execution Status</span>
                      <span className={analysis.fallbackOccurred ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                        {analysis.fallbackOccurred ? 'Fallback Executed' : 'Direct Success'}
                      </span>
                    </div>
                  </div>
                  {analysis.fallbackReason && (
                    <div className="pt-2 border-t border-stone-200 text-[11px] text-amber-800 italic font-sans">
                      <span className="font-semibold font-mono text-stone-700">Fallback reason: </span>
                      {analysis.fallbackReason}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick jump to Brief CTA */}
            <div className="p-4 bg-blue-50/50 border border-blue-200/60 rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">Primary Deliverable</span>
                <p className="text-sm font-serif font-medium text-stone-900 mt-0.5">
                  Detailed Standalone ChatGPT Writing Brief Ready
                </p>
              </div>
              <button
                onClick={() => setActiveTab('moduleG')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors flex items-center gap-1"
              >
                <span>View Full Brief</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB: MODULE G - CHATGPT WRITING BRIEF (PRIMARY DELIVERABLE) */}
        {activeTab === 'moduleG' && analysis.writingBrief && (
          <div className="space-y-6">
            <div className="bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#1E3A8A]">
                  Primary Application Deliverable
                </span>
                <button
                  onClick={handleCopyBrief}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-[#1E3A8A] text-white rounded-md hover:bg-[#172554] transition-colors"
                >
                  {copiedBrief ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBrief ? 'Copied to Clipboard' : 'Copy Full Brief'}</span>
                </button>
              </div>
              <h3 className="font-serif text-2xl font-bold text-stone-900 mb-1">
                {analysis.writingBrief.briefTitle || 'ChatGPT Editorial Writing Brief'}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Copy this complete brief and paste directly into ChatGPT. It provides actionable editorial boundaries, recipient nuance, and verified design details without pre-writing finished sales copy.
              </p>
            </div>

            {/* Brief Sections */}
            <div className="space-y-5 text-sm">
              {/* 1. Identity & Guide */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                  <h5 className="font-serif font-semibold text-stone-900 mb-1.5 text-sm">
                    1. Product Identity & Specs
                  </h5>
                  <div className="text-xs space-y-1 text-stone-600">
                    <p><span className="font-medium text-stone-800">Working Name:</span> {analysis.writingBrief.productIdentity?.workingTitle}</p>
                    <p><span className="font-medium text-stone-800">Product Type:</span> {analysis.writingBrief.productIdentity?.productType}</p>
                    <p><span className="font-medium text-stone-800">Supplied Specs:</span> {analysis.writingBrief.productIdentity?.suppliedSpecifications}</p>
                  </div>
                </div>

                <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                  <h5 className="font-serif font-semibold text-stone-900 mb-1.5 text-sm">
                    2. Gift Guide Context
                  </h5>
                  <div className="text-xs space-y-1 text-stone-600">
                    <p><span className="font-medium text-stone-800">Guide:</span> {analysis.writingBrief.guideContext?.guideName}</p>
                    <p><span className="font-medium text-stone-800">Purpose:</span> {analysis.writingBrief.guideContext?.guidePurpose}</p>
                  </div>
                </div>
              </div>

              {/* 3. Recipient Profile */}
              <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                <h5 className="font-serif font-semibold text-stone-900 mb-1.5 text-sm">
                  3. Recipient Profile & Gifting Psychology
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-stone-600">
                  <div>
                    <span className="font-medium text-stone-800">Primary Recipient:</span>
                    <p className="mt-0.5">{analysis.writingBrief.recipientProfile?.primaryRecipient}</p>
                  </div>
                  <div>
                    <span className="font-medium text-stone-800">Knowledge Depth:</span>
                    <p className="mt-0.5">{analysis.writingBrief.recipientProfile?.knowledgeDepth}</p>
                  </div>
                  <div>
                    <span className="font-medium text-stone-800">Gift Buyer's Motivation:</span>
                    <p className="mt-0.5">{analysis.writingBrief.recipientProfile?.buyerMotivation}</p>
                  </div>
                </div>
              </div>

              {/* 4. Recommended Angle & Purpose */}
              <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                <h5 className="font-serif font-semibold text-stone-900 mb-2 text-sm">
                  4. Recommended Editorial Angle & Strategic Goal
                </h5>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-[#1E3A8A]">Recommended Angle: </span>
                    <span className="font-medium text-stone-800">{analysis.writingBrief.editorialAngle?.recommendedAngle}</span>
                  </div>
                  <p className="text-stone-600 leading-relaxed">
                    <span className="font-medium text-stone-800">Strategic Rationale: </span>
                    {analysis.writingBrief.editorialAngle?.strategicRationale}
                  </p>
                  <p className="text-stone-600 leading-relaxed">
                    <span className="font-medium text-stone-800">Core Goal of Entry: </span>
                    {analysis.writingBrief.editorialAngle?.coreGoalOfEntry}
                  </p>
                  <p className="text-stone-600 leading-relaxed">
                    <span className="font-medium text-stone-800">Distinctive Inclusion Reason: </span>
                    {analysis.writingBrief.editorialAngle?.distinctiveInclusionReason}
                  </p>
                </div>
              </div>

              {/* 5. Product-Specific Editorial Reasoning Stage */}
              {analysis.writingBrief.productEditorialReasoning && (
                <div className="p-4 bg-blue-50/40 border border-blue-200/80 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1E3A8A]" />
                    <h5 className="font-serif font-bold text-[#1E3A8A] text-sm">
                      5. Product-Specific Editorial Reasoning Stage
                    </h5>
                  </div>
                  <div className="space-y-2.5 text-xs text-stone-800">
                    <div className="p-2.5 bg-white rounded border border-blue-100">
                      <span className="font-bold text-stone-900 block mb-0.5">Step A — Distinctive Concept:</span>
                      <p className="text-stone-700 leading-relaxed">{analysis.writingBrief.productEditorialReasoning.distinctiveConcept}</p>
                    </div>
                    <div className="p-2.5 bg-white rounded border border-blue-100">
                      <span className="font-bold text-stone-900 block mb-0.5">Step B — Curated Design Details:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-stone-700">
                        {analysis.writingBrief.productEditorialReasoning.curatedDetailsToEmphasize?.map((d, idx) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2.5 bg-white rounded border border-blue-100">
                      <span className="font-bold text-stone-900 block mb-0.5">Step C — Why the Design Works:</span>
                      <p className="text-stone-700 leading-relaxed">{analysis.writingBrief.productEditorialReasoning.whyDesignWorks}</p>
                    </div>
                    <div className="p-2.5 bg-white rounded border border-blue-100">
                      <span className="font-bold text-stone-900 block mb-0.5">Step D — Buyer-Facing Perspective:</span>
                      <p className="text-stone-700 leading-relaxed">{analysis.writingBrief.productEditorialReasoning.buyerFacingInterpretation}</p>
                    </div>
                    <div className="p-2.5 bg-white rounded border border-blue-100">
                      <span className="font-bold text-stone-900 block mb-0.5">Step E — Verified Facts Selection:</span>
                      <p className="text-stone-700 leading-relaxed">{analysis.writingBrief.productEditorialReasoning.verifiedFactsToInclude?.join(' • ')}</p>
                    </div>
                  </div>
                </div>
              )}



              {/* 7. Editorial Quality Audit */}
              {analysis.writingBrief.editorialQualityAudit && (
                <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-serif font-semibold text-stone-900 text-sm">
                      Editorial Quality Audit (8-Point Self-Evaluation)
                    </h5>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        analysis.writingBrief.editorialQualityAudit.passed
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {analysis.writingBrief.editorialQualityAudit.passed ? 'PASSED EDITORIAL BENCHMARK' : 'NEEDS REVISION'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries({
                      Specificity: analysis.writingBrief.editorialQualityAudit.specificity,
                      Interpretation: analysis.writingBrief.editorialQualityAudit.interpretation,
                      'Angle Quality': analysis.writingBrief.editorialQualityAudit.angleQuality,
                      'Factual Integrity': analysis.writingBrief.editorialQualityAudit.factualIntegrity,
                      Relevance: analysis.writingBrief.editorialQualityAudit.relevance,
                      Redundancy: analysis.writingBrief.editorialQualityAudit.redundancy,
                      Naturalness: analysis.writingBrief.editorialQualityAudit.naturalness,
                      'Buyer Usefulness': analysis.writingBrief.editorialQualityAudit.buyerUsefulness,
                    }).map(([label, val], idx) => (
                      <div key={idx} className="p-2 bg-[#FAF8F5] rounded border border-stone-200 flex items-center justify-between">
                        <span className="text-stone-700 font-medium">{label}</span>
                        <span className={`font-bold ${val ? 'text-emerald-700' : 'text-red-600'}`}>
                          {val ? '✓ Pass' : '❌ Fail'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {analysis.writingBrief.editorialQualityAudit.notes && (
                    <p className="text-stone-500 italic pt-1">
                      Note: {analysis.writingBrief.editorialQualityAudit.notes}
                    </p>
                  )}
                </div>
              )}

              {/* 5. Key Design Details to Emphasize */}
              <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                <h5 className="font-serif font-semibold text-stone-900 mb-2 text-sm">
                  5. Design Details to Emphasize & Their Relationship to the Recipient
                </h5>
                <div className="space-y-3">
                  {analysis.writingBrief.designDetailsToEmphasize?.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-[#FAF8F5] border border-stone-200/70 rounded-md text-xs">
                      <span className="font-semibold text-stone-900 block">{item.detail}</span>
                      <p className="text-stone-600 mt-1">
                        <span className="font-medium text-stone-700">Why it matters to recipient: </span>
                        {item.relationshipToRecipient}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Tone & Stylistic Direction */}
              <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                <h5 className="font-serif font-semibold text-stone-900 mb-2 text-sm">
                  6. Tone & Stylistic Direction
                </h5>
                <ul className="list-disc pl-5 space-y-1 text-xs text-stone-600">
                  {analysis.writingBrief.toneAndStyleDirection?.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>

              {/* 7. Negative Constraints & Boundaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50/40 border border-red-200/60 rounded-lg">
                  <h5 className="font-serif font-semibold text-red-900 mb-2 text-sm">
                    Claims & Assumptions to AVOID
                  </h5>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-red-800/90">
                    {analysis.writingBrief.claimsAndAssumptionsToAvoid?.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/40 border border-amber-200/60 rounded-lg">
                  <h5 className="font-serif font-semibold text-amber-900 mb-2 text-sm">
                    Missing Information — DO NOT INVENT
                  </h5>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-amber-800/90">
                    {analysis.writingBrief.missingInformationDoNotInvent?.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 8. Facts Requiring Verification */}
              {analysis.writingBrief.factsRequiringVerification && analysis.writingBrief.factsRequiringVerification.length > 0 && (
                <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                  <h5 className="font-serif font-semibold text-stone-900 mb-2 text-sm">
                    Facts Requiring Verification Before Publication
                  </h5>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-stone-600">
                    {analysis.writingBrief.factsRequiringVerification.map((f, idx) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 9. Quality Control Checklist */}
              <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                <h5 className="font-serif font-semibold text-stone-900 mb-2 text-sm">
                  Pre-Publication QC Checklist
                </h5>
                <div className="space-y-1.5 text-xs text-stone-700">
                  {analysis.writingBrief.qualityControlChecklist?.map((qc, idx) => (
                    <label key={idx} className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" className="mt-0.5 rounded text-[#1E3A8A]" />
                      <span>{qc}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MODULE A - VISUAL & CONCEPTUAL ANALYSIS */}
        {activeTab === 'moduleA' && analysis.visualConceptual && (
          <div className="space-y-5">
            <div>
              <h4 className="font-serif text-lg font-bold text-stone-900">
                Module A: Visual & Conceptual Analysis
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Rigorously separating physical observations from interpretive hypotheses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg">
                <span className="font-semibold text-stone-800 block mb-1">Product Type & Format</span>
                <p className="text-stone-600 leading-relaxed">{analysis.visualConceptual.productTypeApparent}</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg">
                <span className="font-semibold text-stone-800 block mb-1">Subject & Secondary Elements</span>
                <p className="text-stone-600 leading-relaxed">{analysis.visualConceptual.mainSubjectAndSecondaryElements}</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg">
                <span className="font-semibold text-stone-800 block mb-1">Visible Text & Typography</span>
                <p className="text-stone-600 leading-relaxed">{analysis.visualConceptual.visibleTextAndTypography}</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg">
                <span className="font-semibold text-stone-800 block mb-1">Palette & Aesthetic</span>
                <p className="text-stone-600 leading-relaxed">{analysis.visualConceptual.colorPaletteAndAesthetic}</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg">
                <span className="font-semibold text-stone-800 block mb-1">Symbols, Motifs & References</span>
                <p className="text-stone-600 leading-relaxed">{analysis.visualConceptual.symbolsAndMotifs}</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg">
                <span className="font-semibold text-stone-800 block mb-1">Metaphors, Humor or Tone</span>
                <p className="text-stone-600 leading-relaxed">{analysis.visualConceptual.humorIronyMetaphors || 'None apparent'}</p>
              </div>
            </div>

            {/* Distinct Findings Table */}
            <div>
              <h5 className="font-serif font-semibold text-stone-900 text-sm mb-2">
                Documented Visual Findings & Verification Requirements
              </h5>
              <div className="overflow-x-auto border border-[#E8E4DC] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#E8E4DC] text-stone-600">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Physical Observation</th>
                      <th className="py-2.5 px-3 font-semibold">Interpretive Reading</th>
                      <th className="py-2.5 px-3 font-semibold">Confidence</th>
                      <th className="py-2.5 px-3 font-semibold">Verification Need</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E4DC]">
                    {analysis.visualConceptual.findings?.map((f, i) => (
                      <tr key={i} className="hover:bg-stone-50/50">
                        <td className="py-2.5 px-3 font-medium text-stone-800">{f.observation}</td>
                        <td className="py-2.5 px-3 text-stone-600">{f.interpretation}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${
                              f.confidence === 'high'
                                ? 'bg-emerald-50 text-emerald-800'
                                : f.confidence === 'medium'
                                ? 'bg-sky-50 text-sky-800'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {f.confidence}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 italic">{f.verificationRequirement || 'None required'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MODULE B - RECIPIENT INTELLIGENCE */}
        {activeTab === 'moduleB' && analysis.recipientIntelligence && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-3">
              <div>
                <h4 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#1E3A8A]" />
                  <span>Recipient Intelligence Dossier</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Deep psychographic profile, knowledge depth spectrum, buyer-recipient dynamics, and mismatch warnings.
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-200">
                Mode: Recipient Intelligence
              </span>
            </div>

            {/* Primary Recipient Profile Banner */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-[#FAF8F5] border border-[#E8E4DC] rounded-xl space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A8A] block">
                Primary Recipient Persona
              </span>
              <p className="font-serif text-base font-semibold text-stone-900 leading-snug">
                {analysis.recipientIntelligence.primaryRecipientProfile}
              </p>
              <p className="text-xs text-stone-600 leading-relaxed">
                <strong className="text-stone-800">General Knowledge Baseline: </strong>
                {analysis.recipientIntelligence.knowledgeDepth}
              </p>
            </div>

            {/* Subject Knowledge Depth Spectrum */}
            {analysis.recipientIntelligence.knowledgeSpectrum && (
              <div className="space-y-3">
                <h5 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#1E3A8A]" />
                  <span>Subject Knowledge Depth Spectrum</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-white border border-[#E8E4DC] rounded-lg">
                    <span className="font-bold text-stone-800 block mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      <span>Casual Admirer / Pop Culture</span>
                    </span>
                    <p className="text-stone-600 leading-relaxed">
                      {analysis.recipientIntelligence.knowledgeSpectrum.casualLevel}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E8E4DC] rounded-lg">
                    <span className="font-bold text-stone-800 block mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span>Dedicated Enthusiast / Hobbyist</span>
                    </span>
                    <p className="text-stone-600 leading-relaxed">
                      {analysis.recipientIntelligence.knowledgeSpectrum.enthusiastLevel}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E8E4DC] rounded-lg">
                    <span className="font-bold text-stone-800 block mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                      <span>Specialist / Serious Scholar</span>
                    </span>
                    <p className="text-stone-600 leading-relaxed">
                      {analysis.recipientIntelligence.knowledgeSpectrum.specialistLevel}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Buyer vs Recipient alignment box */}
            <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] flex items-center gap-1.5">
                <Scale className="w-4 h-4" />
                <span>Buyer Motivation vs. Recipient Experience (The Gifting Dynamic)</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-stone-700">
                <div className="p-3 bg-white/80 border border-sky-100 rounded-lg">
                  <span className="font-bold text-stone-900 block mb-1">Gift Buyer's Motivation:</span>
                  <p className="leading-relaxed">{analysis.recipientIntelligence.buyerMotivationVsRecipientPerspective?.buyerMotivation}</p>
                </div>
                <div className="p-3 bg-white/80 border border-sky-100 rounded-lg">
                  <span className="font-bold text-stone-900 block mb-1">Recipient's True Preference:</span>
                  <p className="leading-relaxed">{analysis.recipientIntelligence.buyerMotivationVsRecipientPerspective?.recipientPreference}</p>
                </div>
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-950">
                  <span className="font-bold text-amber-900 block mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Alignment Risk / Misstep:</span>
                  </span>
                  <p className="leading-relaxed">{analysis.recipientIntelligence.buyerMotivationVsRecipientPerspective?.alignmentRisk}</p>
                </div>
              </div>
            </div>

            {/* Audience Mismatches & Appeal Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Audience Mismatches: Who NOT to buy this for */}
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
                <span className="font-bold text-rose-900 flex items-center gap-1.5 text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-700" />
                  <span>Audience Mismatches (Who this is NOT for)</span>
                </span>
                <p className="text-[11px] text-rose-800">Recipients who will dislike, misunderstand, or cringe at this item:</p>
                <ul className="list-disc pl-4 space-y-1.5 text-stone-700">
                  {analysis.recipientIntelligence.audienceMismatches?.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              {/* Reasons it might fall flat */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  <span>Potential Purchase Hesitations / Risks</span>
                </span>
                <p className="text-[11px] text-amber-800">Scenarios where the product might fail to deliver on expectations:</p>
                <ul className="list-disc pl-4 space-y-1.5 text-stone-700">
                  {analysis.recipientIntelligence.reasonsItMightNotAppeal?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Appeal Dimensions Breakdown */}
            <div className="space-y-3">
              <h5 className="font-serif font-bold text-stone-900 text-sm">
                Multidimensional Appeal Breakdown
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                {analysis.recipientIntelligence.appealTypes?.map((appeal, i) => (
                  <div key={i} className="p-3 bg-white border border-[#E8E4DC] rounded-lg space-y-1">
                    <span className="font-mono text-[11px] font-semibold uppercase text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded inline-block">
                      {appeal.type}
                    </span>
                    <p className="text-stone-600 leading-relaxed pt-1">
                      {appeal.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shopper Buying Advice & Gifting Occasions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-white border border-[#E8E4DC] rounded-xl space-y-2">
                <span className="font-bold text-stone-900 text-sm block">
                  Relevant Gifting Occasions
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analysis.recipientIntelligence.relevantGiftingOccasions?.map((occ, i) => (
                    <span key={i} className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full font-medium text-[11px]">
                      {occ}
                    </span>
                  ))}
                </div>
              </div>

              {analysis.recipientIntelligence.shopperBuyingAdvice && analysis.recipientIntelligence.shopperBuyingAdvice.length > 0 && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                  <span className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Shopper's Practical Buying Advice</span>
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-stone-700">
                    {analysis.recipientIntelligence.shopperBuyingAdvice.map((advice, i) => (
                      <li key={i}>{advice}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: MODULE C - PRODUCT POSITIONING */}
        {activeTab === 'moduleC' && analysis.productPositioning && (
          <div className="space-y-5">
            <div>
              <h4 className="font-serif text-lg font-bold text-stone-900">
                Module C: Product Positioning Angles
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Up to 3 distinct strategic angles evaluating strengths, weaknesses, and evidence.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {analysis.productPositioning.positioningAngles?.map((angle, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-colors ${
                    angle.recommendation === 'preferred'
                      ? 'border-[#1E3A8A] bg-blue-50/20'
                      : 'border-[#E8E4DC] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-base font-bold text-stone-900">
                        {angle.angleName}
                      </span>
                      {angle.recommendation === 'preferred' && (
                        <span className="px-2 py-0.5 bg-[#1E3A8A] text-white text-[11px] font-semibold rounded">
                          Preferred Angle
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-500">
                      Target: <strong className="text-stone-700">{angle.intendedRecipient}</strong>
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed mb-3">
                    <span className="font-semibold">Central Appeal: </span>
                    {angle.centralAppeal}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                    <div className="p-2.5 bg-[#FAF8F5] rounded border border-stone-200">
                      <span className="font-semibold text-emerald-800 block mb-1">Strengths:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                        {angle.strengths?.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2.5 bg-[#FAF8F5] rounded border border-stone-200">
                      <span className="font-semibold text-amber-800 block mb-1">Limitations / Weaknesses:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                        {angle.weaknessesOrLimitations?.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-stone-600">
                    <span className="font-medium text-stone-800">Supporting Design Evidence: </span>
                    {angle.supportingDesignEvidence}
                  </div>
                </div>
              ))}
            </div>

            {analysis.productPositioning.preferredAngleRationale && (
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-lg text-xs">
                <span className="font-semibold text-stone-900 block mb-1">
                  Preferred Angle Selection Rationale:
                </span>
                <p className="text-stone-600 leading-relaxed">
                  {analysis.productPositioning.preferredAngleRationale}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: MODULE D - GIFT GUIDE FIT */}
        {activeTab === 'moduleD' && analysis.giftGuideFit && (
          <div className="space-y-5">
            <div>
              <h4 className="font-serif text-lg font-bold text-stone-900">
                Module D: Gift-Guide Fit Analysis
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Evaluating curatorial role, category variety, and potential entry cannibalization.
              </p>
            </div>

            <div className="p-4 bg-white border border-[#E8E4DC] rounded-xl space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-800">Fits Selected Guide:</span>
                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    analysis.giftGuideFit.fitsSelectedGuide
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {analysis.giftGuideFit.fitsSelectedGuide ? 'Yes — Clear Editorial Fit' : 'Marginal / Questionable'}
                </span>
              </div>

              <p className="text-stone-700 leading-relaxed">
                <span className="font-semibold text-stone-800">Fit Assessment: </span>
                {analysis.giftGuideFit.fitAssessment}
              </p>

              <p className="text-stone-700 leading-relaxed">
                <span className="font-semibold text-stone-800">Unique Role in Guide: </span>
                {analysis.giftGuideFit.uniqueRoleInGuide}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-stone-200 pt-3">
                <div>
                  <span className="font-semibold text-stone-800">Aesthetic Contribution:</span>
                  <p className="text-stone-600 mt-0.5">{analysis.giftGuideFit.varietyContribution?.aestheticRole}</p>
                </div>
                <div>
                  <span className="font-semibold text-stone-800">Price Point / Format:</span>
                  <p className="text-stone-600 mt-0.5">{analysis.giftGuideFit.varietyContribution?.pricePointOrFormatRole}</p>
                </div>
                <div>
                  <span className="font-semibold text-stone-800">Recipient Appeal:</span>
                  <p className="text-stone-600 mt-0.5">{analysis.giftGuideFit.varietyContribution?.recipientAppealRole}</p>
                </div>
              </div>

              {analysis.giftGuideFit.uniquenessDisclaimer && (
                <p className="text-[11px] text-stone-500 italic border-t border-stone-100 pt-2">
                  * {analysis.giftGuideFit.uniquenessDisclaimer}
                </p>
              )}
            </div>

            {/* Live Catalogue Similarity Comparisons */}
            <div className="p-4 bg-white border border-[#E8E4DC] rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#1E3A8A]" />
                  <h5 className="font-serif font-bold text-stone-900 text-sm">
                    Catalogue Overlap & Multidimensional Matches ({catalogueComparisons.length})
                  </h5>
                </div>
                <span className="text-[10px] font-mono text-stone-500">
                  {catalogueProducts.length} Total Inventory Records
                </span>
              </div>

              {catalogueComparisons.length === 0 ? (
                <p className="text-stone-500 text-xs italic">
                  No other catalogue products found in this guide or niche to compare against.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {catalogueComparisons.slice(0, 3).map((comp, idx) => {
                    const matchedProd = catalogueProducts.find((p) => p.id === comp.productBId);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">{comp.productBName}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#1E3A8A] border border-blue-200">
                            {comp.categoryLabel}
                          </span>
                        </div>
                        <p className="text-stone-600 text-[11px] leading-relaxed">
                          {comp.qualitativeAssessment}
                        </p>
                        {matchedProd && onInspectComparison && (
                          <button
                            onClick={() => onInspectComparison(matchedProd)}
                            className="text-[11px] font-semibold text-[#1E3A8A] hover:underline flex items-center gap-1 pt-0.5"
                          >
                            <span>Inspect 6-Dimension Comparison</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fourthwall Catalogue Intelligence & Product Recommendations */}
            {fourthwallReport && (
              <div className="p-5 bg-white border border-[#E8E4DC] rounded-xl space-y-4 text-xs shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E8E4DC] pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E3A8A] mb-0.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Official Fourthwall Catalogue Intelligence & Product Fit</span>
                    </div>
                    <h5 className="font-serif font-bold text-stone-900 text-sm">
                      Full Range Evaluation ({fourthwallReport.totalProductsVerified} Verified Products)
                    </h5>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                    <span>Source: <a href={fourthwallReport.sourceUrl} target="_blank" rel="noreferrer" className="text-[#1E3A8A] hover:underline">fourthwall.com</a></span>
                    <span>•</span>
                    <span>Updated: {fourthwallReport.lastRefreshed}</span>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {(['all', 'prioritize', 'test', 'consider_later', 'skip'] as const).map((filterKey) => {
                    const count = filterKey === 'all' 
                      ? fourthwallReport.evaluations.length 
                      : fourthwallReport.evaluations.filter(e => e.recommendationStatus === filterKey).length;
                    return (
                      <button
                        key={filterKey}
                        onClick={() => setFourthwallFilter(filterKey)}
                        className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors flex items-center gap-1.5 ${
                          fourthwallFilter === filterKey
                            ? 'bg-[#1E3A8A] text-white font-semibold'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <span>{filterKey.replace('_', ' ')}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${fourthwallFilter === filterKey ? 'bg-blue-900 text-white' : 'bg-stone-200 text-stone-800'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Evaluations List */}
                <div className="space-y-3 pt-2">
                  {fourthwallReport.evaluations
                    .filter((ev) => fourthwallFilter === 'all' || ev.recommendationStatus === fourthwallFilter)
                    .map((evalItem, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          evalItem.recommendationStatus === 'prioritize'
                            ? 'border-emerald-300 bg-emerald-50/20'
                            : evalItem.recommendationStatus === 'test'
                            ? 'border-blue-200 bg-blue-50/20'
                            : evalItem.recommendationStatus === 'consider_later'
                            ? 'border-stone-200 bg-white'
                            : 'border-stone-200 bg-stone-50 opacity-75'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-serif font-bold text-stone-900 text-sm">
                              {evalItem.fourthwallProduct.name}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                              {evalItem.fourthwallProduct.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#1E3A8A] text-xs">
                              Score: {evalItem.overallScore}/100
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                evalItem.recommendationStatus === 'prioritize'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : evalItem.recommendationStatus === 'test'
                                  ? 'bg-blue-100 text-blue-900'
                                  : evalItem.recommendationStatus === 'consider_later'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {evalItem.recommendationStatus.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <p className="text-stone-700 leading-relaxed mb-3">
                          <strong className="text-stone-900">Why it suits: </strong>
                          {evalItem.whyItSuits}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mb-3 bg-[#FAF8F5] p-3 rounded-lg border border-stone-200/70 text-[11px]">
                          <div>
                            <span className="font-semibold text-stone-800 block">Design Compatibility:</span>
                            <span className="font-mono font-bold text-[#1E3A8A]">{evalItem.compatibilityScore}/100</span>
                          </div>
                          <div>
                            <span className="font-semibold text-stone-800 block">Gift Suitability:</span>
                            <span className="font-mono font-bold text-[#1E3A8A]">{evalItem.giftSuitabilityScore}/100</span>
                          </div>
                          <div>
                            <span className="font-semibold text-stone-800 block">Demand Evidence:</span>
                            <span className="font-mono font-bold text-[#1E3A8A]">{evalItem.demandScore}/100</span>
                          </div>
                          <div>
                            <span className="font-semibold text-stone-800 block">Cost / Retail:</span>
                            <span className="font-mono text-stone-700">${evalItem.fourthwallProduct.baseCost.toFixed(2)} / ${evalItem.fourthwallProduct.suggestedRetailPrice.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-stone-600 border-t border-stone-100 pt-2 text-[11px]">
                          <div>
                            <strong className="text-stone-800">Gift Appeal & Buyer: </strong>
                            {evalItem.giftAppealAndBuyer}
                          </div>
                          <div>
                            <strong className="text-stone-800">Required Modifications: </strong>
                            {evalItem.requiredModifications.join(' ')}
                          </div>
                          <div>
                            <strong className="text-stone-800">Demand Evidence: </strong>
                            {evalItem.demandEvidence}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MODULE E - TITLE LABORATORY */}
        {activeTab === 'moduleE' && analysis.titleLaboratory && (
          <div className="space-y-6">
            {/* Header & Primary Actions Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E4DC] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#99BFF9]/20 border border-[#99BFF9]/50 flex items-center justify-center text-[#1B3D5F]">
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif text-lg sm:text-xl font-bold text-[#1B3D5F] leading-tight">
                      Title Development Laboratory
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Explore distinct editorial angles, compare advantages and trade-offs, and discover the champion title.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleGenerateMoreTitles}
                  disabled={isGeneratingMoreTitles}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#1B3D5F] hover:bg-[#28537D] text-white shadow-xs transition-all disabled:opacity-50 active:scale-98"
                  title="Generate 6 more diverse title candidates using Gemini"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingMoreTitles ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingMoreTitles ? 'Generating...' : '+6 More Titles'}</span>
                </button>

                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-[#C3F3DF]/60 text-[#1B3D5F] border border-[#A7E8CD]">
                  {combinedTitleOptions.length} Candidates
                </span>
              </div>
            </div>

            {/* Prominent Recommendation Area (Definitive Winner) */}
            {analysis.titleLaboratory.recommendedTitle && (
              <div className="bg-gradient-to-r from-[#F4F9FD] via-white to-[#F0FAF5] border border-[#99BFF9]/70 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#99BFF9]/30 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#C3F3DF] text-[#1B3D5F] border border-[#A7E8CD] shadow-2xs">
                      <Award className="w-3.5 h-3.5 text-[#1B3D5F]" />
                      <span>Top Editorial Recommendation</span>
                    </span>
                    <span className="text-[11px] font-medium text-stone-500 hidden sm:inline">
                      · Champion Contender
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApplyTitle(analysis.titleLaboratory!.recommendedTitle)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-all ${
                        appliedTitle === analysis.titleLaboratory.recommendedTitle ||
                        product?.details?.workingName === analysis.titleLaboratory.recommendedTitle
                          ? 'bg-emerald-700 text-white'
                          : 'bg-[#1B3D5F] hover:bg-[#28537D] text-white active:scale-98'
                      }`}
                    >
                      {appliedTitle === analysis.titleLaboratory.recommendedTitle ||
                      product?.details?.workingName === analysis.titleLaboratory.recommendedTitle ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {appliedTitle === analysis.titleLaboratory.recommendedTitle ||
                        product?.details?.workingName === analysis.titleLaboratory.recommendedTitle
                          ? 'Applied as Working Title'
                          : 'Set as Working Title'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleCopySingleTitle(analysis.titleLaboratory!.recommendedTitle, 'rec_hero')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1B3D5F] bg-white border border-[#99BFF9] hover:bg-blue-50 rounded-lg transition-colors"
                      title="Copy recommended title to clipboard"
                    >
                      {copiedTitleIndex === 'rec_hero' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedTitleIndex === 'rec_hero' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Champion Title Text: Prominent, natural line wrapping */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Recommended Heading:
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-[#1B3D5F] leading-snug tracking-tight break-normal whitespace-normal">
                    &ldquo;{analysis.titleLaboratory.recommendedTitle}&rdquo;
                  </h3>
                </div>

                {/* Recommendation Details: Why it wins & Trade-offs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3.5 bg-white/90 rounded-xl border border-[#99BFF9]/40 space-y-1">
                    <span className="font-bold text-[#1B3D5F] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#28537D]" />
                      <span>Why It Is the Strongest Option:</span>
                    </span>
                    <p className="text-stone-700 leading-relaxed">
                      {analysis.titleLaboratory.recommendedRationale}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/90 rounded-xl border border-[#E8E4DC] space-y-1">
                    <span className="font-bold text-stone-800 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-stone-600" />
                      <span>Strategic Trade-offs Considered:</span>
                    </span>
                    <p className="text-stone-600 leading-relaxed italic">
                      {analysis.titleLaboratory.recommendedTitleTradeOffs ||
                        'Balances narrative charm for gift guides with immediate product category recognition.'}
                    </p>
                  </div>
                </div>

                {/* Runner-Up Contender (if present) */}
                {analysis.titleLaboratory.runnerUpTitle && (
                  <div className="p-3 bg-white/90 border border-stone-200/90 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          Runner-Up Alternative:
                        </span>
                        <span className="font-serif font-bold text-stone-900 text-sm">
                          &ldquo;{analysis.titleLaboratory.runnerUpTitle}&rdquo;
                        </span>
                      </div>
                      {analysis.titleLaboratory.runnerUpRationale && (
                        <p className="text-stone-600 text-[11px] leading-relaxed">
                          <strong className="text-stone-800">When to use: </strong>
                          {analysis.titleLaboratory.runnerUpRationale}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApplyTitle(analysis.titleLaboratory!.runnerUpTitle!)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-[#1B3D5F] bg-[#99BFF9]/20 hover:bg-[#99BFF9]/40 rounded-md border border-[#99BFF9]/60 transition-colors"
                      >
                        Use Runner-Up
                      </button>
                      <button
                        onClick={() => handleCopySingleTitle(analysis.titleLaboratory!.runnerUpTitle!, 'rec_runner')}
                        className="p-1 text-stone-500 hover:text-stone-800 rounded-md border border-stone-200"
                        title="Copy runner-up title"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Existing Title Diagnostic Evaluation (if supplied) */}
            {analysis.titleLaboratory.existingTitleEvaluation &&
              analysis.titleLaboratory.existingTitleEvaluation.verdict !== 'none_provided' && (
                <div className="bg-white border border-[#E8E4DC] rounded-xl shadow-2xs overflow-hidden">
                  <button
                    onClick={() => setShowDiagnosticEvaluation(!showDiagnosticEvaluation)}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border-b border-[#E8E4DC] flex items-center justify-between text-left hover:bg-stone-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#28537D]" />
                      <span className="text-xs font-bold text-stone-900">
                        Supplied Title Diagnostic Audit
                      </span>
                      <span className="text-xs text-stone-600 font-serif italic truncate max-w-xs sm:max-w-md">
                        &ldquo;{analysis.titleLaboratory.existingTitleEvaluation.currentTitleProvided}&rdquo;
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {analysis.titleLaboratory.existingTitleEvaluation.verdict === 'needs_replacement' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Needs Replacement</span>
                        </span>
                      )}
                      {analysis.titleLaboratory.existingTitleEvaluation.verdict === 'viable_with_revisions' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Viable with Revisions</span>
                        </span>
                      )}
                      {analysis.titleLaboratory.existingTitleEvaluation.verdict === 'strong_starting_point' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Strong Starting Point</span>
                        </span>
                      )}
                      {showDiagnosticEvaluation ? (
                        <ChevronUp className="w-4 h-4 text-stone-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-stone-500" />
                      )}
                    </div>
                  </button>

                  {showDiagnosticEvaluation && (
                    <div className="p-4 space-y-3 text-xs">
                      <p className="text-stone-700 leading-relaxed">
                        <strong className="text-stone-900">Critical Critique: </strong>
                        {analysis.titleLaboratory.existingTitleEvaluation.critique}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/80">
                          <span className="font-bold text-emerald-950 block mb-1">What Works:</span>
                          <ul className="list-disc pl-4 space-y-1 text-emerald-900">
                            {analysis.titleLaboratory.existingTitleEvaluation.strengths?.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80">
                          <span className="font-bold text-amber-950 block mb-1">Weaknesses / Gifting Risks:</span>
                          <ul className="list-disc pl-4 space-y-1 text-amber-900">
                            {analysis.titleLaboratory.existingTitleEvaluation.weaknesses?.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {analysis.titleLaboratory.existingTitleEvaluation.recommendationNotes && (
                        <p className="text-[11px] text-stone-600 italic bg-[#FAF8F5] p-2.5 rounded border border-stone-200">
                          <strong>Actionable Recommendation: </strong>{' '}
                          {analysis.titleLaboratory.existingTitleEvaluation.recommendationNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* Title Strategy Filters, Search & View Switcher */}
            <div className="p-4 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search titles, concepts, audience..."
                    value={titleSearchQuery}
                    onChange={(e) => setTitleSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-[#1B3D5F]"
                  />
                  {titleSearchQuery && (
                    <button
                      onClick={() => setTitleSearchQuery('')}
                      className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* View Switcher: Cards vs Table */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-stone-200 self-start sm:self-auto shrink-0">
                  <button
                    onClick={() => setTitleViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      titleViewMode === 'cards'
                        ? 'bg-[#1B3D5F] text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Editorial Cards ({filteredTitleOptions.length})</span>
                  </button>

                  <button
                    onClick={() => setTitleViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      titleViewMode === 'table'
                        ? 'bg-[#1B3D5F] text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Comparison Matrix</span>
                  </button>
                </div>
              </div>

              {/* Strategy Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3 text-stone-500" />
                  <span>Strategy:</span>
                </span>

                <button
                  onClick={() => setSelectedStrategyFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    selectedStrategyFilter === 'all'
                      ? 'bg-[#1B3D5F] text-white font-semibold shadow-2xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  All ({combinedTitleOptions.length})
                </button>

                {[
                  { id: 'design_specific', label: 'Design-Specific' },
                  { id: 'recipient_oriented', label: 'Recipient-Oriented' },
                  { id: 'intellectual_appeal', label: 'Intellectual' },
                  { id: 'witty_irreverent', label: 'Witty / Irreverent' },
                  { id: 'practical_gift_appeal', label: 'Practical Gift' },
                  { id: 'concise_editorial', label: 'Concise Editorial' },
                  { id: 'specificity_led', label: 'Specificity-Led' },
                  { id: 'historical_cultural_reference', label: 'Historical/Cultural' }
                ].map((strat) => {
                  const count = combinedTitleOptions.filter((o) => o.strategicApproach === strat.id).length;
                  if (count === 0 && selectedStrategyFilter !== strat.id) return null;
                  return (
                    <button
                      key={strat.id}
                      onClick={() => setSelectedStrategyFilter(strat.id)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                        selectedStrategyFilter === strat.id
                          ? 'bg-[#1B3D5F] text-white font-semibold shadow-2xs'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>{strat.label}</span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded-full ${
                          selectedStrategyFilter === strat.id
                            ? 'bg-white/20 text-white'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RESULTS VIEW: CARDS MODE (Default) */}
            {titleViewMode === 'cards' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-serif font-bold text-stone-900 text-sm">
                    Candidate Titles ({filteredTitleOptions.length} of {combinedTitleOptions.length})
                  </h5>
                  <span className="text-[11px] text-stone-500">
                    Click &ldquo;Set as Working Title&rdquo; on any candidate to assign it to the workspace product
                  </span>
                </div>

                {filteredTitleOptions.length === 0 ? (
                  <div className="p-8 bg-stone-50 border border-stone-200 rounded-xl text-center text-xs text-stone-500 space-y-2">
                    <p>No title candidates match your active filter.</p>
                    <button
                      onClick={() => {
                        setSelectedStrategyFilter('all');
                        setTitleSearchQuery('');
                      }}
                      className="text-[#1B3D5F] font-semibold hover:underline text-xs"
                    >
                      Clear search and show all candidates
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTitleOptions.map((opt, i) => {
                      const strategyInfo =
                        STRATEGY_CONFIG[opt.strategicApproach] || STRATEGY_CONFIG.design_specific;
                      const StrategyIcon = strategyInfo.icon;
                      const contextLabel =
                        BEST_USE_CONTEXT_LABELS[opt.bestUseContext || 'editorial_guide_heading'] ||
                        opt.bestUseContext?.replace(/_/g, ' ');
                      const isApplied =
                        appliedTitle === opt.proposedTitle ||
                        product?.details?.workingName === opt.proposedTitle;
                      const isWinner =
                        analysis.titleLaboratory?.recommendedTitle === opt.proposedTitle;

                      return (
                        <div
                          key={i}
                          className={`p-5 rounded-2xl border transition-all ${
                            isApplied
                              ? 'bg-blue-50/30 border-[#28537D] ring-2 ring-[#99BFF9]/50 shadow-sm'
                              : isWinner
                              ? 'bg-[#FAFDFB] border-[#99BFF9] shadow-xs hover:border-[#28537D]/60'
                              : 'bg-white border-[#E8E4DC] shadow-2xs hover:shadow-xs hover:border-[#99BFF9]/70'
                          }`}
                        >
                          {/* Card Top: Strategy badge, context label, fit score, and applied tag */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${strategyInfo.badgeBg} ${strategyInfo.textCol} ${strategyInfo.borderCol}`}
                              >
                                <StrategyIcon className="w-3.5 h-3.5" />
                                <span>{strategyInfo.label}</span>
                              </span>

                              {contextLabel && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#99BFF9]/15 text-[#1B3D5F] border border-[#99BFF9]/30">
                                  <span>{contextLabel}</span>
                                </span>
                              )}

                              {opt.fitScore && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-[#C3F3DF]/60 text-[#064E3B] border border-[#A7E8CD]">
                                  {opt.fitScore}/10 Fit
                                </span>
                              )}

                              {isWinner && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                  <Award className="w-3 h-3 text-amber-600" />
                                  <span>Top Pick</span>
                                </span>
                              )}
                            </div>

                            {isApplied && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C3F3DF] text-[#1B3D5F] border border-[#A7E8CD]">
                                <Check className="w-3.5 h-3.5 text-[#1B3D5F]" />
                                <span>Current Working Title</span>
                              </span>
                            )}
                          </div>

                          {/* Candidate Title: Prominent, readable typography with natural space line wrapping */}
                          <div className="py-2">
                            <h4 className="font-serif text-lg sm:text-xl font-bold text-stone-900 leading-snug tracking-tight break-normal whitespace-normal">
                              &ldquo;{opt.proposedTitle}&rdquo;
                            </h4>
                          </div>

                          {/* Why It Works / Concept Reasoning */}
                          {opt.conceptExplanation && (
                            <div className="p-3 bg-[#FAF8F5] border-l-3 border-[#28537D] rounded-r-lg text-xs text-stone-700 leading-relaxed">
                              <strong className="text-stone-900 block mb-0.5">Why It Works:</strong>
                              <span>{opt.conceptExplanation}</span>
                            </div>
                          )}

                          {/* Target Audience & Search Intent Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                            <div className="p-2.5 bg-stone-50/80 rounded-lg border border-stone-200/60">
                              <span className="font-semibold text-stone-800 block mb-0.5">
                                Target Audience Nuance:
                              </span>
                              <p className="text-stone-600 leading-relaxed">{opt.intendedAudience}</p>
                            </div>
                            <div className="p-2.5 bg-stone-50/80 rounded-lg border border-stone-200/60">
                              <span className="font-semibold text-stone-800 block mb-0.5">
                                Search Intent & Discovery:
                              </span>
                              <p className="text-stone-600 leading-relaxed">
                                {opt.searchIntentConsiderations || 'Natural discovery heading'}
                              </p>
                            </div>
                          </div>

                          {/* Advantages & Trade-Offs (Strengths vs Weaknesses) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-3 bg-[#C3F3DF]/25 border border-[#C3F3DF] rounded-lg">
                              <span className="font-bold text-[#064E3B] flex items-center gap-1.5 mb-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#064E3B]" />
                                <span>Advantages (Strengths)</span>
                              </span>
                              <p className="text-stone-700 leading-relaxed">{opt.strengths}</p>
                            </div>
                            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg">
                              <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                <span>Trade-offs & Gifting Risks</span>
                              </span>
                              <p className="text-stone-700 leading-relaxed">{opt.weaknesses}</p>
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApplyTitle(opt.proposedTitle)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
                                  isApplied
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-[#1B3D5F] hover:bg-[#28537D] text-white active:scale-98'
                                }`}
                                title="Set as the working title in Product Workspace"
                              >
                                {isApplied ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>{isApplied ? 'Applied as Working Title' : 'Set as Working Title'}</span>
                              </button>

                              <button
                                onClick={() => handleCopySingleTitle(opt.proposedTitle, i)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 rounded-lg transition-colors"
                                title="Copy title to clipboard"
                              >
                                {copiedTitleIndex === i ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>{copiedTitleIndex === i ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>

                            <span className="text-[11px] text-stone-400 font-mono">
                              Candidate #{i + 1}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* RESULTS VIEW: COMPARISON MATRIX (Secondary View) */}
            {titleViewMode === 'table' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h5 className="font-serif font-bold text-stone-900 text-sm">
                      Head-to-Head Candidate Comparison Matrix
                    </h5>
                    <p className="text-xs text-stone-500">
                      Side-by-side view with guaranteed column widths and horizontal scrolling.
                    </p>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    Scroll horizontally if viewing on a compact screen
                  </span>
                </div>

                <div className="overflow-x-auto border border-[#E8E4DC] rounded-xl bg-white shadow-xs max-w-full">
                  <table className="min-w-[880px] w-full text-left text-xs divide-y divide-stone-200">
                    <thead className="bg-[#FAF8F5] text-stone-700 font-semibold">
                      <tr>
                        <th className="py-3 px-4 w-[320px] min-w-[280px]">Title Candidate</th>
                        <th className="py-3 px-3.5 w-[180px] min-w-[160px]">Strategy & Context</th>
                        <th className="py-3 px-3.5 w-[200px] min-w-[180px]">Target Audience</th>
                        <th className="py-3 px-3.5 w-[280px] min-w-[240px]">Advantages & Trade-offs</th>
                        <th className="py-3 pr-4 pl-2 w-[110px] min-w-[100px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredTitleOptions.map((opt, i) => {
                        const strategyInfo =
                          STRATEGY_CONFIG[opt.strategicApproach] || STRATEGY_CONFIG.design_specific;
                        const StrategyIcon = strategyInfo.icon;
                        const isApplied =
                          appliedTitle === opt.proposedTitle ||
                          product?.details?.workingName === opt.proposedTitle;
                        const isWinner =
                          analysis.titleLaboratory?.recommendedTitle === opt.proposedTitle;

                        return (
                          <tr
                            key={i}
                            className={`transition-colors ${
                              isApplied
                                ? 'bg-blue-50/40'
                                : isWinner
                                ? 'bg-[#FAFDFB]'
                                : 'hover:bg-stone-50/60'
                            }`}
                          >
                            {/* Title Candidate: Wide column, natural line wrapping, no stacked single words */}
                            <td className="py-3.5 px-4 align-top">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {isWinner && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-900 rounded border border-amber-200">
                                      Winner
                                    </span>
                                  )}
                                  {isApplied && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#C3F3DF] text-[#1B3D5F] rounded border border-[#A7E8CD]">
                                      Applied
                                    </span>
                                  )}
                                  {opt.fitScore && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-stone-100 text-stone-700 rounded">
                                      {opt.fitScore}/10
                                    </span>
                                  )}
                                </div>

                                <p className="font-serif font-bold text-sm text-stone-900 leading-snug break-normal whitespace-normal">
                                  &ldquo;{opt.proposedTitle}&rdquo;
                                </p>

                                {opt.conceptExplanation && (
                                  <p className="text-[11px] text-stone-500 leading-relaxed italic line-clamp-2">
                                    {opt.conceptExplanation}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Strategy & Context */}
                            <td className="py-3.5 px-3.5 align-top">
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${strategyInfo.badgeBg} ${strategyInfo.textCol} ${strategyInfo.borderCol}`}
                                >
                                  <StrategyIcon className="w-3 h-3" />
                                  <span>{strategyInfo.label}</span>
                                </span>
                                <p className="text-[11px] text-stone-500 font-mono">
                                  {BEST_USE_CONTEXT_LABELS[opt.bestUseContext || 'editorial_guide_heading'] ||
                                    opt.bestUseContext?.replace(/_/g, ' ')}
                                </p>
                              </div>
                            </td>

                            {/* Target Audience */}
                            <td className="py-3.5 px-3.5 align-top">
                              <p className="text-stone-700 text-xs leading-relaxed">
                                {opt.intendedAudience}
                              </p>
                            </td>

                            {/* Advantages & Trade-offs */}
                            <td className="py-3.5 px-3.5 align-top">
                              <div className="space-y-1.5 text-[11px]">
                                <div className="text-[#064E3B] leading-relaxed">
                                  <strong className="text-[#064E3B]">Strengths: </strong>
                                  {opt.strengths}
                                </div>
                                <div className="text-amber-900 leading-relaxed">
                                  <strong className="text-amber-950">Trade-offs: </strong>
                                  {opt.weaknesses}
                                </div>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 pr-4 pl-2 align-top text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <button
                                  onClick={() => handleApplyTitle(opt.proposedTitle)}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                    isApplied
                                      ? 'bg-emerald-700 text-white'
                                      : 'text-[#1B3D5F] bg-[#99BFF9]/20 hover:bg-[#99BFF9]/40 border border-[#99BFF9]/60'
                                  }`}
                                >
                                  {isApplied ? 'Applied' : 'Set Working'}
                                </button>
                                <button
                                  onClick={() => handleCopySingleTitle(opt.proposedTitle, i)}
                                  className="p-1 text-stone-500 hover:text-stone-800 rounded hover:bg-stone-100"
                                  title="Copy title"
                                >
                                  {copiedTitleIndex === i ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Guide Context & Disclaimer Footer */}
            <div className="p-3.5 bg-[#FAF8F5] border border-stone-200 rounded-xl text-xs text-stone-600 space-y-1">
              <span className="font-bold text-stone-800 block">Editorial Guide Positioning:</span>
              <p>
                {analysis.titleLaboratory.guidePositioningContext ||
                  analysis.titleLaboratory.intendedTitleContext ||
                  'Calibrated for Science of Gifts editorial headings and standalone product presentation.'}
              </p>
              {analysis.titleLaboratory.searchIntentDisclaimer && (
                <p className="text-[11px] text-stone-500 italic pt-1">
                  * {analysis.titleLaboratory.searchIntentDisclaimer}
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB: MODULE F - COMPETITIVE DIFFERENTIATION */}
        {activeTab === 'moduleF' && analysis.competitiveDifferentiation && (
          <div className="space-y-5">
            <div>
              <h4 className="font-serif text-lg font-bold text-stone-900">
                Module F: Competitive Differentiation — Phase 1 Limitations
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Internal strategic reasoning about non-interchangeability. Preliminary positioning, not live competitor scraping.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-lg text-xs text-amber-900">
              <span className="font-bold">Phase 1 Boundary: </span>
              {analysis.competitiveDifferentiation.preliminaryAnalysisDisclaimer || 'This analysis reflects internal positioning hypotheses. Verified live search rankings and competitor catalogue scraping will be introduced in Phase 3.'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                <span className="font-semibold text-stone-900 block mb-2">
                  What Makes this Non-Interchangeable with Generic Alternatives:
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-stone-600">
                  {analysis.competitiveDifferentiation.nonInterchangeabilityFactors?.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg">
                <span className="font-semibold text-stone-900 block mb-2">
                  Hypothesized Differentiators to Verify:
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-stone-600">
                  {analysis.competitiveDifferentiation.hypothesizedDifferentiators?.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E8E4DC] rounded-lg text-xs">
              <span className="font-semibold text-stone-900 block mb-2">
                Recommended Live Research for Future Phases:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-stone-600">
                {analysis.competitiveDifferentiation.phase3ResearchRecommendations?.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
