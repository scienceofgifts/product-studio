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
  ExternalLink,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Layers,
  FileCheck2
} from 'lucide-react';
import { ProductDetailsInput, ProductType, GiftGuide, ContextProfile, SharedWorkingContext } from '../../types';
import { UploadedImageItem } from '../../types/workflow';
import { processImageUpload } from '../../utils/imageUtils';
import { ContextProfileBar } from '../workspace/ContextProfileBar';
import { extractSharedContext } from '../../utils/contextUtils';
import { SUPPORTED_MODELS } from '../../config/models';

interface Step1ProductInputProps {
  details: ProductDetailsInput;
  onDetailsChange: (details: ProductDetailsInput) => void;
  images: UploadedImageItem[];
  onAddImage: (img: UploadedImageItem) => void;
  onRemoveImage: (id: string) => void;
  onClearImages: () => void;
  onAnalyze: () => void;
  onSaveDraft: () => void;
  isAnalyzing: boolean;
  giftGuides: GiftGuide[];
  onOpenNewGuideModal: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  profiles: ContextProfile[];
  activeProfileId: string | null;
  isContextModified: boolean;
  onSelectProfile: (profileId: string | null) => void;
  onSaveToActiveProfile: (contextToSave?: SharedWorkingContext) => Promise<void>;
  onCreateProfile: (name: string, description: string, contextToSave?: SharedWorkingContext) => Promise<void>;
  onRenameProfile: (id: string, newName: string, newDescription?: string) => Promise<void>;
  onDuplicateProfile: (id: string) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onResetWorkingContext: () => void;
}

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'mug', label: 'Ceramic Mug (11oz / 15oz)' },
  { value: 'drinkware', label: 'Tumbler / Travel Drinkware' },
  { value: 't-shirt', label: 'Classic Crewneck T-Shirt' },
  { value: 'hoodie', label: 'Pullover Hoodie' },
  { value: 'sweatshirt', label: 'Crewneck Sweatshirt' },
  { value: 'notebook', label: 'Journal / Hardcover Notebook' },
  { value: 'poster', label: 'Archival Art Poster / Print' },
  { value: 'phone-case', label: 'Tough Phone Case' },
  { value: 'other', label: 'Other Gift Item' }
];

export const Step1ProductInput: React.FC<Step1ProductInputProps> = ({
  details,
  onDetailsChange,
  images,
  onAddImage,
  onRemoveImage,
  onClearImages,
  onAnalyze,
  onSaveDraft,
  isAnalyzing,
  giftGuides,
  onOpenNewGuideModal,
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
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof ProductDetailsInput, value: any) => {
    onDetailsChange({
      ...details,
      [field]: value
    });
  };

  const handleFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const processed = await processImageUpload(file);
        const item: UploadedImageItem = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          blob: processed.blob,
          base64: processed.base64,
          dataUrl: processed.dataUrl,
          fileName: processed.fileName,
          mimeType: processed.mimeType,
          size: processed.size,
          width: processed.width,
          height: processed.height
        };
        onAddImage(item);
      } catch (err: any) {
        setUploadError(err.message || `Failed to process ${file.name}`);
      }
    }
  };

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
        const cleanMsg = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
        throw new Error(`Server returned status ${response.status}${cleanMsg ? `: ${cleanMsg}` : ''}`);
      }

      if (!response.ok) {
        throw new Error(resJson?.error || `HTTP ${response.status}`);
      }

      if (!resJson || !resJson.success || !resJson.facts) {
        throw new Error(resJson?.error || 'Failed to extract facts from URL.');
      }

      const facts = resJson.facts;
      // Preserve existing manual inputs, only populate if empty
      const updatedDetails: ProductDetailsInput = {
        ...details,
        extractedFacts: facts,
        workingName: details.workingName || facts.rawExtractedTitle || details.workingName,
        currentTitle: details.currentTitle || facts.rawExtractedTitle || details.currentTitle,
        currentDescription: details.currentDescription || facts.rawExtractedDescription || details.currentDescription
      };

      onDetailsChange(updatedDetails);
    } catch (err: any) {
      setExtractError(err.message || 'URL extraction failed');
    } finally {
      setIsExtractingUrl(false);
    }
  };

  const canAnalyze = images.length > 0 || (details.workingName.trim().length > 0 && details.primaryRecipient.trim().length > 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Context Profile Bar for saving/loading guide & recipient presets */}
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

      <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
        {/* Step Header */}
        <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="font-serif font-bold text-lg text-stone-900">
                Product Input & Source Materials
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Upload product mockups, optionally extract product page facts, and supply recipient context.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-500 font-medium">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded px-2.5 py-1 text-stone-800 font-medium shadow-2xs focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
            >
              {SUPPORTED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 1. Image Upload Section (Single or Multiple) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#1E3A8A]" />
                Product Mockup Images
                <span className="text-stone-400 font-normal lowercase">(upload one or multiple)</span>
              </label>
              {images.length > 0 && (
                <button
                  type="button"
                  onClick={onClearImages}
                  className="text-[11px] text-red-600 hover:text-red-800 font-medium flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove all ({images.length})
                </button>
              )}
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFilesUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-[#1E3A8A] bg-blue-50/50'
                  : 'border-stone-300 hover:border-[#1E3A8A] hover:bg-stone-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFilesUpload(e.target.files)}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                  <Upload className="w-6 h-6 text-[#1E3A8A]" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-stone-800">
                    Click to browse or drag & drop product images
                  </span>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Supports PNG, JPEG, WebP up to 12MB each. Upload multiple angles, packaging, or detail shots.
                  </p>
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative rounded-lg overflow-hidden border border-stone-200 bg-stone-50 shadow-2xs aspect-square flex flex-col justify-end"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.fileName}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage(img.id);
                        }}
                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="relative bg-stone-900/70 backdrop-blur-2xs px-1.5 py-1 text-[10px] text-white truncate font-mono">
                      #{idx + 1} {img.fileName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Optional Product URL Extraction */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Product Page URL <span className="text-stone-400 font-normal lowercase">(optional)</span>
              </label>
              {details.extractedFacts && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <FileCheck2 className="w-3 h-3" /> Facts Extracted
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={details.productUrl}
                onChange={(e) => handleFieldChange('productUrl', e.target.value)}
                placeholder="https://shop.scienceofgifts.com/products/viking-compass-mug"
                className="flex-1 text-xs border border-stone-300 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-hidden transition-colors"
              />
              <button
                type="button"
                onClick={handleExtractUrlFacts}
                disabled={isExtractingUrl || !details.productUrl?.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-stone-800 hover:bg-stone-900 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {isExtractingUrl ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Extract Details</span>
                  </>
                )}
              </button>
            </div>

            {extractError && (
              <p className="text-[11px] text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{extractError}</span>
              </p>
            )}

            {details.extractedFacts && (
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-700 space-y-1">
                <div className="font-semibold text-stone-900 flex items-center justify-between">
                  <span>Extracted Product Fact Metadata</span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {details.extractedFacts.retrievedAt ? new Date(details.extractedFacts.retrievedAt).toLocaleTimeString() : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-stone-600 pt-1">
                  {details.extractedFacts.rawExtractedTitle && (
                    <p><span className="font-medium text-stone-800">Source Title:</span> {details.extractedFacts.rawExtractedTitle}</p>
                  )}
                  {details.extractedFacts.price?.value && (
                    <p><span className="font-medium text-stone-800">Price Range:</span> {details.extractedFacts.price.value}</p>
                  )}
                  {details.extractedFacts.fabricComposition?.value && (
                    <p><span className="font-medium text-stone-800">Material:</span> {details.extractedFacts.fabricComposition.value}</p>
                  )}
                  {details.extractedFacts.fabricWeight?.value && (
                    <p><span className="font-medium text-stone-800">Fabric Weight:</span> {details.extractedFacts.fabricWeight.value}</p>
                  )}
                  {details.extractedFacts.fit?.value && (
                    <p><span className="font-medium text-stone-800">Fit:</span> {details.extractedFacts.fit.value}</p>
                  )}
                  {details.extractedFacts.sizeRange?.value && (
                    <p><span className="font-medium text-stone-800">Sizes:</span> {details.extractedFacts.sizeRange.value}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Core Product & Editorial Context Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
            {/* Working Name */}
            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1">
                Working Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={details.workingName}
                onChange={(e) => handleFieldChange('workingName', e.target.value)}
                placeholder="e.g. Vegvisir Viking Compass 15oz Mug"
                className="w-full text-xs border border-stone-300 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-hidden transition-colors font-medium text-stone-900"
              />
            </div>

            {/* Product Type */}
            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1">
                Product Format / Type <span className="text-red-500">*</span>
              </label>
              <select
                value={details.productType}
                onChange={(e) => handleFieldChange('productType', e.target.value as ProductType)}
                className="w-full text-xs border border-stone-300 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-hidden transition-colors"
              >
                {PRODUCT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Gift Guide Assignment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-800">
                  Target Gift Guide
                </label>
                <button
                  type="button"
                  onClick={onOpenNewGuideModal}
                  className="text-[11px] text-[#1E3A8A] hover:underline font-semibold flex items-center gap-0.5"
                >
                  <PlusCircle className="w-3 h-3" /> New Guide
                </button>
              </div>
              <select
                value={details.giftGuideId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const targetGuide = giftGuides.find((g) => g.id === selectedId);
                  onDetailsChange({
                    ...details,
                    giftGuideId: selectedId,
                    giftGuideName: targetGuide ? targetGuide.name : ''
                  });
                }}
                className="w-full text-xs border border-stone-300 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-hidden transition-colors"
              >
                <option value="">-- Standalone Product (No Guide Assigned) --</option>
                {giftGuides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.name} ({guide.niche || 'General'})
                  </option>
                ))}
              </select>
            </div>

            {/* Primary Recipient Persona */}
            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1">
                Primary Intended Recipient <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={details.primaryRecipient}
                onChange={(e) => handleFieldChange('primaryRecipient', e.target.value)}
                placeholder="e.g. Norse history buff, Viking re-enactor, medievalist"
                className="w-full text-xs border border-stone-300 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-hidden transition-colors"
              />
            </div>

            {/* Secondary Recipient */}
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">
                Secondary Recipient / Adjoining Audience
              </label>
              <input
                type="text"
                value={details.secondaryRecipient}
                onChange={(e) => handleFieldChange('secondaryRecipient', e.target.value)}
                placeholder="e.g. Fantasy tabletop RPG game master, Scandinavian heritage admirer"
                className="w-full text-xs border border-stone-300 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-hidden transition-colors"
              />
            </div>

            {/* Audience Interest / Niche */}
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">
                Audience Passion / Niche Theme
              </label>
              <input
                type="text"
                value={details.audienceInterest}
                onChange={(e) => handleFieldChange('audienceInterest', e.target.value)}
                placeholder="e.g. Icelandic sagas, Nordic folklore, historical symbolism"
                className="w-full text-xs border border-stone-300 rounded-lg px-3 py-2 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-hidden transition-colors"
              />
            </div>
          </div>

          {/* 4. Advanced / Optional Details Toggle */}
          <div className="pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center justify-between w-full text-xs font-semibold text-stone-700 hover:text-stone-900 py-1"
            >
              <span>Additional Specifications, Known References & Merchant Notes</span>
              {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isAdvancedOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-dashed border-stone-200 animate-in fade-in">
                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">
                    Known Design References / Metaphors
                  </label>
                  <textarea
                    rows={2}
                    value={details.knownDesignReferences}
                    onChange={(e) => handleFieldChange('knownDesignReferences', e.target.value)}
                    placeholder="e.g. Huld Manuscript stave, 1860 Huld manuscript folios, Icelandic magical staves"
                    className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">
                    Confirmed Physical Specifications
                  </label>
                  <textarea
                    rows={2}
                    value={details.productSpecs}
                    onChange={(e) => handleFieldChange('productSpecs', e.target.value)}
                    placeholder="e.g. 15oz glossy ceramic, microwave & dishwasher safe, lead-free"
                    className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">
                    Initial Positioning Idea / Angle
                  </label>
                  <textarea
                    rows={2}
                    value={details.initialPositioningIdea}
                    onChange={(e) => handleFieldChange('initialPositioningIdea', e.target.value)}
                    placeholder="e.g. A gift for someone embarking on a major life transition, offering symbolic wayfinding."
                    className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">
                    Specific Questions or Concerns to Evaluate
                  </label>
                  <textarea
                    rows={2}
                    value={details.specificQuestions}
                    onChange={(e) => handleFieldChange('specificQuestions', e.target.value)}
                    placeholder="e.g. Is the stave authentic to the Viking age or 19th-century folk magic?"
                    className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-[#1E3A8A] outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className={`w-2 h-2 rounded-full ${canAnalyze ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <span>
              {canAnalyze
                ? 'Ready for structured intelligence analysis'
                : 'Upload an image or provide a working title + primary recipient to begin'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onSaveDraft}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors shadow-2xs"
            >
              <Save className="w-3.5 h-3.5 text-stone-500" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing || !canAnalyze}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Product...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Analyze Product &rarr;</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
