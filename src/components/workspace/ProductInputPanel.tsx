/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  RefreshCw,
  Sparkles,
  Save,
  HelpCircle,
  PlusCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  Cpu,
  Check,
  BookmarkCheck,
  BookOpen,
  Trash2
} from 'lucide-react';
import { ProductDetailsInput, ProductType, AnalysisMode, GiftGuide, ContextProfile } from '../../types';
import { processImageUpload } from '../../utils/imageUtils';
import { SAMPLE_PRODUCTS } from '../../data/sampleProducts';
import { ContextProfileBar } from './ContextProfileBar';
import { extractSharedContext } from '../../utils/contextUtils';
import { SUPPORTED_MODELS, getModelDefinition } from '../../config/models';

interface ProductInputPanelProps {
  details: ProductDetailsInput;
  onDetailsChange: (details: ProductDetailsInput) => void;
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  imageDataUrl?: string;
  imageFileName?: string;
  imageSize?: number;
  onImageSelected: (data: {
    blob: Blob;
    base64: string;
    dataUrl: string;
    fileName: string;
    mimeType: string;
    size: number;
    width: number;
    height: number;
  }) => void;
  onImageRemoved: () => void;
  onRunAnalysis: () => void;
  onSaveDraft: () => void;
  isAnalyzing: boolean;
  giftGuides: GiftGuide[];
  onOpenNewGuideModal: () => void;
  onOpenManageGuidesModal?: () => void;
  onDeleteGiftGuideClick?: (guide: GiftGuide) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;

  // Context Profile Props
  profiles: ContextProfile[];
  activeProfileId: string | null;
  isContextModified: boolean;
  onSelectProfile: (profileId: string | null, force?: boolean) => void;
  onSaveToActiveProfile: () => Promise<void>;
  onCreateProfile: (name: string, description: string) => Promise<void>;
  onRenameProfile: (id: string, newName: string, newDescription?: string) => Promise<void>;
  onDuplicateProfile: (id: string) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onResetWorkingContext: () => void;
}

export const ProductInputPanel: React.FC<ProductInputPanelProps> = ({
  details,
  onDetailsChange,
  mode,
  onModeChange,
  imageDataUrl,
  imageFileName,
  imageSize,
  onImageSelected,
  onImageRemoved,
  onRunAnalysis,
  onSaveDraft,
  isAnalyzing,
  giftGuides,
  onOpenNewGuideModal,
  onOpenManageGuidesModal,
  onDeleteGiftGuideClick,
  selectedModel,
  onModelChange,
  profiles,
  activeProfileId,
  isContextModified,
  onSelectProfile,
  onSaveToActiveProfile,
  onCreateProfile,
  onRenameProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onResetWorkingContext
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExtractUrlFacts = async () => {
    if (!details.productUrl || !details.productUrl.trim()) return;
    setIsExtractingUrl(true);
    setExtractError(null);

    try {
      const response = await fetch('/api/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: details.productUrl.trim() })
      });

      const contentType = response.headers.get('content-type') || '';
      let resJson: any = null;
      if (contentType.includes('application/json')) {
        resJson = await response.json().catch(() => null);
      } else {
        const rawText = await response.text().catch(() => '');
        throw new Error(`Server returned non-JSON response (${response.status}). ${rawText.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(resJson?.error || `HTTP ${response.status}`);
      }

      if (!resJson || !resJson.success || !resJson.facts) {
        throw new Error(resJson?.error || 'Failed to extract facts from URL.');
      }

      const facts = resJson.facts;
      const updatedDetails: ProductDetailsInput = {
        ...details,
        extractedFacts: facts,
        workingName: details.workingName || facts.rawExtractedTitle || details.workingName,
        currentTitle: details.currentTitle || facts.rawExtractedTitle || details.currentTitle,
        currentDescription: details.currentDescription || facts.rawExtractedDescription || details.currentDescription
      };

      onDetailsChange(updatedDetails);
    } catch (err: any) {
      setExtractError(err.message || 'Extraction failed');
    } finally {
      setIsExtractingUrl(false);
    }
  };

  const handleFieldChange = (field: keyof ProductDetailsInput, value: any) => {
    onDetailsChange({
      ...details,
      [field]: value
    });
  };

  const handleFileProcess = async (file: File) => {
    setUploadError(null);
    try {
      const processed = await processImageUpload(file);
      onImageSelected(processed);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process image.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const loadSample = (sampleId: string) => {
    const sample = SAMPLE_PRODUCTS.find((s) => s.id === sampleId);
    if (!sample) return;

    onDetailsChange({ ...sample.details });
    const blob = new Blob([sample.mockup.base64], { type: sample.mockup.mimeType });

    onImageSelected({
      blob,
      base64: sample.mockup.base64,
      dataUrl: sample.mockup.dataUrl,
      fileName: sample.mockup.fileName,
      mimeType: sample.mockup.mimeType,
      size: sample.mockup.size,
      width: 800,
      height: 800
    });
    setUploadError(null);
  };

  const productTypes: { value: ProductType; label: string }[] = [
    { value: 't-shirt', label: 'T-Shirt' },
    { value: 'hoodie', label: 'Hoodie' },
    { value: 'sweatshirt', label: 'Sweatshirt' },
    { value: 'mug', label: 'Ceramic Mug' },
    { value: 'drinkware', label: 'Drinkware / Tumbler' },
    { value: 'notebook', label: 'Notebook / Journal' },
    { value: 'poster', label: 'Poster / Art Print' },
    { value: 'phone-case', label: 'Phone Case' },
    { value: 'other', label: 'Other Item' }
  ];

  const modes: { value: AnalysisMode; label: string; desc: string }[] = [
    { value: 'full', label: 'Full Analysis', desc: 'Complete 360° product intelligence audit: visual analysis, recipient psychographics, positioning, guide fit, title lab, and ChatGPT brief' },
    { value: 'title', label: 'Title Laboratory', desc: 'Title Development Workspace: evaluates existing title, explores 8+ distinct editorial strategies, comparison matrix & 1-click apply' },
    { value: 'recipient', label: 'Recipient Intelligence', desc: 'Recipient Psychographics Dossier: knowledge spectrum, buyer vs recipient dynamics, mismatch warnings, and gift-buying advice' },
    { value: 'brief', label: 'Writing Brief', desc: 'ChatGPT Writing Brief Engine: 5-step reasoning, verified physical specifications, tone rules, and 1-click prompt copy' }
  ];

  const [showSampleMenu, setShowSampleMenu] = useState(false);

  return (
    <div className="bg-white border border-[#E8E4DC] rounded-xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Panel Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-[#1E3A8A] text-white flex items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner text-white shrink-0">
            <Sparkles className="w-5 h-5 text-sky-200" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-white leading-tight tracking-tight">
              Product Intelligence Studio
            </h2>
            <p className="text-xs text-blue-200/90 font-medium mt-0.5">
              High-context visual analysis & ChatGPT brief engine
            </p>
          </div>
        </div>
      </div>

      {/* Context Profiles Persistent Working Context Bar */}
      <ContextProfileBar
        profiles={profiles}
        activeProfileId={activeProfileId}
        isModified={isContextModified}
        workingContext={extractSharedContext(details)}
        onSelectProfile={onSelectProfile}
        onSaveToActiveProfile={onSaveToActiveProfile}
        onCreateProfile={onCreateProfile}
        onRenameProfile={onRenameProfile}
        onDuplicateProfile={onDuplicateProfile}
        onDeleteProfile={onDeleteProfile}
        onResetWorkingContext={onResetWorkingContext}
      />

      {/* Scrollable Form Body */}
      <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
        {/* Section 1: Product Specifics (Image, Name, Type) */}
        <div className="space-y-4 pb-5 border-b border-[#E8E4DC]">
          <div className="flex items-center justify-between relative">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1E3A8A]"></span>
              <span>Product Specifics</span>
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSampleMenu(!showSampleMenu)}
                  className="text-xs text-[#1E3A8A] hover:text-[#172554] font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Load sample...</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showSampleMenu && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#E8E4DC] rounded-lg shadow-lg z-20 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        loadSample('sample-viking-mug');
                        setShowSampleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-stone-50 font-medium text-stone-800 transition-colors"
                    >
                      Lindisfarne Viking Mug
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loadSample('sample-civil-war-tee');
                        setShowSampleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-stone-50 font-medium text-stone-800 transition-colors"
                    >
                      20th Maine Little Round Top Tee
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loadSample('sample-odyssey-notebook');
                        setShowSampleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-stone-50 font-medium text-stone-800 transition-colors"
                    >
                      Penelope's Loom Odyssey Notebook
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Mockup Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <span>Product Mockup Image</span>
                <span className="text-stone-400 font-normal lowercase">(PNG, JPEG, WebP · max 12MB)</span>
              </label>
              {imageDataUrl && (
                <button
                  type="button"
                  onClick={onImageRemoved}
                  className="text-xs text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {imageDataUrl ? (
              <div className="relative border border-[#E8E4DC] rounded-lg p-2 bg-[#FAF8F5] flex items-center gap-4">
                <div className="w-24 h-24 bg-white border border-stone-200 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    src={imageDataUrl}
                    alt="Product Mockup Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-semibold text-stone-800 truncate">{imageFileName || 'mockup_image'}</p>
                  {imageSize && (
                    <p className="text-stone-500 mt-0.5 font-mono">{(imageSize / 1024).toFixed(1)} KB</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-md transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Replace Image</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all group ${
                  dragActive
                    ? 'border-indigo-600 bg-indigo-50/80 shadow-md scale-[1.01]'
                    : 'border-indigo-200 hover:border-indigo-400 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-sky-50/50 hover:shadow-sm'
                }`}
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-bold text-stone-900 group-hover:text-indigo-900 transition-colors">
                  Drop your product mockup image here, or <span className="text-[#1E3A8A] underline decoration-indigo-300 underline-offset-2">browse files</span>
                </p>
                <p className="text-xs text-stone-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  High-resolution visual evidence source for AI visual analysis, recipient intelligence, and ChatGPT brief generation.
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileInput}
            />

            {uploadError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Working Name & Product Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12px] font-semibold text-stone-700 mb-1">
                Working product name
              </label>
              <input
                type="text"
                value={details.workingName}
                onChange={(e) => handleFieldChange('workingName', e.target.value)}
                placeholder="e.g. Lindisfarne 793 AD Chronicle Mug"
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-stone-700 mb-1">
                Product type
              </label>
              <select
                value={details.productType}
                onChange={(e) => handleFieldChange('productType', e.target.value as ProductType)}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all"
              >
                {productTypes.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Shared Guide & Recipient Context (PERSISTENT & REUSED IN BATCH) */}
        <div className="space-y-3.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E4DC] pb-2">
            <span className="text-xs font-semibold text-[#1E3A8A] flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <BookmarkCheck className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Shared Context & Recipient Intelligence</span>
            </span>
            <span className="text-[11px] font-medium text-stone-500 flex items-center gap-1 whitespace-nowrap shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Saved across products</span>
            </span>
          </div>

          {/* Gift Guide Assignment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-semibold text-stone-700">
                Assigned gift guide
              </label>
              <div className="flex items-center gap-2">
                {onOpenManageGuidesModal && (
                  <button
                    type="button"
                    onClick={onOpenManageGuidesModal}
                    className="text-xs text-stone-600 hover:text-[#1E3A8A] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    title="Manage all editorial gift guides"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                    <span>Manage guides</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenNewGuideModal}
                  className="text-xs text-[#1E3A8A] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New guide</span>
                </button>
              </div>
            </div>
            <select
              value={details.giftGuideId}
              onChange={(e) => {
                const selectedGuide = giftGuides.find((g) => g.id === e.target.value);
                onDetailsChange({
                  ...details,
                  giftGuideId: e.target.value,
                  giftGuideName: selectedGuide ? selectedGuide.name : ''
                });
              }}
              className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all"
            >
              <option value="">-- Select an Editorial Gift Guide --</option>
              {giftGuides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.name}
                </option>
              ))}
            </select>
            {details.giftGuideId && (
              <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500 px-0.5">
                <span className="truncate max-w-[240px]">
                  Assigned: <span className="font-medium text-stone-700">{details.giftGuideName}</span>
                </span>
                {onDeleteGiftGuideClick && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur = giftGuides.find((g) => g.id === details.giftGuideId);
                      if (cur) onDeleteGiftGuideClick(cur);
                    }}
                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                    title={`Delete guide "${details.giftGuideName}"`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Guide</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Audience & Recipient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12px] font-semibold text-stone-700 mb-1">
                Primary recipient profile
              </label>
              <input
                type="text"
                value={details.primaryRecipient}
                onChange={(e) => handleFieldChange('primaryRecipient', e.target.value)}
                placeholder="e.g. Serious student of Norse medieval history"
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-stone-700 mb-1">
                Audience interest / niche
              </label>
              <input
                type="text"
                value={details.audienceInterest}
                onChange={(e) => handleFieldChange('audienceInterest', e.target.value)}
                placeholder="e.g. Anglo-Saxon Chronicles, Lindisfarne monastery"
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400 transition-all"
              />
            </div>
          </div>

          {/* Secondary Recipient & Occasion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12px] font-semibold text-stone-700 mb-1">
                Secondary recipient <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={details.secondaryRecipient}
                onChange={(e) => handleFieldChange('secondaryRecipient', e.target.value)}
                placeholder="e.g. Medieval re-enactor or history podcast listener"
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-stone-700 mb-1">
                Gifting occasion <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={details.occasion}
                onChange={(e) => handleFieldChange('occasion', e.target.value)}
                placeholder="e.g. Milestone birthday, graduation, holiday"
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400 transition-all"
              />
            </div>
          </div>

          {/* Initial Positioning Idea */}
          <div>
            <label className="block text-[12px] font-semibold text-stone-700 mb-1">
              Initial positioning / editorial direction <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={details.initialPositioningIdea}
              onChange={(e) => handleFieldChange('initialPositioningIdea', e.target.value)}
              placeholder="What angle or insight inspired this collection or product? (e.g. An insider handshake for real history nerds who wince at cartoon Vikings)."
              className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400 transition-all"
            />
          </div>
        </div>

        {/* Collapsible Advanced Context Fields */}
        <div className="border-t border-[#E8E4DC] pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            <span>{showAdvanced ? 'Hide advanced context' : 'Show advanced context (specs, URLs, design references)'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3.5 pl-1">
              <div>
                <label className="block text-[12px] font-medium text-stone-600 mb-1">
                  Product specifications & materials
                </label>
                <input
                  type="text"
                  value={details.productSpecs}
                  onChange={(e) => handleFieldChange('productSpecs', e.target.value)}
                  placeholder="e.g. 15oz black ceramic mug, dishwasher safe, matte ink print"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-stone-600 mb-1">
                  Known design references & historical provenance
                </label>
                <input
                  type="text"
                  value={details.knownDesignReferences}
                  onChange={(e) => handleFieldChange('knownDesignReferences', e.target.value)}
                  placeholder="e.g. Anglo-Saxon Chronicle Cotton Tiberius MS, Urnes style knotwork"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[12px] font-medium text-stone-600">
                    Existing product URL
                  </label>
                  {details.productUrl && details.productUrl.trim() && (
                    <button
                      type="button"
                      onClick={handleExtractUrlFacts}
                      disabled={isExtractingUrl}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {isExtractingUrl ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Extracting Specs...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Fetch & Extract Specs</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={details.productUrl}
                  onChange={(e) => handleFieldChange('productUrl', e.target.value)}
                  placeholder="https://shop.scienceofgifts.com/products/super-history-teacher-hoodie"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400"
                />
                {extractError && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{extractError}</span>
                  </p>
                )}
              </div>

              {/* Extracted Product Facts Review Card */}
              {details.extractedFacts && (
                <div className="p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-xl space-y-2.5 text-xs text-stone-700">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <div className="flex items-center gap-1.5">
                      <BookmarkCheck className="w-4 h-4 text-[#1E3A8A]" />
                      <span className="font-bold text-stone-900 text-xs">
                        Retrieved Product Specifications & Provenance
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-[#1E3A8A] font-semibold">
                      {details.extractedFacts.retrievalStatus === 'success' ? 'Source Stated' : 'Partial'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {[
                      { key: 'fabricComposition', label: 'Fabric Composition' },
                      { key: 'fabricWeight', label: 'Fabric Weight' },
                      { key: 'fit', label: 'Fit' },
                      { key: 'hoodConstruction', label: 'Hood Construction' },
                      { key: 'pocketType', label: 'Pocket Style' },
                      { key: 'sizeRange', label: 'Size Range' },
                      { key: 'color', label: 'Colorway' },
                      { key: 'price', label: 'Price' }
                    ].map(({ key, label }) => {
                      const item = (details.extractedFacts as any)[key];
                      const valueStr = item?.value || '';
                      const provenanceStr = item?.provenance || 'unknown';

                      return (
                        <div key={key} className="bg-white p-2 border border-blue-100 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-stone-800 text-[11px]">{label}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                                provenanceStr === 'source-stated'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : provenanceStr === 'user-provided'
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {provenanceStr.replace('-', ' ')}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={valueStr}
                            onChange={(e) => {
                              const newFacts = {
                                retrievalStatus: details.extractedFacts?.retrievalStatus || 'success',
                                ...details.extractedFacts,
                                [key]: {
                                  id: key,
                                  label,
                                  value: e.target.value,
                                  provenance: 'user-provided',
                                  sourceRef: 'Manually edited by user',
                                  originalSourceValue: item?.value !== e.target.value ? item?.value : undefined
                                }
                              };
                              onDetailsChange({
                                ...details,
                                extractedFacts: newFacts
                              });
                            }}
                            placeholder="Unstated"
                            className="w-full px-2 py-1 text-[11px] bg-[#FAF8F5] border border-stone-200 rounded text-stone-800 focus:bg-white focus:outline-none focus:border-[#1E3A8A]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-medium text-stone-600 mb-1">
                  Current title in shop
                </label>
                <input
                  type="text"
                  value={details.currentTitle}
                  onChange={(e) => handleFieldChange('currentTitle', e.target.value)}
                  placeholder="e.g. Lindisfarne 793 Mug"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-stone-600 mb-1">
                  Specific questions or strategic concerns
                </label>
                <input
                  type="text"
                  value={details.specificQuestions}
                  onChange={(e) => handleFieldChange('specificQuestions', e.target.value)}
                  placeholder="e.g. Is this too dark/somber for a general gift guide entry?"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E8E4DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] placeholder:text-stone-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section C: Analysis Mode Selector */}
        <div className="border-t border-[#E8E4DC] pt-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
            Analysis Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {modes.map((m) => (
              <label
                key={m.value}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                  mode === m.value
                    ? 'border-[#1E3A8A] bg-blue-50/40 text-[#1E3A8A]'
                    : 'border-[#E8E4DC] hover:border-stone-300 text-stone-700'
                }`}
              >
                <input
                  type="radio"
                  name="analysisMode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => onModeChange(m.value)}
                  className="mt-1 text-[#1E3A8A] focus:ring-[#1E3A8A]"
                />
                <div>
                  <span className="block text-xs font-bold leading-tight">{m.label}</span>
                  <span className="block text-[11px] text-stone-500 mt-0.5 leading-snug">{m.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Incomplete info reassurance banner */}
        <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-md text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold">Editorial Integrity Policy:</span> Empty or omitted fields are not forced. Incomplete information will be explicitly flagged in the analytical report as unverified facts rather than blocking your workflow.
          </p>
        </div>
      </div>

      {/* Action Toolbar Footer */}
      <div className="p-4 border-t border-[#E8E4DC] bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onSaveDraft}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:border-stone-300 hover:bg-stone-50 rounded-md transition-colors shrink-0"
          >
            <Save className="w-3.5 h-3.5 text-stone-500" />
            <span>Save Draft</span>
          </button>

          {/* Functional Interactive Model Selector */}
          {selectedModel && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:border-stone-300 hover:bg-stone-50 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-[#1E3A8A] cursor-pointer whitespace-nowrap shrink-0"
                title="Configured engine for analysis"
              >
                <Cpu className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                <span className="font-semibold text-stone-800 text-xs">
                  {getModelDefinition(selectedModel).name}
                </span>
                <ChevronUp className={`w-3 h-3 text-stone-400 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} />
              </button>

              {showModelMenu && (
                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-[#E8E4DC] rounded-xl shadow-xl z-40 p-1.5 text-xs space-y-0.5 animate-in fade-in duration-100">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-1">
                    Select Gemini Engine
                  </div>
                  {SUPPORTED_MODELS.map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (onModelChange) {
                            onModelChange(m.id);
                          }
                          setShowModelMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 text-[#1E3A8A] font-semibold'
                            : 'text-stone-700 hover:bg-stone-50 font-medium'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-xs font-bold text-stone-900 leading-tight">{m.name}</div>
                          <div className="text-[10px] text-stone-500 font-normal truncate mt-0.5">{m.description}</div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-60 rounded-md shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing with Gemini...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Run {mode === 'full' ? 'Full Analysis' : 'Mode Analysis'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
