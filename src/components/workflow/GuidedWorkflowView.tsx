/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  WorkflowStep,
  WorkflowState,
  UploadedImageItem,
  EditorialSelections,
  CopyConfiguration,
  DEFAULT_COPY_CONFIG,
  DEFAULT_EDITORIAL_SELECTIONS
} from '../../types/workflow';
import {
  ProductRecord,
  ProductDetailsInput,
  StructuredAnalysisResult,
  GiftGuide,
  ContextProfile,
  SharedWorkingContext
} from '../../types';
import { Step1ProductInput } from './Step1ProductInput';
import { Step2AnalysisFindings } from './Step2AnalysisFindings';
import { Step3EditorialDecisions } from './Step3EditorialDecisions';
import { Step4CopyConfiguration } from './Step4CopyConfiguration';
import { Step5EditorialBrief } from './Step5EditorialBrief';
import { Step6WritingPrompt } from './Step6WritingPrompt';
import {
  synthesizeEditorialBrief,
  formatPromptForChatGPT,
  formatPromptForClaude
} from '../../utils/briefGenerator';
import { findRelevantCatalogueMatches } from '../../services/similarityEngine';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Check
} from 'lucide-react';

interface GuidedWorkflowViewProps {
  currentProduct: ProductRecord | null;
  details: ProductDetailsInput;
  onDetailsChange: (details: ProductDetailsInput) => void;
  onSaveProduct: (record: ProductRecord) => Promise<void>;
  catalogueProducts: ProductRecord[];
  giftGuides: GiftGuide[];
  onOpenNewGuideModal: () => void;
  editorialRules: string;
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
  onNewProduct: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const STEP_LABELS: { step: WorkflowStep; label: string; desc: string }[] = [
  { step: 1, label: 'Product Input', desc: 'Images & Sources' },
  { step: 2, label: 'Analysis', desc: 'Observations & Inferences' },
  { step: 3, label: 'Decisions', desc: 'Direction & Recipient' },
  { step: 4, label: 'Configuration', desc: 'Voice, Length & Sections' },
  { step: 5, label: 'Editorial Brief', desc: 'Synthesized Brief' },
  { step: 6, label: 'Writing Prompt', desc: 'ChatGPT / Claude' }
];

export const GuidedWorkflowView: React.FC<GuidedWorkflowViewProps> = ({
  currentProduct,
  details,
  onDetailsChange,
  onSaveProduct,
  catalogueProducts,
  giftGuides,
  onOpenNewGuideModal,
  editorialRules,
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
  onResetWorkingContext,
  onNewProduct,
  showToast
}) => {
  // Initialize Workflow State
  const [workflowState, setWorkflowState] = useState<WorkflowState>(() => {
    if (currentProduct?.workflowState) {
      return currentProduct.workflowState;
    }

    const initialImages: UploadedImageItem[] = [];
    if (currentProduct?.imageBlob && currentProduct.imageDataUrl) {
      initialImages.push({
        id: 'primary_img',
        blob: currentProduct.imageBlob,
        base64: '',
        dataUrl: currentProduct.imageDataUrl,
        fileName: currentProduct.imageFileName || 'mockup.png',
        mimeType: currentProduct.imageMimeType || 'image/png',
        size: currentProduct.imageSize || 0
      });
    }
    if (currentProduct?.additionalImages && Array.isArray(currentProduct.additionalImages)) {
      initialImages.push(...currentProduct.additionalImages);
    }

    const hasAnalysis = Boolean(currentProduct?.analysisResult);
    return {
      currentStep: hasAnalysis ? 2 : 1,
      highestStepReached: hasAnalysis ? 2 : 1,
      images: initialImages,
      details: currentProduct?.details || details,
      analysisResult: currentProduct?.analysisResult || null,
      editorialSelections: DEFAULT_EDITORIAL_SELECTIONS,
      copyConfig: DEFAULT_COPY_CONFIG,
      editorialBriefMarkdown: '',
      generatedPrompt: '',
      selectedPromptModel: 'chatgpt',
      isBriefStale: false,
      isPromptStale: false
    };
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Sync details from parent when changed externally (e.g. profile selected, reset, or new product)
  useEffect(() => {
    setWorkflowState((prev) => {
      if (prev.details === details) return prev;
      return {
        ...prev,
        details
      };
    });
  }, [details]);

  // Sync state if a different product is loaded from the library
  useEffect(() => {
    if (currentProduct) {
      if (currentProduct.workflowState) {
        setWorkflowState(currentProduct.workflowState);
      } else {
        const initialImages: UploadedImageItem[] = [];
        if (currentProduct.imageBlob && currentProduct.imageDataUrl) {
          initialImages.push({
            id: 'primary_img',
            blob: currentProduct.imageBlob,
            base64: '',
            dataUrl: currentProduct.imageDataUrl,
            fileName: currentProduct.imageFileName || 'mockup.png',
            mimeType: currentProduct.imageMimeType || 'image/png',
            size: currentProduct.imageSize || 0
          });
        }
        if (currentProduct.additionalImages) {
          initialImages.push(...currentProduct.additionalImages);
        }

        const hasAnalysis = Boolean(currentProduct.analysisResult);
        setWorkflowState((prev) => ({
          ...prev,
          currentStep: hasAnalysis ? 2 : 1,
          highestStepReached: hasAnalysis ? 2 : 1,
          images: initialImages,
          details: currentProduct.details,
          analysisResult: currentProduct.analysisResult || null
        }));
      }
    }
  }, [currentProduct?.id]);

  // Navigate to step with validation
  const goToStep = (step: WorkflowStep) => {
    if (step <= workflowState.highestStepReached || step === workflowState.currentStep + 1) {
      setWorkflowState((prev) => ({
        ...prev,
        currentStep: step,
        highestStepReached: Math.max(prev.highestStepReached, step) as WorkflowStep
      }));
    }
  };

  // Step 1: Manage Images
  const handleAddImage = (img: UploadedImageItem) => {
    setWorkflowState((prev) => ({
      ...prev,
      images: [...prev.images, img]
    }));
  };

  const handleRemoveImage = (id: string) => {
    setWorkflowState((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== id)
    }));
  };

  const handleClearImages = () => {
    setWorkflowState((prev) => ({
      ...prev,
      images: []
    }));
  };

  // Step 1: Details Change
  const handleDetailsChange = (newDetails: ProductDetailsInput) => {
    setWorkflowState((prev) => ({
      ...prev,
      details: newDetails
    }));
    onDetailsChange(newDetails);
  };

  // Run Analysis (Step 1 -> Step 2)
  const handleRunAnalysis = async () => {
    if (workflowState.images.length === 0 && !workflowState.details.workingName && !workflowState.details.primaryRecipient) {
      setAnalysisError('Please upload at least one image or provide a working product name + primary recipient.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Find candidate matches from catalogue
      const tempRecord: ProductRecord = {
        id: currentProduct?.id || 'temp_record',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        details: workflowState.details,
        imageFileName: workflowState.images[0]?.fileName || '',
        imageMimeType: workflowState.images[0]?.mimeType || 'image/png',
        imageSize: workflowState.images[0]?.size || 0,
        mode: 'full',
        status: 'draft'
      };

      const matches = findRelevantCatalogueMatches(tempRecord, catalogueProducts, new Map());
      const relevantCatalogueEntries = matches.slice(0, 4).map((m) => {
        const pB = catalogueProducts.find((p) => p.id === m.productBId);
        return {
          name: m.productBName,
          productType: m.productBFormat,
          giftGuideName: m.productBGuide,
          primaryRecipient: pB?.details.primaryRecipient || 'Unspecified',
          keyAppeal: pB?.details.initialPositioningIdea || 'None',
          similarityNote: `${m.categoryLabel} (${m.heuristicScore}/100 overlap)`
        };
      });

      // Prepare images payload
      const imagesPayload = workflowState.images.map((img) => ({
        imageBase64: img.base64 || img.dataUrl.replace(/^data:[^;]+;base64,/, '').trim(),
        imageMimeType: img.mimeType
      }));

      const primaryBase64 = imagesPayload[0]?.imageBase64;
      const primaryMime = imagesPayload[0]?.imageMimeType;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: primaryBase64,
          imageMimeType: primaryMime,
          images: imagesPayload,
          details: workflowState.details,
          relevantCatalogueEntries,
          mode: 'full',
          editorialRules,
          modelName: selectedModel,
          extractedFacts: workflowState.details.extractedFacts
        })
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
        throw new Error(resJson?.error || `Server error (HTTP ${response.status})`);
      }

      if (!resJson || !resJson.success || !resJson.result) {
        throw new Error(resJson?.error || 'Failed to extract structured analysis.');
      }

      const result: StructuredAnalysisResult = resJson.result;

      // Seed initial editorial selections from analysis result
      const initialSelections: EditorialSelections = {
        selectedInterpretations: result.productPositioning?.distinctiveEssence
          ? [result.productPositioning.distinctiveEssence]
          : [],
        customInterpretation: '',
        selectedAngles: result.productPositioning?.positioningAngles?.[0]
          ? [result.productPositioning.positioningAngles[0].angleName]
          : [],
        customAngle: '',
        selectedRecipients: workflowState.details.primaryRecipient
          ? [workflowState.details.primaryRecipient]
          : result.recipientIntelligence?.primaryRecipientProfile
          ? [result.recipientIntelligence.primaryRecipientProfile]
          : [],
        customRecipient: '',
        selectedTitle: result.titleLaboratory?.recommendedTitle || workflowState.details.workingName || '',
        customTitle: ''
      };

      const nextState: WorkflowState = {
        ...workflowState,
        currentStep: 2,
        highestStepReached: Math.max(workflowState.highestStepReached, 2) as WorkflowStep,
        analysisResult: result,
        editorialSelections: initialSelections,
        isBriefStale: true,
        isPromptStale: true
      };

      setWorkflowState(nextState);
      showToast('Analysis completed successfully');

      // Auto-save progress
      await handleSaveRecord(nextState);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(err.message || 'An unexpected error occurred during analysis.');
      showToast(err.message || 'Analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 3: Handle Editorial Selections
  const handleSelectionsChange = (newSelections: EditorialSelections) => {
    setWorkflowState((prev) => ({
      ...prev,
      editorialSelections: newSelections,
      isBriefStale: true,
      isPromptStale: true
    }));
  };

  // Step 4: Handle Copy Configuration
  const handleConfigChange = (newConfig: CopyConfiguration) => {
    setWorkflowState((prev) => ({
      ...prev,
      copyConfig: newConfig,
      isBriefStale: true,
      isPromptStale: true
    }));
  };

  // Step 5: Explicitly Generate Editorial Brief
  const handleGenerateBrief = () => {
    setIsGeneratingBrief(true);
    try {
      const brief = synthesizeEditorialBrief(workflowState, editorialRules);
      const nextPrompt = workflowState.selectedPromptModel === 'chatgpt'
        ? formatPromptForChatGPT(brief, editorialRules)
        : formatPromptForClaude(brief, editorialRules);

      const nextState: WorkflowState = {
        ...workflowState,
        editorialBriefMarkdown: brief,
        generatedPrompt: nextPrompt,
        isBriefStale: false,
        isPromptStale: false,
        highestStepReached: Math.max(workflowState.highestStepReached, 5) as WorkflowStep
      };

      setWorkflowState(nextState);
      showToast('Editorial Brief generated');
      handleSaveRecord(nextState);
    } catch (e: any) {
      showToast(`Failed to generate brief: ${e.message}`, 'error');
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  // Step 5: Brief Change
  const handleBriefChange = (updatedBrief: string) => {
    const nextPrompt = workflowState.selectedPromptModel === 'chatgpt'
      ? formatPromptForChatGPT(updatedBrief, editorialRules)
      : formatPromptForClaude(updatedBrief, editorialRules);

    setWorkflowState((prev) => ({
      ...prev,
      editorialBriefMarkdown: updatedBrief,
      generatedPrompt: nextPrompt,
      isPromptStale: false
    }));
  };

  // Step 6: Model Select & Prompt Regeneration
  const handleModelSelect = (model: 'chatgpt' | 'claude') => {
    if (!workflowState.editorialBriefMarkdown) return;
    const prompt = model === 'chatgpt'
      ? formatPromptForChatGPT(workflowState.editorialBriefMarkdown, editorialRules)
      : formatPromptForClaude(workflowState.editorialBriefMarkdown, editorialRules);

    setWorkflowState((prev) => ({
      ...prev,
      selectedPromptModel: model,
      generatedPrompt: prompt
    }));
  };

  const handleRegeneratePrompt = () => {
    if (!workflowState.editorialBriefMarkdown) return;
    const prompt = workflowState.selectedPromptModel === 'chatgpt'
      ? formatPromptForChatGPT(workflowState.editorialBriefMarkdown, editorialRules)
      : formatPromptForClaude(workflowState.editorialBriefMarkdown, editorialRules);

    setWorkflowState((prev) => ({
      ...prev,
      generatedPrompt: prompt
    }));
    showToast('Reset prompt to approved brief');
  };

  const handlePromptChange = (prompt: string) => {
    setWorkflowState((prev) => ({
      ...prev,
      generatedPrompt: prompt
    }));
  };

  // Save full record to IndexedDB
  const handleSaveRecord = async (stateToSave?: WorkflowState) => {
    const s = stateToSave || workflowState;
    const id = currentProduct?.id || 'prod_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    const primaryImg = s.images[0];

    const record: ProductRecord = {
      id,
      createdAt: currentProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      details: s.details,
      contextProfileId: activeProfileId || undefined,
      contextProfileName: profiles.find((p) => p.id === activeProfileId)?.name || undefined,
      imageBlob: primaryImg?.blob || currentProduct?.imageBlob,
      imageDataUrl: primaryImg?.dataUrl || currentProduct?.imageDataUrl,
      imageFileName: primaryImg?.fileName || currentProduct?.imageFileName || 'mockup.png',
      imageMimeType: primaryImg?.mimeType || currentProduct?.imageMimeType || 'image/png',
      imageSize: primaryImg?.size || currentProduct?.imageSize || 0,
      mode: 'full',
      status: s.analysisResult ? 'completed' : 'draft',
      analysisResult: s.analysisResult || undefined,
      additionalImages: s.images.slice(1),
      workflowState: s
    };

    await onSaveProduct(record);
  };

  return (
    <div className="space-y-6">
      {/* Top 6-Step Workflow Navigation Indicator */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {STEP_LABELS.map((item, idx) => {
            const isCurrent = workflowState.currentStep === item.step;
            const isCompleted = workflowState.highestStepReached > item.step;
            const isAccessible = item.step <= workflowState.highestStepReached;

            return (
              <React.Fragment key={item.step}>
                <button
                  type="button"
                  onClick={() => goToStep(item.step)}
                  disabled={!isAccessible}
                  className={`flex items-center gap-2.5 text-left transition-all p-1.5 rounded-lg ${
                    isCurrent
                      ? 'bg-blue-50/80 ring-1 ring-[#1E3A8A]'
                      : isAccessible
                      ? 'hover:bg-stone-50 cursor-pointer'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-[#1E3A8A] text-white shadow-2xs'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.step}
                  </div>
                  <div>
                    <span
                      className={`text-xs block font-bold leading-tight ${
                        isCurrent
                          ? 'text-[#1E3A8A]'
                          : isCompleted
                          ? 'text-stone-900'
                          : 'text-stone-500'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] text-stone-400 block leading-tight">
                      {item.desc}
                    </span>
                  </div>
                </button>

                {idx < STEP_LABELS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      workflowState.highestStepReached > item.step ? 'bg-emerald-500' : 'bg-stone-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Global Analysis Error Banner */}
      {analysisError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Analysis Engine Error</span>
            <p className="mt-0.5 leading-relaxed">{analysisError}</p>
          </div>
        </div>
      )}

      {/* Step Views */}
      {workflowState.currentStep === 1 && (
        <Step1ProductInput
          details={workflowState.details}
          onDetailsChange={handleDetailsChange}
          images={workflowState.images}
          onAddImage={handleAddImage}
          onRemoveImage={handleRemoveImage}
          onClearImages={handleClearImages}
          onAnalyze={handleRunAnalysis}
          onSaveDraft={() => handleSaveRecord()}
          isAnalyzing={isAnalyzing}
          giftGuides={giftGuides}
          onOpenNewGuideModal={onOpenNewGuideModal}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          profiles={profiles}
          activeProfileId={activeProfileId}
          isContextModified={isContextModified}
          onSelectProfile={onSelectProfile}
          onSaveToActiveProfile={onSaveToActiveProfile}
          onCreateProfile={onCreateProfile}
          onRenameProfile={onRenameProfile}
          onDuplicateProfile={onDuplicateProfile}
          onDeleteProfile={onDeleteProfile}
          onResetWorkingContext={onResetWorkingContext}
        />
      )}

      {workflowState.currentStep === 2 && (
        <Step2AnalysisFindings
          details={workflowState.details}
          analysis={workflowState.analysisResult}
          images={workflowState.images}
          onBack={() => goToStep(1)}
          onNext={() => goToStep(3)}
        />
      )}

      {workflowState.currentStep === 3 && (
        <Step3EditorialDecisions
          details={workflowState.details}
          analysis={workflowState.analysisResult}
          selections={workflowState.editorialSelections}
          onSelectionsChange={handleSelectionsChange}
          onBack={() => goToStep(2)}
          onNext={() => goToStep(4)}
        />
      )}

      {workflowState.currentStep === 4 && (
        <Step4CopyConfiguration
          details={workflowState.details}
          config={workflowState.copyConfig}
          onConfigChange={handleConfigChange}
          onBack={() => goToStep(3)}
          onNext={() => goToStep(5)}
        />
      )}

      {workflowState.currentStep === 5 && (
        <Step5EditorialBrief
          state={workflowState}
          onBriefChange={handleBriefChange}
          onGenerateBrief={handleGenerateBrief}
          isGeneratingBrief={isGeneratingBrief}
          onBack={() => goToStep(4)}
          onNext={() => goToStep(6)}
        />
      )}

      {workflowState.currentStep === 6 && (
        <Step6WritingPrompt
          state={workflowState}
          onModelSelect={handleModelSelect}
          onPromptChange={handlePromptChange}
          onRegeneratePrompt={handleRegeneratePrompt}
          onBack={() => goToStep(5)}
          onNewProduct={onNewProduct}
        />
      )}
    </div>
  );
};
