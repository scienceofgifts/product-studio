/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { GiftGuide } from '../../types';

interface DeleteGuideConfirmModalProps {
  isOpen: boolean;
  guide: GiftGuide | null;
  assignedProductCount: number;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteGuideConfirmModal: React.FC<DeleteGuideConfirmModalProps> = ({
  isOpen,
  guide,
  assignedProductCount,
  onConfirm,
  onCancel,
  isDeleting = false
}) => {
  if (!isOpen || !guide) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4DC] bg-white">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Delete Gift Guide?
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200/80 rounded-lg p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-800 mb-1">
              Guide to be deleted
            </p>
            <p className="font-serif text-sm font-bold text-red-950 leading-snug">
              {guide.name}
            </p>
            {guide.niche && (
              <p className="text-xs text-red-800/80 mt-1">
                Niche: {guide.niche}
              </p>
            )}
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            This action <span className="font-semibold text-stone-800">cannot be undone</span>. The guide will be permanently removed from your editorial guide collection and guide selectors.
          </p>

          <div className="bg-stone-100 rounded-lg p-3 text-xs text-stone-700 space-y-1">
            <p className="font-semibold text-stone-900">Data integrity protection:</p>
            {assignedProductCount > 0 ? (
              <p>
                <span className="font-semibold text-[#1E3A8A]">{assignedProductCount}</span> product{assignedProductCount === 1 ? '' : 's'} currently assigned to this guide will <span className="font-medium text-emerald-800">remain safe in your catalogue</span>. Their guide assignment will simply be cleared.
              </p>
            ) : (
              <p>No products are currently assigned to this guide. No product records will be altered.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E4DC]">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting Guide...' : 'Delete Guide'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
