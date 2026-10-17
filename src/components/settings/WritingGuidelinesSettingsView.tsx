/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { WritingGuidelinesSettings, ContentTypeKey, ApprovedWritingExample } from '../../types/writingGuidelines';
import { INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST } from '../../data/initialWritingGuidelines';
import { getPromptBreakdown } from '../../services/promptComposer';
import { BookOpen, Sparkles, Save, RotateCcw, Plus, Trash2, CheckCircle2, AlertTriangle, FileText, Check, Download, Upload, Pencil } from 'lucide-react';
import { createWritingGuidelinesExport, validateWritingGuidelinesImport, ExportedWritingConfiguration, GuidelinesDiffSummary } from '../../utils/writingGuidelinesImportExport';
import { downloadFile } from '../../utils/exportUtils';
import { ImportWritingGuidelinesModal } from '../modals/ImportWritingGuidelinesModal';

interface WritingGuidelinesSettingsViewProps {
  guidelines: WritingGuidelinesSettings;
  examples: ApprovedWritingExample[];
  onSaveGuidelines: (updated: WritingGuidelinesSettings, updatedExamples?: ApprovedWritingExample[]) => Promise<void>;
  onSaveExample?: (example: ApprovedWritingExample) => Promise<void>;
  onDeleteExample?: (id: string) => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const WritingGuidelinesSettingsView: React.FC<WritingGuidelinesSettingsViewProps> = ({
  guidelines,
  examples,
  onSaveGuidelines,
  onSaveExample,
  onDeleteExample,
  showToast
}) => {
  const [currentGuidelines, setCurrentGuidelines] = useState<WritingGuidelinesSettings>(guidelines);
  const [currentExamples, setCurrentExamples] = useState<ApprovedWritingExample[]>(examples);
  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'universal' | 'content_types' | 'examples' | 'preview'>('universal');

  // Calibration example editing state
  const [editingMode, setEditingMode] = useState<'create' | 'edit' | null>(null);
  const [editingExampleId, setEditingExampleId] = useState<string | null>(null);
  const [exTitle, setExTitle] = useState('');
  const [exContentType, setExContentType] = useState<string>('product_entry');
  const [exExcerpt, setExExcerpt] = useState('');
  const [exNiche, setExNiche] = useState('');
  const [exGuideName, setExGuideName] = useState('');
  const [exTags, setExTags] = useState('');
  const [exEditorialPrinciples, setExEditorialPrinciples] = useState('');
  const [exWhyEffective, setExWhyEffective] = useState('');
  const [originalExample, setOriginalExample] = useState<ApprovedWritingExample | null>(null);

  useEffect(() => {
    if (!isModified) {
      setCurrentGuidelines(guidelines);
      setCurrentExamples(examples);
    }
  }, [guidelines, examples, isModified]);

  const handleFieldChange = (field: keyof WritingGuidelinesSettings, value: any) => {
    setCurrentGuidelines((prev) => ({
      ...prev,
      [field]: value
    }));
    setIsModified(true);
  };

  const handleContentTypeChange = (type: ContentTypeKey, field: 'instructions' | 'formattingRules', value: string) => {
    setCurrentGuidelines((prev) => ({
      ...prev,
      contentTypeProfiles: {
        ...prev.contentTypeProfiles,
        [type]: {
          ...prev.contentTypeProfiles[type],
          [field]: value
        }
      }
    }));
    setIsModified(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveGuidelines(currentGuidelines, currentExamples);
      setIsModified(false);
      showToast('Writing guidelines & calibration examples saved successfully');
    } catch (err) {
      showToast('Failed to save writing guidelines', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const [importModalData, setImportModalData] = useState<{
    payload: ExportedWritingConfiguration;
    diffSummary?: GuidelinesDiffSummary;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exportData = createWritingGuidelinesExport(currentGuidelines, currentExamples);
    const jsonStr = JSON.stringify(exportData, null, 2);
    downloadFile(jsonStr, 'science-of-gifts-writing-guidelines.json', 'application/json;charset=utf-8;');
    showToast('Writing guidelines & style profiles exported successfully');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    try {
      const text = await file.text();
      const validation = validateWritingGuidelinesImport(text, currentGuidelines, currentExamples);
      if (!validation.isValid || !validation.payload) {
        showToast(validation.error || 'Failed to validate imported file.', 'error');
        return;
      }
      setImportModalData({
        payload: validation.payload,
        diffSummary: validation.diffSummary
      });
    } catch (err: any) {
      showToast(`Failed to read import file: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importModalData) return;
    setIsSaving(true);
    try {
      const { payload } = importModalData;
      setCurrentGuidelines(payload.guidelines);
      setCurrentExamples(payload.examples || []);
      await onSaveGuidelines(payload.guidelines, payload.examples || []);

      setIsModified(false);
      setImportModalData(null);
      showToast(`Imported writing guidelines and ${payload.examples.length} style examples successfully.`);
    } catch (err: any) {
      showToast(`Failed to apply import: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm('Are you sure you want to restore default Science of Gifts writing guidelines? This will overwrite your current guidelines.')) {
      setCurrentGuidelines(INITIAL_WRITING_GUIDELINES);
      setCurrentExamples(INITIAL_WRITING_EXAMPLES_LIST);
      setIsModified(true);
      showToast('Default writing guidelines loaded. Click Save Changes to persist.');
    }
  };

  const handleStartAddExample = () => {
    setEditingMode('create');
    setEditingExampleId(null);
    setExTitle('');
    setExContentType('product_entry');
    setExExcerpt('');
    setExNiche('');
    setExGuideName('');
    setExTags('');
    setExEditorialPrinciples('');
    setExWhyEffective('');
    setOriginalExample(null);
  };

  const handleStartEditExample = (ex: ApprovedWritingExample) => {
    setEditingMode('edit');
    setEditingExampleId(ex.id);
    setExTitle(ex.title);
    setExContentType(ex.contentType || 'product_entry');
    setExExcerpt(ex.approvedExcerpt);
    setExNiche(ex.niche || '');
    setExGuideName(ex.guideName || '');
    setExTags(Array.isArray(ex.tags) ? ex.tags.join(', ') : '');
    setExEditorialPrinciples(Array.isArray(ex.editorialPrinciples) ? ex.editorialPrinciples.join('\n') : '');
    setExWhyEffective(ex.whyEffective || '');
    setOriginalExample(ex);
  };

  const isExampleFormDirty = () => {
    if (editingMode === 'create') {
      return Boolean(
        exTitle.trim() ||
        exExcerpt.trim() ||
        exNiche.trim() ||
        exGuideName.trim() ||
        exTags.trim() ||
        exEditorialPrinciples.trim() ||
        exWhyEffective.trim()
      );
    }
    if (editingMode === 'edit' && originalExample) {
      const origTags = Array.isArray(originalExample.tags) ? originalExample.tags.join(', ') : '';
      const origPrinciples = Array.isArray(originalExample.editorialPrinciples) ? originalExample.editorialPrinciples.join('\n') : '';
      return (
        exTitle !== originalExample.title ||
        exContentType !== (originalExample.contentType || 'product_entry') ||
        exExcerpt !== originalExample.approvedExcerpt ||
        exNiche !== (originalExample.niche || '') ||
        exGuideName !== (originalExample.guideName || '') ||
        exTags !== origTags ||
        exEditorialPrinciples !== origPrinciples ||
        exWhyEffective !== (originalExample.whyEffective || '')
      );
    }
    return false;
  };

  const handleCancelExampleEdit = () => {
    if (isExampleFormDirty()) {
      if (!confirm('You have unsaved changes in this calibration example. Discard changes?')) {
        return;
      }
    }
    setEditingMode(null);
    setEditingExampleId(null);
    setOriginalExample(null);
  };

  const handleDeleteExampleItem = async (id: string, title: string) => {
    if (confirm(`Delete example "${title}"? This cannot be undone.`)) {
      const next = currentExamples.filter((ex) => ex.id !== id);
      setCurrentExamples(next);
      try {
        await onSaveGuidelines(currentGuidelines, next);
        if (onDeleteExample) {
          await onDeleteExample(id);
        }
        showToast(`Example "${title}" deleted.`);
      } catch (err: any) {
        showToast(`Failed to delete example: ${err.message || 'Unknown error'}`, 'error');
      }
    }
  };

  const handleSaveExampleItem = async () => {
    if (!exTitle.trim()) {
      showToast('Please provide an example title.', 'error');
      return;
    }
    if (!exExcerpt.trim()) {
      showToast('Please provide the approved excerpt text.', 'error');
      return;
    }
    if (!exWhyEffective.trim()) {
      showToast('Please provide the "Why effective?" editorial explanation.', 'error');
      return;
    }

    const parsedTags = exTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const parsedPrinciples = exEditorialPrinciples
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter(Boolean);

    const targetId = editingMode === 'edit' && editingExampleId ? editingExampleId : `example-${Date.now()}`;

    const updatedEx: ApprovedWritingExample = {
      id: targetId,
      title: exTitle.trim(),
      niche: exNiche.trim() || 'General Niche',
      guideName: exGuideName.trim() || 'Science of Gifts Curated Guide',
      approvedExcerpt: exExcerpt.trim(),
      whyEffective: exWhyEffective.trim(),
      editorialPrinciples: parsedPrinciples.length > 0 ? parsedPrinciples : (originalExample?.editorialPrinciples || ['Primary source grounding', 'Specific observational hook']),
      tags: parsedTags.length > 0 ? parsedTags : (originalExample?.tags || ['Editorial Calibration']),
      contentType: exContentType.trim() || 'product_entry',
      createdAt: originalExample?.createdAt || new Date().toISOString()
    };

    let nextExamples: ApprovedWritingExample[];
    if (editingMode === 'edit') {
      nextExamples = currentExamples.map((e) => (e.id === targetId ? updatedEx : e));
    } else {
      nextExamples = [...currentExamples, updatedEx];
    }

    setCurrentExamples(nextExamples);

    try {
      await onSaveGuidelines(currentGuidelines, nextExamples);
      if (onSaveExample) {
        await onSaveExample(updatedEx);
      }
      showToast(
        editingMode === 'edit'
          ? `Calibration example "${updatedEx.title}" updated and persisted successfully.`
          : `Calibration example "${updatedEx.title}" added and persisted successfully.`
      );
      setEditingMode(null);
      setEditingExampleId(null);
      setOriginalExample(null);
    } catch (err: any) {
      showToast(`Failed to persist example: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const breakdown = getPromptBreakdown({
    guidelines: currentGuidelines,
    contentType: 'product_entry',
    taskInstructions: 'Draft product entry for a test item.',
    productOrGuideContext: 'Sample Product: Lindisfarne Mug. Target recipient: Medievalist historian.',
    examples: currentExamples
  });

  return (
    <div className="space-y-6">
      {/* Import Modal */}
      {importModalData && (
        <ImportWritingGuidelinesModal
          payload={importModalData.payload}
          diffSummary={importModalData.diffSummary}
          onConfirm={handleConfirmImport}
          onClose={() => setImportModalData(null)}
        />
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header Banner */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#1E3A8A] mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Persistent Editorial System</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
            Writing Guidelines & Style Profiles
          </h2>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Define your universal editorial rules, voice and tone, content-type profiles, and approved calibration examples. These are injected into every ChatGPT prompt generated across the studio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isModified && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Unsaved Edits</span>
            </span>
          )}

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#E8E4DC] text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-all cursor-pointer shadow-2xs"
            title="Export complete writing guidelines & style profiles as JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#1E3A8A]" />
            <span>Export</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#E8E4DC] text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-all cursor-pointer shadow-2xs"
            title="Import writing guidelines JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-[#1E3A8A]" />
            <span>Import</span>
          </button>

          <button
            onClick={handleRestoreDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 text-stone-700 font-semibold text-xs hover:bg-stone-200 transition-all cursor-pointer"
            title="Restore Default Science of Gifts Preferences"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#1E3A8A] text-white font-semibold text-xs shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-[#E8E4DC] bg-white rounded-t-xl px-4 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('universal')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'universal' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>1. Universal Rules & Guardrails</span>
        </button>
        <button
          onClick={() => setActiveSubTab('content_types')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'content_types' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>2. Content-Type Profiles</span>
        </button>
        <button
          onClick={() => setActiveSubTab('examples')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'examples' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>3. Approved Examples Library ({currentExamples.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('preview')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'preview' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>4. Prompt Composition Preview</span>
        </button>
      </div>

      {/* TAB 1: UNIVERSAL RULES */}
      {activeSubTab === 'universal' && (
        <div className="bg-white border border-[#E8E4DC] rounded-b-xl rounded-tr-xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900">Universal Writing Guidelines & Guardrails</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              These core instructions apply to all generated prompts across product entries, guides, and sections.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Universal Writing Guidelines (Core Rules)
              </label>
              <textarea
                rows={8}
                value={currentGuidelines.universalGuidelines}
                onChange={(e) => handleFieldChange('universalGuidelines', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A] leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Voice and Tone
                </label>
                <textarea
                  rows={4}
                  value={currentGuidelines.voiceAndTone}
                  onChange={(e) => handleFieldChange('voiceAndTone', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Style and Formatting Rules
                </label>
                <textarea
                  rows={4}
                  value={currentGuidelines.styleAndFormatting}
                  onChange={(e) => handleFieldChange('styleAndFormatting', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Things to Avoid
                </label>
                <textarea
                  rows={4}
                  value={currentGuidelines.thingsToAvoid}
                  onChange={(e) => handleFieldChange('thingsToAvoid', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Factual and Editorial Guardrails
                </label>
                <textarea
                  rows={4}
                  value={currentGuidelines.factualAndEditorialGuardrails}
                  onChange={(e) => handleFieldChange('factualAndEditorialGuardrails', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#1E3A8A]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTENT TYPE PROFILES */}
      {activeSubTab === 'content_types' && (
        <div className="bg-white border border-[#E8E4DC] rounded-b-xl rounded-tr-xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900">Content-Type Specific Profiles</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Customize instructions and formatting rules for specific sections. If left empty, universal guidelines apply.
            </p>
          </div>

          <div className="space-y-6">
            {(Object.keys(currentGuidelines.contentTypeProfiles) as ContentTypeKey[]).map((typeKey) => {
              const profile = currentGuidelines.contentTypeProfiles[typeKey];
              const label = typeKey.replace('_', ' ').toUpperCase();

              return (
                <div key={typeKey} className="bg-stone-50 border border-[#E8E4DC] rounded-xl p-5 space-y-3">
                  <h4 className="font-serif text-sm font-bold text-stone-900 tracking-wide uppercase">{label}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                        Instructions
                      </label>
                      <textarea
                        rows={3}
                        value={profile.instructions}
                        onChange={(e) => handleContentTypeChange(typeKey, 'instructions', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                        Formatting Rules
                      </label>
                      <textarea
                        rows={3}
                        value={profile.formattingRules}
                        onChange={(e) => handleContentTypeChange(typeKey, 'formattingRules', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: EXAMPLES LIBRARY */}
      {activeSubTab === 'examples' && (
        <div className="bg-white border border-[#E8E4DC] rounded-b-xl rounded-tr-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">Approved Editorial Calibration Examples</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Examples help ChatGPT understand desired voice, specificity, and pacing without copying text verbatim.
              </p>
            </div>
            <button
              onClick={handleStartAddExample}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white font-semibold text-xs shadow-sm hover:bg-[#1e3a8aec] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Example</span>
            </button>
          </div>

          {editingMode && (
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="border-b border-blue-200/80 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {editingMode === 'edit' ? (
                      <Pencil className="w-4 h-4 text-[#1E3A8A]" />
                    ) : (
                      <Plus className="w-4 h-4 text-[#1E3A8A]" />
                    )}
                    <h4 className="font-serif text-sm font-bold text-blue-950">
                      {editingMode === 'edit'
                        ? `Edit Approved Calibration Example: "${originalExample?.title || exTitle}"`
                        : 'Add New Approved Calibration Example'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {editingMode === 'edit' ? 'Editing Existing' : 'New Draft'}
                  </span>
                </div>
                <p className="text-xs text-blue-800/80 mt-1">
                  {editingMode === 'edit'
                    ? 'Update any field below. Changes will be saved immediately to persistent storage and used by prompt generation.'
                    : 'Provide an approved sample to calibrate ChatGPT on voice, specificity, and tone.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Example Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={exTitle}
                    onChange={(e) => setExTitle(e.target.value)}
                    placeholder="e.g. Lindisfarne Chronicle Mug Entry"
                    className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Content Type
                  </label>
                  <select
                    value={exContentType}
                    onChange={(e) => setExContentType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                  >
                    <option value="product_entry">Product Entry (Standard Gift Guide Entry)</option>
                    <option value="gift_guide_intro">Gift Guide Introduction</option>
                    <option value="hero_feature">Hero Feature / Lead Product</option>
                    <option value="category_roundup">Category Roundup / Quick Hits</option>
                    <option value="brief_recommendation">Brief Recommendation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Associated Niche / Topic
                  </label>
                  <input
                    type="text"
                    value={exNiche}
                    onChange={(e) => setExNiche(e.target.value)}
                    placeholder="e.g. Viking History & Norse Culture"
                    className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Associated Guide Name
                  </label>
                  <input
                    type="text"
                    value={exGuideName}
                    onChange={(e) => setExGuideName(e.target.value)}
                    placeholder="e.g. The Definitive Gift Guide for Viking History Enthusiasts"
                    className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={exTags}
                    onChange={(e) => setExTags(e.target.value)}
                    placeholder="e.g. Editorial Calibration, Primary Sources, Ceramic Drinkware"
                    className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Editorial Principles (Comma or Newline Separated)
                  </label>
                  <input
                    type="text"
                    value={exEditorialPrinciples}
                    onChange={(e) => setExEditorialPrinciples(e.target.value)}
                    placeholder="e.g. Primary source grounding, Observational hook, Zero em-dashes"
                    className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Approved Excerpt (Example Text) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={exExcerpt}
                    onChange={(e) => setExExcerpt(e.target.value)}
                    placeholder="The well-written reference excerpt that exemplifies the target voice..."
                    className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A] font-sans"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                    Why Effective (Editorial Analysis) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={exWhyEffective}
                    onChange={(e) => setExWhyEffective(e.target.value)}
                    placeholder="Explain why this copy succeeds: specific pacing, lack of hyperbole, seamless integration of technical specifications..."
                    className="w-full px-3 py-2 bg-white border border-[#E8E4DC] rounded-lg text-xs text-stone-900 focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-blue-200/80">
                <span className="text-[11px] text-stone-500 italic">
                  {isExampleFormDirty() ? '• You have unsaved changes' : 'All changes saved in draft'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelExampleEdit}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveExampleItem}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#1E3A8A] hover:bg-[#1e3a8aec] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingMode === 'edit' ? 'Save Changes' : 'Save Example'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentExamples.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 border border-dashed border-[#E8E4DC] rounded-xl text-stone-500 text-xs">
              No approved editorial calibration examples attached. Click "Add Example" or import a profile to add examples.
            </div>
          ) : (
            <div className="space-y-4">
              {currentExamples.map((ex) => (
                <div
                  key={ex.id}
                  className={`bg-stone-50 border rounded-xl p-5 space-y-3 transition-all ${
                    editingExampleId === ex.id
                      ? 'border-[#1E3A8A] ring-1 ring-[#1E3A8A]/30 bg-blue-50/20'
                      : 'border-[#E8E4DC] hover:border-stone-400'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200/70 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-serif text-base font-bold text-stone-900">{ex.title}</h4>
                      {ex.contentType && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-[#1E3A8A]">
                          {ex.contentType.replace('_', ' ')}
                        </span>
                      )}
                      {ex.niche && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                          {ex.niche}
                        </span>
                      )}
                      {ex.guideName && (
                        <span className="text-[10px] text-stone-500 italic max-w-[200px] truncate" title={ex.guideName}>
                          Guide: {ex.guideName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleStartEditExample(ex)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:text-[#1E3A8A] hover:bg-stone-200/70 bg-white border border-stone-300 rounded-md transition-colors cursor-pointer"
                        title="Edit this calibration example"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteExampleItem(ex.id, ex.title)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 bg-white border border-red-200 rounded-md transition-colors cursor-pointer"
                        title="Delete this calibration example"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs italic text-stone-800 bg-white p-3.5 rounded-lg border border-stone-200 leading-relaxed font-serif">
                    "{ex.approvedExcerpt}"
                  </p>

                  <div className="text-xs text-stone-600 space-y-1">
                    <p>
                      <span className="font-semibold text-stone-800">Why effective:</span> {ex.whyEffective}
                    </p>
                    {Array.isArray(ex.tags) && ex.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-stone-500">Tags:</span>
                        {ex.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {Array.isArray(ex.editorialPrinciples) && ex.editorialPrinciples.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] font-semibold text-stone-500">Principles:</span>
                        {ex.editorialPrinciples.map((principle, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-blue-50 text-blue-900 border border-blue-100 px-2 py-0.5 rounded"
                          >
                            {principle}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PREVIEW */}
      {activeSubTab === 'preview' && (
        <div className="bg-white border border-[#E8E4DC] rounded-b-xl rounded-tr-xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900">Composed Prompt Preview & Validation</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Inspect how the centralized composer merges universal guidelines, content-type profiles, overrides, and calibration examples.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">Layer Breakdown</h4>
              <div className="space-y-3">
                <div className="p-3 bg-stone-50 rounded border border-stone-200 text-xs font-mono text-stone-800 whitespace-pre-wrap">
                  <span className="font-bold text-[#1E3A8A] block mb-1">1. Universal Layer:</span>
                  {breakdown.universalLayer}
                </div>
                <div className="p-3 bg-stone-50 rounded border border-stone-200 text-xs font-mono text-stone-800 whitespace-pre-wrap">
                  <span className="font-bold text-[#1E3A8A] block mb-1">2. Content-Type Layer:</span>
                  {breakdown.contentTypeLayer}
                </div>
                <div className="p-3 bg-stone-50 rounded border border-stone-200 text-xs font-mono text-stone-800 whitespace-pre-wrap">
                  <span className="font-bold text-[#1E3A8A] block mb-1">3. Examples Calibration Layer:</span>
                  {breakdown.examplesLayer}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">Full Composed Output</h4>
              <textarea
                readOnly
                rows={12}
                value={breakdown.fullComposedPrompt}
                className="w-full px-4 py-3 bg-[#FBF9F5] border border-[#E8E4DC] rounded-xl text-xs font-mono text-stone-800 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
