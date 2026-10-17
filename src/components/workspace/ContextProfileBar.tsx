/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FolderOpen,
  Save,
  Plus,
  Copy,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  AlertTriangle,
  ChevronDown,
  Layers,
  Sparkles,
  BookmarkCheck,
  X
} from 'lucide-react';
import { ContextProfile, SharedWorkingContext } from '../../types';

interface ContextProfileBarProps {
  profiles: ContextProfile[];
  activeProfileId: string | null;
  isModified: boolean;
  workingContext: SharedWorkingContext;
  onSelectProfile: (profileId: string | null, force?: boolean) => void;
  onSaveToActiveProfile: () => Promise<void>;
  onCreateProfile: (name: string, description: string) => Promise<void>;
  onRenameProfile: (id: string, newName: string, newDescription?: string) => Promise<void>;
  onDuplicateProfile: (id: string) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onResetWorkingContext: () => void;
}

export const ContextProfileBar: React.FC<ContextProfileBarProps> = ({
  profiles,
  activeProfileId,
  isModified,
  workingContext,
  onSelectProfile,
  onSaveToActiveProfile,
  onCreateProfile,
  onRenameProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onResetWorkingContext
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [modalType, setModalType] = useState<
    'create' | 'rename' | 'delete' | 'reset' | 'unsaved_switch' | null
  >(null);

  // Form states for modals
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileDescInput, setProfileDescInput] = useState('');
  const [targetProfileId, setTargetProfileId] = useState<string | null>(null);
  const [pendingSwitchProfileId, setPendingSwitchProfileId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  // Handle switching profiles safely
  const handleProfileClick = (newProfileId: string | null) => {
    setIsDropdownOpen(false);
    if (newProfileId === activeProfileId) return;

    if (isModified && activeProfile) {
      setPendingSwitchProfileId(newProfileId);
      setModalType('unsaved_switch');
    } else {
      onSelectProfile(newProfileId);
    }
  };

  // Open Create Profile Modal
  const openCreateModal = () => {
    setIsDropdownOpen(false);
    setProfileNameInput(
      workingContext.giftGuideName
        ? `${workingContext.giftGuideName.split(' ')[0]} Gifts`
        : 'New Context Profile'
    );
    setProfileDescInput(workingContext.audienceInterest || '');
    setModalType('create');
  };

  // Open Rename Modal
  const openRenameModal = (profile: ContextProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDropdownOpen(false);
    setTargetProfileId(profile.id);
    setProfileNameInput(profile.name);
    setProfileDescInput(profile.description || '');
    setModalType('rename');
  };

  // Open Delete Modal
  const openDeleteModal = (profileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDropdownOpen(false);
    setTargetProfileId(profileId);
    setModalType('delete');
  };

  // Submit Create Profile
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNameInput.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateProfile(profileNameInput.trim(), profileDescInput.trim());
      setModalType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Rename Profile
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProfileId || !profileNameInput.trim()) return;
    setIsSubmitting(true);
    try {
      await onRenameProfile(targetProfileId, profileNameInput.trim(), profileDescInput.trim());
      setModalType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!targetProfileId) return;
    setIsSubmitting(true);
    try {
      await onDeleteProfile(targetProfileId);
      setModalType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Unsaved Changes Resolution
  const handleSaveAndSwitch = async () => {
    setIsSubmitting(true);
    try {
      await onSaveToActiveProfile();
      onSelectProfile(pendingSwitchProfileId);
      setModalType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardAndSwitch = () => {
    onSelectProfile(pendingSwitchProfileId, true);
    setModalType(null);
  };

  return (
    <div className="bg-[#F4F1EA] border-b border-[#E8E4DC] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
      {/* Left: Active Profile Badge & Selector */}
      <div className="flex items-center gap-2 relative">
        <span className="font-semibold text-stone-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Layers className="w-3.5 h-3.5 text-[#1E3A8A]" />
          <span>Context Profile:</span>
        </span>

        {/* Profile Dropdown Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#D5CEBF] hover:border-stone-400 rounded-md font-medium text-stone-800 shadow-2xs transition-colors"
          >
            <span className="truncate max-w-[180px] sm:max-w-[240px]">
              {activeProfile ? activeProfile.name : 'No Profile (Custom Context)'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-[#E8E4DC] rounded-lg shadow-lg z-50 py-1.5 text-stone-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Select Reusable Profile
                </span>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="text-[11px] text-[#1E3A8A] hover:underline flex items-center gap-0.5 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Profile</span>
                </button>
              </div>

              {/* List of profiles */}
              <div className="max-h-56 overflow-y-auto py-1">
                {profiles.map((p) => {
                  const isActive = p.id === activeProfileId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProfileClick(p.id)}
                      className={`px-3 py-2 flex items-center justify-between cursor-pointer group transition-colors ${
                        isActive ? 'bg-blue-50/60 text-[#1E3A8A]' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          {isActive && <Check className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />}
                          <span className="font-medium truncate text-xs">{p.name}</span>
                        </div>
                        {p.description && (
                          <p className="text-[10px] text-stone-400 truncate mt-0.5">{p.description}</p>
                        )}
                      </div>

                      {/* Item Quick Actions */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateProfile(p.id);
                          }}
                          className="p-1 hover:bg-stone-200 rounded text-stone-500 hover:text-stone-800"
                          title="Duplicate Profile"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openRenameModal(p, e)}
                          className="p-1 hover:bg-stone-200 rounded text-stone-500 hover:text-stone-800"
                          title="Rename / Edit Info"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {profiles.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => openDeleteModal(p.id, e)}
                            className="p-1 hover:bg-red-100 rounded text-stone-400 hover:text-red-700"
                            title="Delete Profile"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Freeform option */}
                <div
                  onClick={() => handleProfileClick(null)}
                  className={`px-3 py-2 border-t border-stone-100 flex items-center gap-1.5 cursor-pointer transition-colors ${
                    activeProfileId === null
                      ? 'bg-blue-50/60 text-[#1E3A8A]'
                      : 'hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  {activeProfileId === null && <Check className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />}
                  <span className="text-xs italic">Continue with Freeform Working Context (No Profile)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* State Indicator: Subtle unboxed text */}
        {activeProfile ? (
          isModified ? (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-800"
              title="You have modified the shared context in this workspace since loading this profile"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Modified</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-xs text-stone-500"
              title="Working context matches the saved profile"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>In sync</span>
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-stone-500 font-normal">
            <span>Custom context</span>
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Save to Current Profile (When modified) */}
        {activeProfile && isModified && (
          <button
            type="button"
            onClick={onSaveToActiveProfile}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md transition-colors shadow-2xs"
            title={`Save changes directly to '${activeProfile.name}'`}
          >
            <Save className="w-3 h-3" />
            <span>Update Profile</span>
          </button>
        )}

        {/* Save As New Profile */}
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-700 bg-white border border-[#D5CEBF] hover:bg-stone-50 rounded-md transition-colors shadow-2xs"
          title="Save current shared context as a new reusable profile"
        >
          <Plus className="w-3 h-3 text-[#1E3A8A]" />
          <span>Save As Profile</span>
        </button>

        {/* Reset Context */}
        <button
          type="button"
          onClick={() => setModalType('reset')}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 rounded-md transition-colors"
          title="Reset shared workspace context to blank"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Modals & Confirmation Dialogs */}

      {/* 1. Create Profile Modal */}
      {modalType === 'create' && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E8E4DC] max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Save As Reusable Context Profile
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Profile Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  placeholder="e.g. Viking Gifts, Civil War Gifts, Filmmaker Gifts"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Description / Niche Focus <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={profileDescInput}
                  onChange={(e) => setProfileDescInput(e.target.value)}
                  placeholder="e.g. Norse medieval history and primary chronicle citations"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                />
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed bg-[#FAF8F5] p-2.5 rounded border border-[#E8E4DC]">
                This will save all currently populated shared fields (gift guide, primary & secondary recipient, occasion, niche, specs, and design references) into this profile. Mockup images and product names remain isolated to individual products.
              </p>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !profileNameInput.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Rename / Edit Modal */}
      {modalType === 'rename' && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E8E4DC] max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Rename Context Profile
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Profile Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Description <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={profileDescInput}
                  onChange={(e) => setProfileDescInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !profileNameInput.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors"
                >
                  {isSubmitting ? 'Updating...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Profile Modal */}
      {modalType === 'delete' && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-red-200 max-w-sm w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-red-700 mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Delete Context Profile?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mt-2">
              Are you sure you want to delete this profile? Saved product records that previously used this profile will retain their historical context snapshots untouched.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reset Working Context Confirmation */}
      {modalType === 'reset' && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-amber-200 max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-800 mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Reset Workspace Context?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mt-2">
              This will clear the shared guide, recipient, and positioning fields in the active workspace so you can begin fresh.
            </p>
            <p className="text-xs text-stone-500 bg-[#FAF8F5] p-2.5 rounded border border-[#E8E4DC] mt-2">
              <strong>Safe action:</strong> Saved context profiles, existing product records, and Business Brain entries will not be deleted.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetWorkingContext();
                  setModalType(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-800 hover:bg-stone-900 rounded-md transition-colors"
              >
                Reset Context
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Unsaved Changes Guard upon Switching Profile */}
      {modalType === 'unsaved_switch' && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-amber-300 max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-800 mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Unsaved Profile Changes
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mt-2">
              You modified the shared context while working in profile{' '}
              <strong className="text-stone-900">"{activeProfile?.name}"</strong>.
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Would you like to update "{activeProfile?.name}" with these edits, discard them, or stay here?
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscardAndSwitch}
                className="px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 rounded-md border border-amber-200"
              >
                Discard & Switch
              </button>
              <button
                type="button"
                onClick={handleSaveAndSwitch}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save & Switch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
