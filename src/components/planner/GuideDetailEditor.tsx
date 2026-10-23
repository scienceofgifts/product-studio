/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  GuidePlanRecord,
  GuideLineupItem,
  GuideAnalysisResult,
  GuideOutline,
  GuideOutlineSection
} from '../../types/planner';
import { ProductRecord, GiftGuide, ContextProfile } from '../../types';
import { WritingGuidelinesSettings, ApprovedWritingExample } from '../../types/writingGuidelines';
import { analyzeGuideCollection, generateGuideOutline, generateChatGPTGuidePrompt } from '../../services/guidePlannerService';
import {
  ArrowLeft,
  Save,
  Layers,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Search,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface GuideDetailEditorProps {
  plan: GuidePlanRecord;
  catalogueProducts: ProductRecord[];
  giftGuides: GiftGuide[];
  contextProfiles: ContextProfile[];
  editorialRules?: string;
  writingGuidelines?: WritingGuidelinesSettings;
  writingExamples?: ApprovedWritingExample[];
  onSavePlan: (updatedPlan: GuidePlanRecord) => Promise<void>;
  onBack: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

type EditorTab = 'brief' | 'lineup' | 'analysis' | 'outline' | 'prompt';

export const GuideDetailEditor: React.FC<GuideDetailEditorProps> = ({
  plan,
  catalogueProducts,
  giftGuides,
  contextProfiles,
  editorialRules,
  writingGuidelines,
  writingExamples,
  onSavePlan,
  onBack,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('brief');
  const [currentPlan, setCurrentPlan] = useState<GuidePlanRecord>({ ...plan });
  const [isSaving, setIsSaving] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Catalogue selection modal state
  const [isCatalogueModalOpen, setIsCatalogueModalOpen] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [selectedCatalogueIds, setSelectedCatalogueIds] = useState<string[]>([]);

  // Guide-only product modal state
  const [isGuideOnlyModalOpen, setIsGuideOnlyModalOpen] = useState(false);
  const [guideOnlyTitle, setGuideOnlyTitle] = useState('');
  const [guideOnlyFormat, setGuideOnlyFormat] = useState<'mug' | 't-shirt' | 'hoodie' | 'notebook' | 'poster' | 'other'>('mug');
  const [guideOnlyRecipient, setGuideOnlyRecipient] = useState('');
  const [guideOnlyDesc, setGuideOnlyDesc] = useState('');

  const handleSave = async (updated = currentPlan) => {
    setIsSaving(true);
    try {
      await onSavePlan(updated);
      showToast('Guide plan saved successfully');
    } catch (err) {
      showToast('Failed to save guide plan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBriefChange = (field: keyof GuidePlanRecord['brief'], value: any) => {
    const updated = {
      ...currentPlan,
      brief: { ...currentPlan.brief, [field]: value },
      updatedAt: new Date().toISOString()
    };
    if (field === 'workingTitle' || field === 'topicOrNiche') {
      updated.title = updated.brief.workingTitle || updated.brief.topicOrNiche || currentPlan.title;
    }
    setCurrentPlan(updated);
  };

  const handleApplyContextProfile = (profileId: string) => {
    const profile = contextProfiles.find((p) => p.id === profileId);
    if (!profile) return;
    const updated = {
      ...currentPlan,
      brief: {
        ...currentPlan.brief,
        contextProfileId: profileId,
        targetBuyer: profile.context.audienceInterest || currentPlan.brief.targetBuyer,
        intendedRecipients: profile.context.primaryRecipient ? [profile.context.primaryRecipient, profile.context.secondaryRecipient].filter(Boolean) : currentPlan.brief.intendedRecipients,
        preferredTone: profile.context.initialPositioningIdea || currentPlan.brief.preferredTone
      },
      updatedAt: new Date().toISOString()
    };
    setCurrentPlan(updated);
    showToast(`Applied context profile: "${profile.name}"`);
  };

  const handleAddSelectedProducts = () => {
    if (selectedCatalogueIds.length === 0) return;
    const existingProductIds = new Set(currentPlan.lineup.map((item) => item.productId));
    const newItems: GuideLineupItem[] = [];
    let maxOrder = currentPlan.lineup.length > 0 ? Math.max(...currentPlan.lineup.map(i => i.sortOrder)) : 0;

    selectedCatalogueIds.forEach((id) => {
      if (existingProductIds.has(id)) return; // prevent accidental duplicates
      maxOrder++;
      const prod = catalogueProducts.find((p) => p.id === id);
      newItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: id,
        editorialRole: prod?.details.initialPositioningIdea || 'Primary curation choice',
        differentiationNotes: 'Distinct angle relative to neighboring lineup items',
        sortOrder: maxOrder
      });
    });

    const updated = {
      ...currentPlan,
      lineup: [...currentPlan.lineup, ...newItems],
      updatedAt: new Date().toISOString()
    };
    setCurrentPlan(updated);
    setIsCatalogueModalOpen(false);
    setSelectedCatalogueIds([]);
    showToast(`Added ${newItems.length} products to lineup`);
    handleSave(updated);
  };

  const handleAddGuideOnlyProduct = () => {
    if (!guideOnlyTitle.trim()) {
      showToast('Please enter a product title', 'error');
      return;
    }
    const maxOrder = currentPlan.lineup.length > 0 ? Math.max(...currentPlan.lineup.map(i => i.sortOrder)) + 1 : 1;
    const newItem: GuideLineupItem = {
      id: `item-${Date.now()}`,
      productId: `guide-only-${Date.now()}`,
      customTitle: guideOnlyTitle,
      customFormat: guideOnlyFormat,
      customRecipient: guideOnlyRecipient,
      customDescription: guideOnlyDesc,
      editorialRole: 'Unanalyzed guide-only product entry',
      differentiationNotes: 'Pending catalogue addition',
      sortOrder: maxOrder,
      isGuideOnly: true
    };

    const updated = {
      ...currentPlan,
      lineup: [...currentPlan.lineup, newItem],
      updatedAt: new Date().toISOString()
    };
    setCurrentPlan(updated);
    setIsGuideOnlyModalOpen(false);
    setGuideOnlyTitle('');
    setGuideOnlyRecipient('');
    setGuideOnlyDesc('');
    showToast('Added guide-only product entry');
    handleSave(updated);
  };

  const handleRemoveLineupItem = (itemId: string) => {
    const updated = {
      ...currentPlan,
      lineup: currentPlan.lineup.filter((i) => i.id !== itemId),
      updatedAt: new Date().toISOString()
    };
    setCurrentPlan(updated);
    handleSave(updated);
  };

  const handleMoveLineupItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...currentPlan.lineup];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Reassign sort orders
    newItems.forEach((item, idx) => {
      item.sortOrder = idx + 1;
    });

    const updated = {
      ...currentPlan,
      lineup: newItems,
      updatedAt: new Date().toISOString()
    };
    setCurrentPlan(updated);
    handleSave(updated);
  };

  const handleUpdateLineupItem = (itemId: string, field: keyof GuideLineupItem, value: any) => {
    const updatedLineup = currentPlan.lineup.map((item) => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    const updated = {
      ...currentPlan,
      lineup: updatedLineup,
      updatedAt: new Date().toISOString()
    };
    setCurrentPlan(updated);
  };

  const handleRunAnalysis = () => {
    const res = analyzeGuideCollection(currentPlan, catalogueProducts, giftGuides);
    const updated = {
      ...currentPlan,
      analysisResult: res,
      updatedAt: new Date().toISOString()
    };
    setCurrentPlan(updated);
    setActiveTab('analysis');
    showToast('Whole-guide editorial analysis completed');
    handleSave(updated);
  };

  const handleGenerateOutline = () => {
    const outline = generateGuideOutline(currentPlan, catalogueProducts);
    const updated = {
      ...currentPlan,
      outline,
      updatedAt: new Date().toISOString()
    };
    setCurrentPlan(updated);
    setActiveTab('outline');
    showToast('Initial guide outline generated');
    handleSave(updated);
  };

  const handleGeneratePrompt = () => {
    const promptRecord = generateChatGPTGuidePrompt(currentPlan, catalogueProducts, editorialRules, writingGuidelines, writingExamples);
    const updated = {
      ...currentPlan,
      generatedPrompt: promptRecord,
      updatedAt: new Date().toISOString()
    };
    setCurrentPlan(updated);
    setActiveTab('prompt');
    showToast('Master ChatGPT prompt generated with editorial rules');
    handleSave(updated);
  };

  const handleCopyPrompt = () => {
    if (!currentPlan.generatedPrompt) return;
    navigator.clipboard.writeText(currentPlan.generatedPrompt.promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
    showToast('ChatGPT prompt copied to clipboard');
  };

  const productMap = new Map<string, ProductRecord>();
  catalogueProducts.forEach((p) => productMap.set(p.id, p));

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
            title="Back to Guides List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A8A]">
              <span>Guide Planner</span>
              <span>•</span>
              <span>{currentPlan.brief.topicOrNiche || 'Niche'}</span>
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              {currentPlan.title || 'Untitled Guide Plan'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-100 text-stone-800 font-semibold text-xs hover:bg-stone-200 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-stone-600" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Workflow Tabs */}
      <div className="flex border-b border-[#E8E4DC] bg-white rounded-t-xl px-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('brief')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'brief'
              ? 'border-[#1E3A8A] text-[#1E3A8A]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Guide Brief</span>
        </button>

        <button
          onClick={() => setActiveTab('lineup')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'lineup'
              ? 'border-[#1E3A8A] text-[#1E3A8A]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Product Lineup ({currentPlan.lineup.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'analysis'
              ? 'border-[#1E3A8A] text-[#1E3A8A]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>3. Collection Analysis</span>
          {currentPlan.analysisResult && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('outline')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'outline'
              ? 'border-[#1E3A8A] text-[#1E3A8A]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>4. Outline & Structure</span>
          {currentPlan.outline && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('prompt')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'prompt'
              ? 'border-[#1E3A8A] text-[#1E3A8A]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>5. ChatGPT Prompt</span>
          {currentPlan.generatedPrompt && (
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>
      </div>

      {/* TAB 1: GUIDE BRIEF */}
      {activeTab === 'brief' && (
        <div className="bg-white border border-[#E8E4DC] rounded-b-xl rounded-tr-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">Editorial Brief & Strategy</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Define the editorial scope, buyer persona, topic, and positioning angles.
              </p>
            </div>
            {contextProfiles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-600">Prefill from Profile:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleApplyContextProfile(e.target.value);
                  }}
                  defaultValue=""
                  className="px-3 py-1.5 bg-[#FBF9F5] border border-[#E8E4DC] rounded-lg text-xs font-semibold text-stone-800 focus:outline-none"
                >
                  <option value="" disabled>Select profile...</option>
                  {contextProfiles.map((cp) => (
                    <option key={cp.id} value={cp.id}>{cp.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Working Title
              </label>
              <input
                type="text"
                value={currentPlan.brief.workingTitle}
                onChange={(e) => handleBriefChange('workingTitle', e.target.value)}
                placeholder="e.g. The Definitive Viking History Gift Guide"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-sm text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Topic or Niche
              </label>
              <input
                type="text"
                value={currentPlan.brief.topicOrNiche}
                onChange={(e) => handleBriefChange('topicOrNiche', e.target.value)}
                placeholder="e.g. Viking History & Norse Culture"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-sm text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Target Buyer (Who is searching?)
              </label>
              <input
                type="text"
                value={currentPlan.brief.targetBuyer}
                onChange={(e) => handleBriefChange('targetBuyer', e.target.value)}
                placeholder="e.g. Thoughtful gift buyers seeking authentic medieval history gifts"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-sm text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Intended Recipients (Comma separated)
              </label>
              <input
                type="text"
                value={(currentPlan.brief.intendedRecipients || []).join(', ')}
                onChange={(e) =>
                  handleBriefChange(
                    'intendedRecipients',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="e.g. Medievalists, History Buffs, Archaeology Students"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-sm text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Primary Reader Problem / Buying Question
              </label>
              <textarea
                rows={2}
                value={currentPlan.brief.primaryReaderProblem}
                onChange={(e) => handleBriefChange('primaryReaderProblem', e.target.value)}
                placeholder="What specific friction or question is the buyer trying to solve?"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-sm text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Guide Purpose & Search Intent
              </label>
              <textarea
                rows={2}
                value={currentPlan.brief.guidePurpose}
                onChange={(e) => handleBriefChange('guidePurpose', e.target.value)}
                placeholder="What makes this guide exceptionally useful and distinct?"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-sm text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Editorial Angle & Differentiation
              </label>
              <input
                type="text"
                value={currentPlan.brief.editorialAngle}
                onChange={(e) => handleBriefChange('editorialAngle', e.target.value)}
                placeholder="e.g. Rejecting cartoon horned helmets in favor of primary source material"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-sm text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Preferred Tone & Style
              </label>
              <input
                type="text"
                value={currentPlan.brief.preferredTone}
                onChange={(e) => handleBriefChange('preferredTone', e.target.value)}
                placeholder="e.g. Scholarly yet accessible, respectful, discerning"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-sm text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => {
                handleSave();
                setActiveTab('lineup');
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#1E3A8A] text-white font-semibold text-sm shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
            >
              <span>Save Brief & Proceed to Lineup</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT LINEUP BUILDER */}
      {activeTab === 'lineup' && (
        <div className="bg-white border border-[#E8E4DC] rounded-b-xl rounded-tr-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">Product Lineup Builder</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Curate products from your catalogue, arrange the sequence, and define each item's editorial role.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsGuideOnlyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 text-stone-800 font-semibold text-xs hover:bg-stone-200 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Guide-Only Entry</span>
              </button>
              <button
                onClick={() => setIsCatalogueModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white font-semibold text-xs shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add from Catalogue</span>
              </button>
            </div>
          </div>

          {currentPlan.lineup.length === 0 ? (
            <div className="bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl p-10 text-center">
              <Layers className="w-10 h-10 text-stone-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-stone-800">Your lineup is currently empty</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Add products from your persistent catalogue or create temporary guide-only entries to start building this gift guide.
              </p>
              <button
                onClick={() => setIsCatalogueModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg hover:bg-[#1e3a8aec] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Browse Catalogue</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {currentPlan.lineup.map((item, idx) => {
                const prod = productMap.get(item.productId);
                const title = prod?.details.workingName || item.customTitle || 'Unnamed Product';
                const format = prod?.details.productType || item.customFormat || 'Product';
                const recipient = prod?.details.primaryRecipient || item.customRecipient || 'General';
                const hasMissingData = prod && (!prod.details.currentDescription && !prod.details.productSpecs);

                return (
                  <div
                    key={item.id}
                    className="bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center justify-center bg-white border border-[#E8E4DC] rounded-lg px-3 py-2 text-stone-700 font-mono text-xs font-bold shrink-0">
                        <span>#{idx + 1}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-base font-bold text-stone-900">{title}</h3>
                          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                            {format}
                          </span>
                          {item.isGuideOnly && (
                            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              Guide-Only
                            </span>
                          )}
                          {hasMissingData && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Catalogue record missing description/specs">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Incomplete Data</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600">
                          <span className="font-medium text-stone-700">Target:</span> {recipient}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                              Editorial Role in Guide
                            </label>
                            <input
                              type="text"
                              value={item.editorialRole}
                              onChange={(e) => handleUpdateLineupItem(item.id, 'editorialRole', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-[#E8E4DC] rounded text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                              placeholder="e.g. Scholarly anchor piece"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                              Differentiation Notes
                            </label>
                            <input
                              type="text"
                              value={item.differentiationNotes}
                              onChange={(e) => handleUpdateLineupItem(item.id, 'differentiationNotes', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-[#E8E4DC] rounded text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                              placeholder="e.g. Differs from mug via primary source excerpt"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveLineupItem(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white border border-[#E8E4DC] text-stone-600 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveLineupItem(idx, 'down')}
                          disabled={idx === currentPlan.lineup.length - 1}
                          className="p-1 rounded bg-white border border-[#E8E4DC] text-stone-600 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveLineupItem(item.id)}
                        className="p-2 rounded bg-white border border-[#E8E4DC] text-stone-400 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                        title="Remove from Lineup"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 flex items-center justify-between">
            <button
              onClick={handleRunAnalysis}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs shadow-sm hover:bg-emerald-800 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Run Collection Editorial Analysis</span>
            </button>

            <button
              onClick={() => {
                handleSave();
                setActiveTab('analysis');
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#1E3A8A] text-white font-semibold text-sm shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
            >
              <span>Proceed to Analysis</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: COLLECTION EDITORIAL ANALYSIS */}
      {activeTab === 'analysis' && (
        <div className="bg-white border border-[#E8E4DC] rounded-b-xl rounded-tr-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">Whole-Guide Editorial Analysis</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Collection-level evaluation of conceptual redundancy, recipient coverage, format diversity, and actionable recommendations.
              </p>
            </div>
            <button
              onClick={handleRunAnalysis}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white font-semibold text-xs shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Run Analysis</span>
            </button>
          </div>

          {!currentPlan.analysisResult ? (
            <div className="bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl p-10 text-center">
              <ShieldCheck className="w-10 h-10 text-stone-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-stone-800">No analysis run yet</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Run collection editorial analysis to inspect redundancy, recipient coverage, and ensure high editorial quality.
              </p>
              <button
                onClick={handleRunAnalysis}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg hover:bg-[#1e3a8aec] transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Run Analysis Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Actionable Recommendations */}
              <div className="space-y-3">
                <h3 className="font-serif text-sm font-bold text-stone-900">Actionable Recommendations</h3>
                {currentPlan.analysisResult.actionableRecommendations.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No major editorial warnings or blockers found. Lineup looks clean and coherent!</span>
                  </div>
                ) : (
                  currentPlan.analysisResult.actionableRecommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
                        rec.severity === 'blocker'
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : rec.severity === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-semibold block">{rec.issue}</span>
                        <p className="text-stone-700">{rec.suggestedAction}</p>
                        <p className="text-[11px] text-stone-500 italic">Importance: {rec.readerImportance}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Redundancy Findings */}
              <div className="space-y-3">
                <h3 className="font-serif text-sm font-bold text-stone-900">Conceptual Redundancy Checks</h3>
                {currentPlan.analysisResult.redundancyFindings.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">No conceptual redundancies identified between lineup items.</p>
                ) : (
                  currentPlan.analysisResult.redundancyFindings.map((rf, i) => (
                    <div key={i} className="p-4 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs space-y-1">
                      <span className="font-semibold text-stone-900 block">{rf.issue}</span>
                      <p className="text-stone-600">Evidence: {rf.evidence}</p>
                      <p className="text-[#1E3A8A] font-medium">Recommendation: {rf.recommendation}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Format & Recipient Coverage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-stone-50 border border-[#E8E4DC] rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-stone-700">Format Diversity</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentPlan.analysisResult.formatDiversity.map((fd, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-[#E8E4DC] rounded-md text-xs text-stone-800 font-medium">
                        {fd.format}: <span className="font-bold text-[#1E3A8A]">{fd.count}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-stone-50 border border-[#E8E4DC] rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-stone-700">Recipient Subgroup Coverage</h4>
                  <div className="space-y-2">
                    {currentPlan.analysisResult.recipientCoverage.map((rc, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-stone-200">
                        <span className="font-medium text-stone-800">{rc.subgroup}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${rc.covered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {rc.covered ? 'Covered' : 'Check Fit'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => {
                if (!currentPlan.outline) {
                  handleGenerateOutline();
                } else {
                  setActiveTab('outline');
                }
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#1E3A8A] text-white font-semibold text-sm shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
            >
              <span>Proceed to Outline Builder</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: OUTLINE & STRUCTURE */}
      {activeTab === 'outline' && (
        <div className="bg-white border border-[#E8E4DC] rounded-b-xl rounded-tr-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">Guide Outline Builder</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Structured, editable outline following the Science of Gifts format. Edit sections and lock approved content.
              </p>
            </div>
            {!currentPlan.outline ? (
              <button
                onClick={handleGenerateOutline}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white font-semibold text-xs shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Initial Outline</span>
              </button>
            ) : (
              <button
                onClick={handleGenerateOutline}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-800 font-semibold text-xs hover:bg-stone-200 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate Outline</span>
              </button>
            )}
          </div>

          {!currentPlan.outline ? (
            <div className="bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl p-10 text-center">
              <Sparkles className="w-10 h-10 text-stone-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-stone-800">No outline generated yet</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Generate a structured article outline based on your approved lineup and brief.
              </p>
              <button
                onClick={handleGenerateOutline}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg hover:bg-[#1e3a8aec] transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Outline</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {currentPlan.outline.sections.map((section, idx) => (
                <div key={section.id} className="bg-stone-50 border border-[#E8E4DC] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-stone-500">#{idx + 1}</span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => {
                          const updatedSections = currentPlan.outline!.sections.map((s) =>
                            s.id === section.id ? { ...s, title: e.target.value } : s
                          );
                          setCurrentPlan({
                            ...currentPlan,
                            outline: { ...currentPlan.outline!, sections: updatedSections, lastModified: new Date().toISOString() }
                          });
                        }}
                        className="font-serif text-base font-bold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-[#1E3A8A] focus:outline-none px-1 py-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const updatedSections = currentPlan.outline!.sections.map((s) =>
                            s.id === section.id ? { ...s, isApproved: !s.isApproved } : s
                          );
                          const updated = {
                            ...currentPlan,
                            outline: { ...currentPlan.outline!, sections: updatedSections }
                          };
                          setCurrentPlan(updated);
                          handleSave(updated);
                        }}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          section.isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        {section.isApproved ? '✓ Approved' : 'Mark Approved'}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={section.content}
                    onChange={(e) => {
                      const updatedSections = currentPlan.outline!.sections.map((s) =>
                        s.id === section.id ? { ...s, content: e.target.value } : s
                      );
                      setCurrentPlan({
                        ...currentPlan,
                        outline: { ...currentPlan.outline!, sections: updatedSections }
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4DC] rounded-lg text-xs font-mono text-stone-800 focus:outline-none focus:border-[#1E3A8A] leading-relaxed"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => {
                handleGeneratePrompt();
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#1E3A8A] text-white font-semibold text-sm shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
            >
              <span>Generate Master ChatGPT Prompt</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: CHATGPT PROMPT & EXPORT */}
      {activeTab === 'prompt' && (
        <div className="bg-white border border-[#E8E4DC] rounded-b-xl rounded-tr-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">Master ChatGPT Writing Session Prompt</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                The primary deliverable: one master prompt that initializes a guided, section-by-section writing session in ChatGPT.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGeneratePrompt}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 text-stone-800 font-semibold text-xs hover:bg-stone-200 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate Master Prompt</span>
              </button>
              {currentPlan.generatedPrompt && (
                <button
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#1E3A8A] text-white font-semibold text-xs shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPrompt ? 'Copied to Clipboard!' : 'Copy Master Prompt'}</span>
                </button>
              )}
            </div>
          </div>

          {!currentPlan.generatedPrompt ? (
            <div className="bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl p-10 text-center">
              <FileText className="w-10 h-10 text-stone-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-stone-800">No master prompt generated yet</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Generate your comprehensive master prompt to initialize an incremental writing session in ChatGPT.
              </p>
              <button
                onClick={handleGeneratePrompt}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg hover:bg-[#1e3a8aec] transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generate Master ChatGPT Prompt</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-stone-500 bg-stone-50 px-4 py-2.5 rounded-lg border border-stone-200">
                <span>Prompt Version {currentPlan.generatedPrompt.version} • Generated {new Date(currentPlan.generatedPrompt.timestamp).toLocaleString()}</span>
                <span className="font-medium text-stone-700">{currentPlan.generatedPrompt.promptText.length} characters</span>
              </div>

              <textarea
                readOnly
                rows={18}
                value={currentPlan.generatedPrompt.promptText}
                className="w-full px-4 py-3 bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl text-xs font-mono text-stone-800 focus:outline-none leading-relaxed select-all"
              />

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#1E3A8A] text-white font-semibold text-sm shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPrompt ? 'Copied Successfully!' : 'Copy Master ChatGPT Prompt'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CATALOGUE SELECTION MODAL */}
      {isCatalogueModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4DC] rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-bold text-stone-900">Add Products from Catalogue</h3>
              <button
                onClick={() => setIsCatalogueModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={catalogueSearch}
                onChange={(e) => setCatalogueSearch(e.target.value)}
                placeholder="Search catalogue by name, type, or recipient..."
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh] pr-1">
              {catalogueProducts
                .filter((p) =>
                  p.details.workingName.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
                  p.details.productType.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
                  p.details.primaryRecipient.toLowerCase().includes(catalogueSearch.toLowerCase())
                )
                .map((prod) => {
                  const isSelected = selectedCatalogueIds.includes(prod.id);
                  const isAlreadyInLineup = currentPlan.lineup.some((i) => i.productId === prod.id);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        if (isAlreadyInLineup) return;
                        setSelectedCatalogueIds((prev) =>
                          isSelected ? prev.filter((id) => id !== prod.id) : [...prev, prod.id]
                        );
                      }}
                      className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                        isAlreadyInLineup
                          ? 'bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-50/60 border-blue-300 cursor-pointer'
                          : 'bg-white border-[#E8E4DC] hover:border-stone-400 cursor-pointer'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-sm font-bold text-stone-900">{prod.details.workingName}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                            {prod.details.productType}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">Recipient: {prod.details.primaryRecipient || 'General'}</p>
                      </div>

                      {isAlreadyInLineup ? (
                        <span className="text-[11px] font-medium text-stone-400">Already in lineup</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-[#1E3A8A] focus:ring-[#1E3A8A]"
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Selected <span className="font-semibold text-stone-900">{selectedCatalogueIds.length}</span> products</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCatalogueModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelectedProducts}
                  disabled={selectedCatalogueIds.length === 0}
                  className="px-5 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-semibold hover:bg-[#1e3a8aec] disabled:opacity-50 cursor-pointer"
                >
                  Add to Lineup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GUIDE-ONLY PRODUCT MODAL */}
      {isGuideOnlyModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4DC] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-bold text-stone-900">Add Guide-Only Product Entry</h3>
              <button
                onClick={() => setIsGuideOnlyModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Product Title
                </label>
                <input
                  type="text"
                  value={guideOnlyTitle}
                  onChange={(e) => setGuideOnlyTitle(e.target.value)}
                  placeholder="e.g. Anglo-Saxon Chronicle Manuscript Mug"
                  className="w-full px-3 py-2 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Format / Type
                </label>
                <select
                  value={guideOnlyFormat}
                  onChange={(e) => setGuideOnlyFormat(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                >
                  <option value="mug">Mug</option>
                  <option value="t-shirt">T-Shirt</option>
                  <option value="hoodie">Hoodie</option>
                  <option value="notebook">Notebook</option>
                  <option value="poster">Poster</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Target Recipient
                </label>
                <input
                  type="text"
                  value={guideOnlyRecipient}
                  onChange={(e) => setGuideOnlyRecipient(e.target.value)}
                  placeholder="e.g. Serious Medievalist"
                  className="w-full px-3 py-2 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={guideOnlyDesc}
                  onChange={(e) => setGuideOnlyDesc(e.target.value)}
                  placeholder="Brief description of the product concept..."
                  className="w-full px-3 py-2 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsGuideOnlyModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGuideOnlyProduct}
                className="px-5 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-semibold hover:bg-[#1e3a8aec] cursor-pointer"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
