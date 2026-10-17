/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, BookPlus } from 'lucide-react';
import { GiftGuide } from '../../types';

interface NewGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guide: GiftGuide) => void;
}

export const NewGuideModal: React.FC<NewGuideModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetPersona, setTargetPersona] = useState('');
  const [niche, setNiche] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newGuide: GiftGuide = {
      id: 'guide_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      description: description.trim(),
      targetPersona: targetPersona.trim(),
      niche: niche.trim() || 'General Niche',
      itemCount: 0
    };

    onSave(newGuide);
    setName('');
    setDescription('');
    setTargetPersona('');
    setNiche('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4DC] bg-white">
          <div className="flex items-center gap-2">
            <BookPlus className="w-5 h-5 text-[#1E3A8A]" />
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              Create Editorial Gift Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Guide Title / Working Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Best Historical Gifts for Roman Republic Enthusiasts"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Primary Niche or Subject
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Roman History, Classical Archaeology"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Target Recipient Persona
            </label>
            <input
              type="text"
              value={targetPersona}
              onChange={(e) => setTargetPersona(e.target.value)}
              placeholder="e.g. Avid readers of Mary Beard, Latin students, amateur numismatists"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Editorial Purpose & Context
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the curatorial theme, price brackets, and why this guide exists."
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E4DC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-50 rounded-md transition-colors"
            >
              Save Gift Guide
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
