/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, BookOpen, Plus, Trash2, Search, Check, Layers } from 'lucide-react';
import { GiftGuide, ProductRecord } from '../../types';

interface ManageGuidesModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftGuides: GiftGuide[];
  products: ProductRecord[];
  selectedGuideId?: string;
  onSelectGuide?: (guide: GiftGuide) => void;
  onDeleteGuideClick: (guide: GiftGuide) => void;
  onOpenNewGuideModal: () => void;
}

export const ManageGuidesModal: React.FC<ManageGuidesModalProps> = ({
  isOpen,
  onClose,
  giftGuides,
  products,
  selectedGuideId,
  onSelectGuide,
  onDeleteGuideClick,
  onOpenNewGuideModal
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredGuides = giftGuides.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.niche && g.niche.toLowerCase().includes(search.toLowerCase())) ||
    (g.targetPersona && g.targetPersona.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4DC] bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1E3A8A]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Manage Editorial Gift Guides
              </h3>
              <p className="text-xs text-stone-500">
                View, select, create, or delete editorial gift guides across the studio.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenNewGuideModal();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E3A8A] text-white text-xs font-semibold shadow-xs hover:bg-[#1e3a8aec] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Guide</span>
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#E8E4DC] bg-stone-50/70 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guides by title, niche, or persona..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>
        </div>

        {/* Guides List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {filteredGuides.length === 0 ? (
            <div className="text-center py-10 text-xs text-stone-500 bg-white border border-dashed border-[#E8E4DC] rounded-xl p-6">
              {giftGuides.length === 0
                ? 'No gift guides found. Click "New Guide" to create one.'
                : 'No gift guides match your search query.'}
            </div>
          ) : (
            filteredGuides.map((guide) => {
              const isSelected = guide.id === selectedGuideId;
              const assignedCount = products.filter((p) => p.details?.giftGuideId === guide.id).length;

              return (
                <div
                  key={guide.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 border-[#1E3A8A] shadow-xs'
                      : 'bg-white border-[#E8E4DC] hover:border-stone-400'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-serif text-sm font-bold text-stone-900">
                          {guide.name}
                        </h4>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#1E3A8A] text-white px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            Selected in Workspace
                          </span>
                        )}
                        {guide.niche && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                            {guide.niche}
                          </span>
                        )}
                      </div>

                      {guide.description && (
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {guide.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 pt-1">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-stone-400" />
                          <span>{assignedCount} product{assignedCount === 1 ? '' : 's'} assigned</span>
                        </span>
                        {guide.targetPersona && (
                          <span className="truncate max-w-[260px]" title={guide.targetPersona}>
                            Target: {guide.targetPersona}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                      {onSelectGuide && !isSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectGuide(guide);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Select
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteGuideClick(guide)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                        title="Delete this gift guide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Guide</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#E8E4DC] bg-white shrink-0 text-xs text-stone-500">
          <span>{giftGuides.length} total editorial guide{giftGuides.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
