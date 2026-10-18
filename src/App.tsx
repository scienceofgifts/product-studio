/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ProductRecord,
  ProductDetailsInput,
  AnalysisMode,
  StructuredAnalysisResult,
  BusinessBrainData,
  GiftGuide,
  ContextProfile,
  ComparisonFeedback,
  GuidePlanRecord,
  WritingGuidelinesSettings,
  ApprovedWritingExample
} from './types';
import { INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST } from './data/initialWritingGuidelines';
import { dbService } from './services/db';
import { syncService } from './services/syncService';
import { getApiUrl, fetchApi } from './services/apiConfig';
import { SAMPLE_PRODUCTS } from './data/sampleProducts';
import { NavigationHeader, ActiveTab } from './components/NavigationHeader';
import { ProductInputPanel } from './components/workspace/ProductInputPanel';
import { AnalysisResultsPanel } from './components/workspace/AnalysisResultsPanel';
import { ProductLibraryView } from './components/library/ProductLibraryView';
import { PortfolioIntelligenceView } from './components/portfolio/PortfolioIntelligenceView';
import { BusinessBrainView } from './components/brain/BusinessBrainView';
import { SettingsView } from './components/settings/SettingsView';
import { GuidePlannerView } from './components/planner/GuidePlannerView';
import { GuideDetailEditor } from './components/planner/GuideDetailEditor';
import { NewGuideModal } from './components/modals/NewGuideModal';
import { ManageGuidesModal } from './components/modals/ManageGuidesModal';
import { DeleteGuideConfirmModal } from './components/modals/DeleteGuideConfirmModal';
import { ProductComparisonModal } from './components/modals/ProductComparisonModal';
import { downloadFile } from './utils/exportUtils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { DEFAULT_MODEL_ID, resolveModelId } from './config/models';
import { findRelevantCatalogueMatches } from './services/similarityEngine';
import {
  extractSharedContext,
  applySharedContextToDetails,
  createNewProductDetailsWithContext,
  areContextsEqual,
  EMPTY_SHARED_CONTEXT
} from './utils/contextUtils';

const EMPTY_DETAILS: ProductDetailsInput = {
  workingName: '',
  productType: 'mug',
  giftGuideId: '',
  giftGuideName: '',
  primaryRecipient: '',
  secondaryRecipient: '',
  audienceInterest: '',
  occasion: '',
  productUrl: '',
  currentTitle: '',
  currentDescription: '',
  productSpecs: '',
  knownDesignReferences: '',
  initialPositioningIdea: '',
  specificQuestions: ''
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [businessBrain, setBusinessBrain] = useState<BusinessBrainData | null>(null);
  const [giftGuides, setGiftGuides] = useState<GiftGuide[]>([]);
  const [contextProfiles, setContextProfiles] = useState<ContextProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [comparisonFeedback, setComparisonFeedback] = useState<ComparisonFeedback[]>([]);
  const [guidePlans, setGuidePlans] = useState<GuidePlanRecord[]>([]);
  const [activeGuidePlanId, setActiveGuidePlanId] = useState<string | null>(null);
  const [writingGuidelines, setWritingGuidelines] = useState<WritingGuidelinesSettings>(INITIAL_WRITING_GUIDELINES);
  const [writingExamples, setWritingExamples] = useState<ApprovedWritingExample[]>(INITIAL_WRITING_EXAMPLES_LIST);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  // Modal pair state
  const [activeComparisonPair, setActiveComparisonPair] = useState<{
    productA: ProductRecord;
    productB: ProductRecord;
  } | null>(null);

  // Active Workspace State
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  const [details, setDetails] = useState<ProductDetailsInput>(EMPTY_DETAILS);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('full');
  const [imageBlob, setImageBlob] = useState<Blob | undefined>(undefined);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imageSize, setImageSize] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<StructuredAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Modals & Feedback
  const [isNewGuideModalOpen, setIsNewGuideModalOpen] = useState(false);
  const [isManageGuidesModalOpen, setIsManageGuidesModalOpen] = useState(false);
  const [guideToDelete, setGuideToDelete] = useState<GiftGuide | null>(null);
  const [isDeletingGuide, setIsDeletingGuide] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Change and persist preferred model
  const handleModelChange = async (newModel: string) => {
    const validated = resolveModelId(newModel);
    setSelectedModel(validated);
    await dbService.savePreferredModel(validated);
    showToast(`Studio model configured to ${validated}`);
  };

  // Active Context & Profile Resolution
  const activeProfile = useMemo(
    () => contextProfiles.find((p) => p.id === activeProfileId),
    [contextProfiles, activeProfileId]
  );

  const currentSharedContext = useMemo(
    () => extractSharedContext(details),
    [details]
  );

  const isContextModified = useMemo(() => {
    if (!activeProfile) return false;
    return !areContextsEqual(currentSharedContext, activeProfile.context);
  }, [activeProfile, currentSharedContext]);

  // Debounced auto-save of active working context (survives refreshes without triggering AI)
  useEffect(() => {
    const timer = setTimeout(() => {
      dbService.saveWorkingContext(currentSharedContext, activeProfileId).catch((err) => {
        console.warn('Failed to auto-save working context:', err);
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [currentSharedContext, activeProfileId]);

  // Load initial data from IndexedDB
  const refreshData = useCallback(async () => {
    try {
      const [allProds, brain, guides, savedModel, profiles, workingCtx, feedback, plans, guidelines, examples] = await Promise.all([
        dbService.getAllProducts(),
        dbService.getBusinessBrain(),
        dbService.getGiftGuides(),
        dbService.getPreferredModel(),
        dbService.getContextProfiles(),
        dbService.getWorkingContext(),
        dbService.getAllComparisonFeedback(),
        dbService.getGuidePlans(),
        dbService.getWritingGuidelines(),
        dbService.getWritingExamples()
      ]);
      setProducts(allProds);
      setBusinessBrain(brain);
      setGiftGuides(guides);
      setContextProfiles(profiles);
      setComparisonFeedback(feedback);
      setGuidePlans(plans);
      setWritingGuidelines(guidelines);
      setWritingExamples(examples);
      if (savedModel) {
        setSelectedModel(resolveModelId(savedModel));
      }
      return { allProds, profiles, workingCtx };
    } catch (err) {
      console.error('Failed to load initial data from IndexedDB:', err);
      return null;
    }
  }, []);

  const handleSaveWritingGuidelines = async (updated: WritingGuidelinesSettings, updatedExamples?: ApprovedWritingExample[]) => {
    await dbService.saveWritingGuidelines(updated);
    await syncService.notifyWritingGuidelinesUpdated(updated);
    if (updatedExamples) {
      await dbService.saveAllWritingExamples(updatedExamples);
      for (const ex of updatedExamples) {
        await syncService.notifyWritingExampleSaved(ex);
      }
    }
    await refreshData();
  };

  const handleSaveWritingExample = async (example: ApprovedWritingExample) => {
    await dbService.saveWritingExample(example);
    await syncService.notifyWritingExampleSaved(example);
    await refreshData();
  };

  const handleDeleteWritingExample = async (id: string) => {
    await dbService.deleteWritingExample(id);
    await syncService.notifyWritingExampleDeleted(id);
    await refreshData();
  };

  const handleCreateNewGuidePlan = async () => {
    const newPlan: GuidePlanRecord = {
      id: `plan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: 'New Editorial Gift Guide',
      brief: {
        workingTitle: 'New Editorial Gift Guide',
        topicOrNiche: 'Historical & Cultural Artifacts',
        targetBuyer: 'Thoughtful gift buyers',
        intendedRecipients: ['Enthusiasts', 'Collectors'],
        occasion: 'General',
        primaryReaderProblem: 'Finding an authentic, high-integrity gift without commercial clichés.',
        guidePurpose: 'Curate a selective, high-integrity gift list.',
        editorialAngle: 'Rejecting commercial tropes in favor of primary sources and genuine craft.',
        preferredTone: 'Scholarly yet accessible',
        subjectDepth: 'Moderate to high',
        lengthGuidance: '1,200 - 2,000 words',
        editorialNotes: '',
        constraints: ''
      },
      lineup: []
    };
    await dbService.saveGuidePlan(newPlan);
    await refreshData();
    setActiveGuidePlanId(newPlan.id);
    showToast('Created new gift guide plan');
  };

  const handleSaveGuidePlan = async (updatedPlan: GuidePlanRecord) => {
    await dbService.saveGuidePlan(updatedPlan);
    await refreshData();
  };

  const handleDeleteGuidePlan = async (id: string) => {
    await dbService.deleteGuidePlan(id);
    await refreshData();
    if (activeGuidePlanId === id) {
      setActiveGuidePlanId(null);
    }
    showToast('Deleted gift guide plan');
  };

  useEffect(() => {
    refreshData().then((res) => {
      if (!res) return;
      const { allProds, profiles, workingCtx } = res;

      // 1. If persistent working context exists in DB, restore shared fields
      if (workingCtx && workingCtx.context) {
        setDetails((prev) => applySharedContextToDetails(prev, workingCtx.context));
        setActiveProfileId(workingCtx.activeProfileId ?? null);
      } else if (profiles && profiles.length > 0) {
        // Fallback to initial default profile
        setActiveProfileId(profiles[0].id);
        setDetails((prev) => applySharedContextToDetails(prev, profiles[0].context));
      }

      // 2. If no products in library and workspace mockup empty, seed sample 1 mockup image
      if (allProds.length === 0) {
        const sample = SAMPLE_PRODUCTS[0];
        const blob = new Blob([sample.mockup.base64], { type: sample.mockup.mimeType });
        setImageBlob(blob);
        setImageBase64(sample.mockup.base64);
        setImageDataUrl(sample.mockup.dataUrl);
        setImageFileName(sample.mockup.fileName);
        setImageMimeType(sample.mockup.mimeType);
        setImageSize(sample.mockup.size);
      }
    });

    // Subscribe to real-time Firestore sync updates
    const unsubSync = syncService.onDataChange(() => {
      refreshData();
    });

    // Check backend health
    fetchApi('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setApiConnected(data.hasApiKey);
      })
      .catch(() => {
        setApiConnected(false);
      });

    return () => {
      unsubSync();
    };
  }, [refreshData]);

  // Context Profile Handlers
  const handleSelectProfile = (profileId: string | null) => {
    if (profileId === null) {
      setActiveProfileId(null);
      showToast('Switched to custom working context');
      return;
    }
    const target = contextProfiles.find((p) => p.id === profileId);
    if (target) {
      setDetails((prev) => applySharedContextToDetails(prev, target.context));
      setActiveProfileId(profileId);
      showToast(`Loaded profile "${target.name}"`);
    }
  };

  const handleSaveToActiveProfile = async () => {
    if (!activeProfileId) return;
    const target = contextProfiles.find((p) => p.id === activeProfileId);
    if (!target) return;
    const updated: ContextProfile = {
      ...target,
      context: currentSharedContext,
      updatedAt: new Date().toISOString()
    };
    await dbService.saveContextProfile(updated);
    setContextProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    showToast(`Saved changes to profile "${updated.name}"`);
  };

  const handleCreateProfile = async (name: string, description: string) => {
    const newProfile: ContextProfile = {
      id: 'profile_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: currentSharedContext,
      isDefault: false
    };
    await dbService.saveContextProfile(newProfile);
    const updatedProfiles = await dbService.getContextProfiles();
    setContextProfiles(updatedProfiles);
    setActiveProfileId(newProfile.id);
    showToast(`Profile "${name}" created and set active`);
  };

  const handleRenameProfile = async (id: string, newName: string, newDescription?: string) => {
    const target = contextProfiles.find((p) => p.id === id);
    if (!target) return;
    const updated: ContextProfile = {
      ...target,
      name: newName,
      description: newDescription !== undefined ? newDescription : target.description,
      updatedAt: new Date().toISOString()
    };
    await dbService.saveContextProfile(updated);
    const updatedProfiles = await dbService.getContextProfiles();
    setContextProfiles(updatedProfiles);
    showToast(`Profile "${newName}" updated`);
  };

  const handleDuplicateProfile = async (id: string) => {
    const duplicated = await dbService.duplicateContextProfile(id);
    if (duplicated) {
      const updatedProfiles = await dbService.getContextProfiles();
      setContextProfiles(updatedProfiles);
      showToast(`Duplicated to "${duplicated.name}"`);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    await dbService.deleteContextProfile(id);
    const updatedProfiles = await dbService.getContextProfiles();
    setContextProfiles(updatedProfiles);
    if (activeProfileId === id) {
      setActiveProfileId(updatedProfiles[0]?.id || null);
      if (updatedProfiles[0]) {
        setDetails((prev) => applySharedContextToDetails(prev, updatedProfiles[0].context));
      }
    }
    showToast('Profile deleted');
  };

  const handleResetWorkingContext = () => {
    setDetails((prev) => applySharedContextToDetails(prev, EMPTY_SHARED_CONTEXT));
    setActiveProfileId(null);
    showToast('Workspace context reset to blank');
  };

  // Handle image selected in workspace
  const handleImageSelected = (data: {
    blob: Blob;
    base64: string;
    dataUrl: string;
    fileName: string;
    mimeType: string;
    size: number;
    width: number;
    height: number;
  }) => {
    setImageBlob(data.blob);
    setImageBase64(data.base64);
    setImageDataUrl(data.dataUrl);
    setImageFileName(data.fileName);
    setImageMimeType(data.mimeType);
    setImageSize(data.size);
    setAnalysisError(null);
  };

  const handleImageRemoved = () => {
    setImageBlob(undefined);
    setImageBase64('');
    setImageDataUrl(undefined);
    setImageFileName('');
    setImageSize(0);
  };

  // Start new product analysis - PRESERVES shared context, resets ONLY product-specific fields
  const handleNewProduct = () => {
    setCurrentProductId(null);
    // Keep shared guide and recipient fields; reset only product-specific inputs
    setDetails((prev) => createNewProductDetailsWithContext(extractSharedContext(prev)));
    setImageBlob(undefined);
    setImageBase64('');
    setImageDataUrl(undefined);
    setImageFileName('');
    setImageSize(0);
    setAnalysisResult(null);
    setAnalysisError(null);
    setActiveTab('workspace');
    showToast('New product started · Shared guide & recipient context preserved');
  };

  // Save current workspace state as draft
  const handleSaveDraft = async () => {
    const id = currentProductId || 'prod_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    const newRecord: ProductRecord = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      details,
      contextProfileId: activeProfileId || undefined,
      contextProfileName: activeProfile?.name || undefined,
      contextSnapshot: currentSharedContext,
      imageBlob,
      imageDataUrl,
      imageFileName: imageFileName || 'mockup.png',
      imageMimeType,
      imageSize,
      mode: analysisMode,
      status: analysisResult ? 'completed' : 'draft',
      analysisResult: analysisResult || undefined
    };

    await dbService.saveProduct(newRecord);
    setCurrentProductId(id);
    await refreshData();
    showToast('Product draft saved to library');
  };

  // Run Gemini analysis via server proxy
  const handleRunAnalysis = async () => {
    if (!imageBase64 && !details.workingName && !details.primaryRecipient) {
      setAnalysisError('Please upload a product mockup image or provide product details before running analysis.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Find top candidate matches from existing catalogue records
      const tempCurrentRecord: ProductRecord = {
        id: currentProductId || 'temp_workspace_id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        details,
        imageFileName: imageFileName || '',
        imageMimeType: imageMimeType || 'image/png',
        imageSize: imageSize || 0,
        mode: analysisMode,
        status: 'draft'
      };

      const matches = findRelevantCatalogueMatches(
        tempCurrentRecord,
        products,
        new Map(comparisonFeedback.map((f) => [f.comparisonKey, f]))
      );

      const relevantCatalogueEntries = matches.slice(0, 4).map((m) => {
        const pB = products.find((p) => p.id === m.productBId);
        return {
          name: m.productBName,
          productType: m.productBFormat,
          giftGuideName: m.productBGuide,
          primaryRecipient: pB?.details.primaryRecipient || 'Unspecified',
          keyAppeal: pB?.details.initialPositioningIdea || 'None',
          similarityNote: `${m.categoryLabel} (${m.heuristicScore}/100 overlap)`
        };
      });

      const response = await fetchApi('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: imageBase64 ? imageBase64.replace(/^data:[^;]+;base64,/, '').trim() : undefined,
          imageMimeType,
          details,
          relevantCatalogueEntries,
          mode: analysisMode,
          businessBrain,
          writingGuidelines,
          modelName: selectedModel,
          extractedFacts: details.extractedFacts
        })
      });

      const contentType = response.headers.get('content-type') || '';
      let resJson: any = null;
      if (contentType.includes('application/json')) {
        resJson = await response.json().catch(() => null);
      } else {
        const rawText = await response.text().catch(() => '');
        throw new Error(`Server returned non-JSON response (status ${response.status}). ${rawText.slice(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(resJson?.error || `Server returned error status ${response.status}`);
      }

      if (!resJson || !resJson.success || !resJson.result) {
        throw new Error(resJson?.error || 'Failed to extract structured analysis from Gemini response.');
      }

      const result: StructuredAnalysisResult = resJson.result;
      setAnalysisResult(result);

      // Auto-save completed analysis record to IndexedDB
      const id = currentProductId || 'prod_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      const updatedRecord: ProductRecord = {
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        details,
        contextProfileId: activeProfileId || undefined,
        contextProfileName: activeProfile?.name || undefined,
        contextSnapshot: currentSharedContext,
        imageBlob,
        imageDataUrl,
        imageFileName: imageFileName || 'mockup.png',
        imageMimeType,
        imageSize,
        mode: analysisMode,
        status: 'completed',
        analysisResult: result
      };

      await dbService.saveProduct(updatedRecord);
      setCurrentProductId(id);
      await refreshData();
      showToast('Analysis completed and saved to Product Library');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(err.message || 'An unexpected error occurred during analysis.');
      showToast(err.message || 'Analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Open an existing product from library in Workspace
  const handleOpenProduct = (product: ProductRecord) => {
    setCurrentProductId(product.id);
    setDetails(product.details);
    if (product.contextProfileId) {
      setActiveProfileId(product.contextProfileId);
    }
    setImageBlob(product.imageBlob);
    setImageDataUrl(product.imageDataUrl);
    setImageFileName(product.imageFileName);
    setImageMimeType(product.imageMimeType);
    setImageSize(product.imageSize);
    setAnalysisMode(product.mode);
    setAnalysisResult(product.analysisResult || null);
    setAnalysisError(null);
    setActiveTab('workspace');
    showToast(`Loaded "${product.details.workingName || 'Product'}" into Workspace`);
  };

  // Duplicate a product
  const handleDuplicateProduct = async (id: string) => {
    const duplicated = await dbService.duplicateProduct(id);
    if (duplicated) {
      await refreshData();
      showToast('Product record duplicated');
    }
  };

  // Delete a product
  const handleDeleteProduct = async (id: string) => {
    await dbService.deleteProduct(id);
    if (currentProductId === id) {
      handleNewProduct();
    }
    await refreshData();
    showToast('Product record deleted');
  };

  // Save updated Business Brain
  const handleSaveBusinessBrain = async (updated: BusinessBrainData) => {
    await dbService.saveBusinessBrain(updated);
    await syncService.notifyBrainUpdated(updated);
    await refreshData();
    showToast(`Business Brain updated to Version ${(updated.version || 1) + 1}`);
  };

  // Reset Business Brain
  const handleResetBusinessBrain = async () => {
    const def = await dbService.resetBusinessBrainToDefault();
    await syncService.notifyBrainUpdated(def);
    setBusinessBrain(def);
    showToast('Business Brain reset to initial specifications');
  };

  // Add new gift guide
  const handleSaveNewGuide = async (guide: GiftGuide) => {
    await dbService.saveGiftGuide(guide);
    await refreshData();
    setDetails((prev) => ({
      ...prev,
      giftGuideId: guide.id,
      giftGuideName: guide.name
    }));
    showToast(`Created new guide: "${guide.name}"`);
  };

  // Delete gift guide with safe cascade cleanup
  const handleDeleteGiftGuide = async (id: string) => {
    setIsDeletingGuide(true);
    try {
      const guideName = giftGuides.find((g) => g.id === id)?.name || id;
      await dbService.deleteGiftGuide(id);
      setGiftGuides((prev) => prev.filter((g) => g.id !== id));
      setProducts((prev) =>
        prev.map((p) =>
          p.details.giftGuideId === id
            ? {
                ...p,
                details: {
                  ...p.details,
                  giftGuideId: '',
                  giftGuideName: ''
                }
              }
            : p
        )
      );
      if (details.giftGuideId === id) {
        setDetails((prev) => ({
          ...prev,
          giftGuideId: '',
          giftGuideName: ''
        }));
      }
      setGuideToDelete(null);
      await refreshData();
      showToast(`Deleted gift guide: "${guideName}"`);
    } catch (err: any) {
      showToast(`Failed to delete gift guide: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsDeletingGuide(false);
    }
  };

  // Export full backup
  const handleExportBackup = async () => {
    const backupJson = await dbService.exportBackup();
    downloadFile(
      backupJson,
      `science_of_gifts_studio_backup_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8;'
    );
    showToast('Full backup file downloaded');
  };

  // Import backup
  const handleImportBackup = async (jsonString: string) => {
    const res = await dbService.importBackup(jsonString);
    if (res.success) {
      await refreshData();
      showToast(`Successfully restored ${res.count} products from backup`);
    } else {
      showToast(res.error || 'Failed to import backup.', 'error');
    }
  };

  // Clear all data
  const handleClearAllData = async () => {
    await dbService.clearAllData();
    handleNewProduct();
    await refreshData();
    showToast('All local storage cleared and re-initialized');
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col font-sans">
      {/* Top Header */}
      <NavigationHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewProduct={handleNewProduct}
        libraryCount={products.length}
        apiConnected={apiConnected}
        selectedModel={selectedModel}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg text-white ${
              toastMessage.type === 'success' ? 'bg-[#1E3A8A]' : 'bg-red-600'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Workspace View */}
        {activeTab === 'workspace' && (
          <div className="space-y-4">
            {analysisError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">Analysis Engine Error</span>
                  <p className="mt-0.5 leading-relaxed">{analysisError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Product Input (5 cols on lg) */}
              <div className="lg:col-span-5 h-full">
                <ProductInputPanel
                  details={details}
                  onDetailsChange={setDetails}
                  mode={analysisMode}
                  onModeChange={setAnalysisMode}
                  imageDataUrl={imageDataUrl}
                  imageFileName={imageFileName}
                  imageSize={imageSize}
                  onImageSelected={handleImageSelected}
                  onImageRemoved={handleImageRemoved}
                  onRunAnalysis={handleRunAnalysis}
                  onSaveDraft={handleSaveDraft}
                  isAnalyzing={isAnalyzing}
                  giftGuides={giftGuides}
                  onOpenNewGuideModal={() => setIsNewGuideModalOpen(true)}
                  onOpenManageGuidesModal={() => setIsManageGuidesModalOpen(true)}
                  onDeleteGiftGuideClick={(g) => setGuideToDelete(g)}
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                  profiles={contextProfiles}
                  activeProfileId={activeProfileId}
                  isContextModified={isContextModified}
                  onSelectProfile={handleSelectProfile}
                  onSaveToActiveProfile={handleSaveToActiveProfile}
                  onCreateProfile={handleCreateProfile}
                  onRenameProfile={handleRenameProfile}
                  onDuplicateProfile={handleDuplicateProfile}
                  onDeleteProfile={handleDeleteProfile}
                  onResetWorkingContext={handleResetWorkingContext}
                />
              </div>

              {/* Right Column: Analysis Results & Brief (7 cols on lg) */}
              <div className="lg:col-span-7 h-full">
                <AnalysisResultsPanel
                  product={products.find((p) => p.id === currentProductId) || null}
                  analysis={analysisResult}
                  isAnalyzing={isAnalyzing}
                  onRerun={handleRunAnalysis}
                  businessBrainVersion={businessBrain?.version || 1}
                  catalogueProducts={products}
                  onInspectComparison={(pB) => {
                    const pA = products.find((p) => p.id === currentProductId) || products[0];
                    if (pA && pB) {
                      setActiveComparisonPair({ productA: pA, productB: pB });
                    }
                  }}
                  onApplyTitle={(title) => {
                    setDetails((prev) => ({
                      ...prev,
                      workingName: title,
                      currentTitle: title
                    }));
                    showToast(`Applied "${title}" as working product title`);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Product Library View */}
        {activeTab === 'library' && (
          <ProductLibraryView
            products={products}
            giftGuides={giftGuides}
            onOpenProduct={handleOpenProduct}
            onDuplicateProduct={handleDuplicateProduct}
            onDeleteProduct={handleDeleteProduct}
            onImportBackup={handleImportBackup}
            onExportBackup={handleExportBackup}
          />
        )}

        {/* Portfolio Intelligence View */}
        {activeTab === 'portfolio' && (
          <PortfolioIntelligenceView
            products={products}
            giftGuides={giftGuides}
            feedbackList={comparisonFeedback}
            onOpenProduct={handleOpenProduct}
            onNavigateToWorkspace={() => setActiveTab('workspace')}
          />
        )}

        {/* Guide Planner View */}
        {activeTab === 'planner' && (
          activeGuidePlanId ? (
            <GuideDetailEditor
              plan={guidePlans.find((p) => p.id === activeGuidePlanId) || guidePlans[0]}
              catalogueProducts={products}
              giftGuides={giftGuides}
              contextProfiles={contextProfiles}
              writingGuidelines={writingGuidelines}
              writingExamples={writingExamples}
              onSavePlan={handleSaveGuidePlan}
              onBack={() => setActiveGuidePlanId(null)}
              showToast={showToast}
            />
          ) : (
            <GuidePlannerView
              guidePlans={guidePlans}
              giftGuides={giftGuides}
              products={products}
              activeGiftGuideId={details.giftGuideId}
              onSelectPlan={(id) => setActiveGuidePlanId(id)}
              onCreateNewPlan={handleCreateNewGuidePlan}
              onDeletePlan={handleDeleteGuidePlan}
              onDeleteGiftGuide={handleDeleteGiftGuide}
              onOpenNewGuideModal={() => setIsNewGuideModalOpen(true)}
              onSelectGiftGuideForWorkspace={(g) => {
                setDetails((prev) => ({
                  ...prev,
                  giftGuideId: g.id,
                  giftGuideName: g.name
                }));
                showToast(`Set active gift guide to "${g.name}" in workspace`);
              }}
            />
          )
        )}

        {/* Business Brain View */}
        {activeTab === 'brain' && businessBrain && (
          <BusinessBrainView
            brainData={businessBrain}
            onSaveBrain={handleSaveBusinessBrain}
            onResetToDefault={handleResetBusinessBrain}
          />
        )}

        {/* Settings View */}
        {activeTab === 'settings' && (
          <SettingsView
            currentModel={selectedModel}
            onModelChange={handleModelChange}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onClearAllData={handleClearAllData}
            productCount={products.length}
            lastUsedModel={analysisResult?.actualModel || products.find((p) => p.analysisResult)?.analysisResult?.actualModel}
            lastRequestedModel={analysisResult?.requestedModel || products.find((p) => p.analysisResult)?.analysisResult?.requestedModel}
            lastFallbackOccurred={analysisResult?.fallbackOccurred ?? products.find((p) => p.analysisResult)?.analysisResult?.fallbackOccurred}
            lastFallbackReason={analysisResult?.fallbackReason || products.find((p) => p.analysisResult)?.analysisResult?.fallbackReason}
            writingGuidelines={writingGuidelines}
            writingExamples={writingExamples}
            onSaveWritingGuidelines={handleSaveWritingGuidelines}
            onSaveWritingExample={handleSaveWritingExample}
            onDeleteWritingExample={handleDeleteWritingExample}
            showToast={showToast}
          />
        )}
      </main>

      {/* New Gift Guide Modal */}
      <NewGuideModal
        isOpen={isNewGuideModalOpen}
        onClose={() => setIsNewGuideModalOpen(false)}
        onSave={handleSaveNewGuide}
      />

      {/* Manage Gift Guides Modal */}
      <ManageGuidesModal
        isOpen={isManageGuidesModalOpen}
        onClose={() => setIsManageGuidesModalOpen(false)}
        giftGuides={giftGuides}
        products={products}
        selectedGuideId={details.giftGuideId}
        onSelectGuide={(g) => {
          setDetails((prev) => ({
            ...prev,
            giftGuideId: g.id,
            giftGuideName: g.name
          }));
          showToast(`Set "${g.name}" as workspace gift guide`);
        }}
        onDeleteGuideClick={(g) => setGuideToDelete(g)}
        onOpenNewGuideModal={() => setIsNewGuideModalOpen(true)}
      />

      {/* Delete Gift Guide Confirm Modal */}
      <DeleteGuideConfirmModal
        isOpen={!!guideToDelete}
        guide={guideToDelete}
        assignedProductCount={
          guideToDelete
            ? products.filter((p) => p.details?.giftGuideId === guideToDelete.id).length
            : 0
        }
        onConfirm={() => {
          if (guideToDelete) {
            handleDeleteGiftGuide(guideToDelete.id);
          }
        }}
        onCancel={() => setGuideToDelete(null)}
        isDeleting={isDeletingGuide}
      />

      {/* Product Comparison Modal */}
      {activeComparisonPair && (
        <ProductComparisonModal
          productA={activeComparisonPair.productA}
          productB={activeComparisonPair.productB}
          allProducts={products}
          onClose={() => setActiveComparisonPair(null)}
          onSelectProductB={(newB) =>
            setActiveComparisonPair((prev) => (prev ? { ...prev, productB: newB } : null))
          }
        />
      )}
    </div>
  );
}
