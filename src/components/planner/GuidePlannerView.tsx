/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GuidePlanRecord } from '../../types/planner';
import { GiftGuide, ProductRecord } from '../../types';
import {
  Plus,
  BookOpen,
  Layers,
  Sparkles,
  Trash2,
  Calendar,
  ArrowRight,
  FileText,
  Search,
  Check,
  Compass
} from 'lucide-react';
import { DeleteGuideConfirmModal } from '../modals/DeleteGuideConfirmModal';

interface GuidePlannerViewProps {
  guidePlans: GuidePlanRecord[];
  giftGuides: GiftGuide[];
  products: ProductRecord[];
  activeGiftGuideId?: string;
  onSelectPlan: (id: string) => void;
  onCreateNewPlan: () => void;
  onDeletePlan: (id: string) => void;
  onDeleteGiftGuide: (id: string) => Promise<void> | void;
  onOpenNewGuideModal: () => void;
  onSelectGiftGuideForWorkspace?: (guide: GiftGuide) => void;
}

export const GuidePlannerView: React.FC<GuidePlannerViewProps> = ({
  guidePlans,
  giftGuides,
  products,
  activeGiftGuideId,
  onSelectPlan,
  onCreateNewPlan,
  onDeletePlan,
  onDeleteGiftGuide,
  onOpenNewGuideModal,
  onSelectGiftGuideForWorkspace
}) => {
  const [plannerTab, setPlannerTab] = useState<'guides' | 'plans'>('guides');
  const [searchTerm, setSearchTerm] = useState('');
  const [guideToDelete, setGuideToDelete] = useState<GiftGuide | null>(null);
  const [isDeletingGuide, setIsDeletingGuide] = useState(false);

  const filteredPlans = guidePlans.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brief.topicOrNiche.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brief.targetBuyer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGuides = giftGuides.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.niche && g.niche.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (g.targetPersona && g.targetPersona.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleConfirmDeleteGuide = async () => {
    if (!guideToDelete) return;
    setIsDeletingGuide(true);
    try {
      await onDeleteGiftGuide(guideToDelete.id);
      setGuideToDelete(null);
    } finally {
      setIsDeletingGuide(false);
    }
  };

  const assignedCountForGuideToDelete = guideToDelete
    ? products.filter((p) => p.details?.giftGuideId === guideToDelete.id).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#1E3A8A] mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Phase 4 Editorial Engine</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Gift Guide Planner & Library
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Manage your editorial gift guide collection and plan complete guide editions. Curate lineups, evaluate collection-level angles, and generate authoritative ChatGPT writing prompts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenNewGuideModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-[#E8E4DC] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-stone-600" />
            <span>New Gift Guide</span>
          </button>
          <button
            onClick={onCreateNewPlan}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E3A8A] text-white font-semibold text-xs shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>New Guide Plan</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-3 border-b border-[#E8E4DC] pb-px">
        <button
          onClick={() => {
            setPlannerTab('guides');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            plannerTab === 'guides'
              ? 'border-[#1E3A8A] text-[#1E3A8A]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Editorial Gift Guides ({giftGuides.length})</span>
        </button>
        <button
          onClick={() => {
            setPlannerTab('plans');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            plannerTab === 'plans'
              ? 'border-[#1E3A8A] text-[#1E3A8A]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Guide Lineup Plans ({guidePlans.length})</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:w-96 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              plannerTab === 'guides'
                ? 'Search guides by title, niche, persona...'
                : 'Search plans by title, niche, buyer...'
            }
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
          />
        </div>
        <div className="text-xs font-medium text-stone-500">
          Showing <span className="font-semibold text-stone-900">{plannerTab === 'guides' ? filteredGuides.length : filteredPlans.length}</span> of {plannerTab === 'guides' ? giftGuides.length : guidePlans.length} items
        </div>
      </div>

      {/* TAB 1: EDITORIAL GIFT GUIDES */}
      {plannerTab === 'guides' && (
        filteredGuides.length === 0 ? (
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-12 text-center shadow-xs">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-stone-800">No editorial gift guides found</h3>
            <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
              {giftGuides.length === 0
                ? 'Create your first editorial gift guide to organize products and define curatorial themes.'
                : 'No gift guides match your search criteria.'}
            </p>
            {giftGuides.length === 0 && (
              <button
                onClick={onOpenNewGuideModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-semibold hover:bg-[#1e3a8aec] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Guide</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGuides.map((guide) => {
              const isSelectedInWorkspace = guide.id === activeGiftGuideId;
              const assignedProducts = products.filter((p) => p.details?.giftGuideId === guide.id);
              const assignedCount = assignedProducts.length;

              return (
                <div
                  key={guide.id}
                  className={`bg-white border rounded-xl p-5 hover:border-stone-400 transition-all flex flex-col justify-between shadow-xs group ${
                    isSelectedInWorkspace ? 'border-[#1E3A8A] ring-1 ring-[#1E3A8A]/30' : 'border-[#E8E4DC]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-700 truncate max-w-[200px]">
                        {guide.niche || 'General Niche'}
                      </span>
                      {isSelectedInWorkspace && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#1E3A8A] text-white px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" />
                          Workspace Active
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-serif text-base font-bold text-stone-900 leading-snug line-clamp-2">
                        {guide.name}
                      </h3>
                      {guide.description && (
                        <p className="text-xs text-stone-600 mt-1.5 line-clamp-3 leading-relaxed">
                          {guide.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
                      {guide.targetPersona && (
                        <p className="line-clamp-2 text-stone-500">
                          <span className="font-semibold text-stone-700">Target:</span> {guide.targetPersona}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-500">
                        <span className="inline-flex items-center gap-1 bg-[#FBF9F5] px-2 py-0.5 rounded border border-[#E8E4DC]">
                          <Layers className="w-3 h-3 text-stone-400" />
                          <span>{assignedCount} product{assignedCount === 1 ? '' : 's'} assigned</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-2">
                    {onSelectGiftGuideForWorkspace && !isSelectedInWorkspace ? (
                      <button
                        onClick={() => onSelectGiftGuideForWorkspace(guide)}
                        className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                      >
                        Set in Workspace
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-400 italic">
                        {isSelectedInWorkspace ? 'Currently active' : ''}
                      </span>
                    )}

                    {/* Delete Guide Action */}
                    <button
                      onClick={() => setGuideToDelete(guide)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                      title={`Delete "${guide.name}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Guide</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* TAB 2: GUIDE LINEUP PLANS */}
      {plannerTab === 'plans' && (
        filteredPlans.length === 0 ? (
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-12 text-center shadow-xs">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-stone-800">No guide plans found</h3>
            <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
              {guidePlans.length === 0
                ? 'Get started by creating your first editorial gift guide plan.'
                : 'No guide plans match your search filter.'}
            </p>
            {guidePlans.length === 0 && (
              <button
                onClick={onCreateNewPlan}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-semibold hover:bg-[#1e3a8aec] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Guide Plan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPlans.map((plan) => {
              const itemCount = plan.lineup.length;
              const hasOutline = !!plan.outline && plan.outline.sections.some((s) => s.isApproved);
              const hasPrompt = !!plan.generatedPrompt;

              return (
                <div
                  key={plan.id}
                  className="bg-white border border-[#E8E4DC] rounded-xl p-5 hover:border-stone-400 transition-all flex flex-col justify-between shadow-xs group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-700 truncate max-w-[200px]">
                        {plan.brief.topicOrNiche || 'General Niche'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${plan.title}"?`)) {
                            onDeletePlan(plan.id);
                          }
                        }}
                        className="text-stone-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete Guide Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3
                      onClick={() => onSelectPlan(plan.id)}
                      className="font-serif text-lg font-bold text-stone-900 group-hover:text-[#1E3A8A] transition-colors cursor-pointer line-clamp-2"
                    >
                      {plan.title || 'Untitled Guide'}
                    </h3>

                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {plan.brief.primaryReaderProblem || plan.brief.guidePurpose || 'No brief summary yet.'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1 bg-[#FBF9F5] px-2.5 py-1 rounded-md border border-[#E8E4DC]">
                        <Layers className="w-3.5 h-3.5 text-stone-500" />
                        <span>{itemCount} {itemCount === 1 ? 'Product' : 'Products'}</span>
                      </span>
                      {hasOutline && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md text-emerald-800 border border-emerald-200">
                          <Sparkles className="w-3 h-3" />
                          <span>Outline Approved</span>
                        </span>
                      )}
                      {hasPrompt && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md text-blue-800 border border-blue-200">
                          <FileText className="w-3 h-3" />
                          <span>Prompt Ready</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(plan.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => onSelectPlan(plan.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] group-hover:translate-x-0.5 transition-transform cursor-pointer"
                    >
                      <span>Open Planner</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Delete Guide Confirmation Modal */}
      <DeleteGuideConfirmModal
        isOpen={!!guideToDelete}
        guide={guideToDelete}
        assignedProductCount={assignedCountForGuideToDelete}
        onConfirm={handleConfirmDeleteGuide}
        onCancel={() => setGuideToDelete(null)}
        isDeleting={isDeletingGuide}
      />
    </div>
  );
};
