/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductRecord,
  BusinessBrainData,
  GiftGuide,
  ContextProfile,
  SharedWorkingContext,
  ComparisonFeedback,
  GuidePlanRecord,
  WritingGuidelinesSettings,
  ApprovedWritingExample
} from '../types';
import { INITIAL_BUSINESS_BRAIN, INITIAL_GIFT_GUIDES } from '../data/initialBusinessBrain';
import { INITIAL_CONTEXT_PROFILES } from '../data/initialContextProfiles';
import { INITIAL_WRITING_GUIDELINES, INITIAL_WRITING_EXAMPLES_LIST } from '../data/initialWritingGuidelines';
import { DEFAULT_MODEL_ID, resolveModelId } from '../config/models';
import { DEFAULT_EDITORIAL_RULES, synthesizeEditorialRulesFromLegacy } from '../data/defaultEditorialRules';

const DB_NAME = 'science_of_gifts_studio_db';
const DB_VERSION = 6;

const STORES = {
  PRODUCTS: 'products',
  BUSINESS_BRAIN: 'business_brain',
  GIFT_GUIDES: 'gift_guides',
  CONFIG: 'config',
  CONTEXT_PROFILES: 'context_profiles',
  WORKING_CONTEXT: 'working_context',
  SIMILARITY_FEEDBACK: 'similarity_feedback',
  GUIDE_PLANS: 'guide_plans',
  WRITING_GUIDELINES: 'writing_guidelines',
  WRITING_EXAMPLES: 'writing_examples'
} as const;

class ProductIntelligenceDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Products Store
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
          productStore.createIndex('createdAt', 'createdAt', { unique: false });
          productStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          productStore.createIndex('status', 'status', { unique: false });
          productStore.createIndex('giftGuideId', 'details.giftGuideId', { unique: false });
        }

        // Business Brain Store
        if (!db.objectStoreNames.contains(STORES.BUSINESS_BRAIN)) {
          db.createObjectStore(STORES.BUSINESS_BRAIN, { keyPath: 'id' });
        }

        // Gift Guides Store
        if (!db.objectStoreNames.contains(STORES.GIFT_GUIDES)) {
          db.createObjectStore(STORES.GIFT_GUIDES, { keyPath: 'id' });
        }

        // Config Store for User Preferences
        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          db.createObjectStore(STORES.CONFIG, { keyPath: 'key' });
        }

        // Context Profiles Store
        if (!db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) {
          const profileStore = db.createObjectStore(STORES.CONTEXT_PROFILES, { keyPath: 'id' });
          profileStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          profileStore.createIndex('name', 'name', { unique: false });
        }

        // Persistent Working Context Store
        if (!db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) {
          db.createObjectStore(STORES.WORKING_CONTEXT, { keyPath: 'id' });
        }

        // Similarity Feedback & Corrections Store (Phase 2B)
        if (!db.objectStoreNames.contains(STORES.SIMILARITY_FEEDBACK)) {
          const feedbackStore = db.createObjectStore(STORES.SIMILARITY_FEEDBACK, { keyPath: 'id' });
          feedbackStore.createIndex('comparisonKey', 'comparisonKey', { unique: false });
          feedbackStore.createIndex('submittedAt', 'submittedAt', { unique: false });
        }

        // Guide Plans Store (Phase 4)
        if (!db.objectStoreNames.contains(STORES.GUIDE_PLANS)) {
          const planStore = db.createObjectStore(STORES.GUIDE_PLANS, { keyPath: 'id' });
          planStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          planStore.createIndex('title', 'title', { unique: false });
        }

        // Writing Guidelines & Examples Stores (Feature Update)
        if (!db.objectStoreNames.contains(STORES.WRITING_GUIDELINES)) {
          db.createObjectStore(STORES.WRITING_GUIDELINES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) {
          const exStore = db.createObjectStore(STORES.WRITING_EXAMPLES, { keyPath: 'id' });
          exStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        // Seed initial business brain, gift guides, profiles, and config if empty
        await this.ensureInitialSeed(db);
        resolve(db);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async ensureInitialSeed(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      try {
        const stores: string[] = [STORES.BUSINESS_BRAIN, STORES.GIFT_GUIDES];
        if (db.objectStoreNames.contains(STORES.CONFIG)) {
          stores.push(STORES.CONFIG);
        }
        if (db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) {
          stores.push(STORES.CONTEXT_PROFILES);
        }
        if (db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) {
          stores.push(STORES.WORKING_CONTEXT);
        }
        if (db.objectStoreNames.contains(STORES.WRITING_GUIDELINES)) {
          stores.push(STORES.WRITING_GUIDELINES);
        }
        if (db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) {
          stores.push(STORES.WRITING_EXAMPLES);
        }
        const tx = db.transaction(stores, 'readwrite');
        const brainStore = tx.objectStore(STORES.BUSINESS_BRAIN);
        const guideStore = tx.objectStore(STORES.GIFT_GUIDES);

        const brainReq = brainStore.get('active_brain');
        brainReq.onsuccess = () => {
          if (!brainReq.result) {
            brainStore.put({ id: 'active_brain', ...INITIAL_BUSINESS_BRAIN });
          }
        };

        if (db.objectStoreNames.contains(STORES.CONFIG)) {
          const configStore = tx.objectStore(STORES.CONFIG);
          const guideInitReq = configStore.get('gift_guides_initialized');
          guideInitReq.onsuccess = () => {
            if (!guideInitReq.result?.value) {
              const guideReq = guideStore.getAll();
              guideReq.onsuccess = () => {
                if (!guideReq.result || guideReq.result.length === 0) {
                  INITIAL_GIFT_GUIDES.forEach((guide) => guideStore.put(guide));
                }
                configStore.put({ key: 'gift_guides_initialized', value: true });
              };
            }
          };
        } else {
          const guideReq = guideStore.getAll();
          guideReq.onsuccess = () => {
            if (!guideReq.result || guideReq.result.length === 0) {
              INITIAL_GIFT_GUIDES.forEach((guide) => guideStore.put(guide));
            }
          };
        }

        if (db.objectStoreNames.contains(STORES.CONFIG)) {
          const configStore = tx.objectStore(STORES.CONFIG);
          const modelReq = configStore.get('preferred_model');
          modelReq.onsuccess = () => {
            if (!modelReq.result) {
              configStore.put({ key: 'preferred_model', value: DEFAULT_MODEL_ID });
            }
          };
        }

        if (db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) {
          const profileStore = tx.objectStore(STORES.CONTEXT_PROFILES);
          const profileReq = profileStore.getAll();
          profileReq.onsuccess = () => {
            if (!profileReq.result || profileReq.result.length === 0) {
              INITIAL_CONTEXT_PROFILES.forEach((profile) => profileStore.put(profile));
            }
          };
        }

        if (db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) {
          const wcStore = tx.objectStore(STORES.WORKING_CONTEXT);
          const wcReq = wcStore.get('active_working_context');
          wcReq.onsuccess = () => {
            if (!wcReq.result) {
              wcStore.put({
                id: 'active_working_context',
                context: INITIAL_CONTEXT_PROFILES[0].context,
                activeProfileId: INITIAL_CONTEXT_PROFILES[0].id,
                savedAt: new Date().toISOString()
              });
            }
          };
        }

        if (db.objectStoreNames.contains(STORES.WRITING_GUIDELINES)) {
          const wgStore = tx.objectStore(STORES.WRITING_GUIDELINES);
          const wgReq = wgStore.get('active_guidelines');
          wgReq.onsuccess = () => {
            if (!wgReq.result) {
              wgStore.put(INITIAL_WRITING_GUIDELINES);
            }
          };
        }

        if (db.objectStoreNames.contains(STORES.WRITING_EXAMPLES) && db.objectStoreNames.contains(STORES.CONFIG)) {
          const weStore = tx.objectStore(STORES.WRITING_EXAMPLES);
          const configStore = tx.objectStore(STORES.CONFIG);
          const initReq = configStore.get('writing_examples_initialized');
          initReq.onsuccess = () => {
            if (!initReq.result?.value) {
              INITIAL_WRITING_EXAMPLES_LIST.forEach((ex) => weStore.put(ex));
              configStore.put({ key: 'writing_examples_initialized', value: true });
            }
          };
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        console.warn('Initial seed check error:', e);
        resolve();
      }
    });
  }

  // --- CONFIG / PREFERENCES REPOSITORY ---

  async getPreferredModel(): Promise<string> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      try {
        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          resolve(DEFAULT_MODEL_ID);
          return;
        }
        const tx = db.transaction(STORES.CONFIG, 'readonly');
        const store = tx.objectStore(STORES.CONFIG);
        const req = store.get('preferred_model');

        req.onsuccess = () => {
          const raw = req.result?.value;
          // Validate and migrate if invalid or retired
          const resolved = resolveModelId(raw);
          if (raw !== resolved) {
            // Asynchronously persist the migration
            this.savePreferredModel(resolved).catch(console.error);
          }
          resolve(resolved);
        };

        req.onerror = () => resolve(DEFAULT_MODEL_ID);
      } catch (e) {
        console.warn('Error reading preferred model, fallback to default:', e);
        resolve(DEFAULT_MODEL_ID);
      }
    });
  }

  async savePreferredModel(modelId: string): Promise<void> {
    const db = await this.openDB();
    const validatedModel = resolveModelId(modelId);
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORES.CONFIG, 'readwrite');
        const store = tx.objectStore(STORES.CONFIG);
        const req = store.put({ key: 'preferred_model', value: validatedModel });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async getEditorialRules(): Promise<string> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      try {
        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          resolve(DEFAULT_EDITORIAL_RULES);
          return;
        }
        const tx = db.transaction(STORES.CONFIG, 'readonly');
        const store = tx.objectStore(STORES.CONFIG);
        const req = store.get('editorial_rules');

        req.onsuccess = async () => {
          const val = req.result?.value;
          if (typeof val === 'string' && val.trim().length > 0) {
            resolve(val);
            return;
          }

          // Safe fallback / migration: if empty, synthesize from existing Brain and Guidelines
          try {
            const [legacyBrain, legacyGuidelines] = await Promise.all([
              this.getBusinessBrain().catch(() => null),
              this.getWritingGuidelines().catch(() => null),
            ]);
            const migrated = synthesizeEditorialRulesFromLegacy(legacyBrain, legacyGuidelines);
            this.saveEditorialRules(migrated).catch(console.error);
            resolve(migrated);
          } catch (mErr) {
            console.warn('Fallback migration to default editorial rules:', mErr);
            resolve(DEFAULT_EDITORIAL_RULES);
          }
        };

        req.onerror = () => resolve(DEFAULT_EDITORIAL_RULES);
      } catch (e) {
        console.warn('Error reading editorial rules:', e);
        resolve(DEFAULT_EDITORIAL_RULES);
      }
    });
  }

  async saveEditorialRules(rules: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          resolve();
          return;
        }
        const tx = db.transaction(STORES.CONFIG, 'readwrite');
        const store = tx.objectStore(STORES.CONFIG);
        const req = store.put({ key: 'editorial_rules', value: rules });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // --- PRODUCTS REPOSITORY ---

  async getAllProducts(): Promise<ProductRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PRODUCTS, 'readonly');
      const store = tx.objectStore(STORES.PRODUCTS);
      const request = store.getAll();

      request.onsuccess = async () => {
        const records = request.result as ProductRecord[];
        // Sort descending by updatedAt
        records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        // For each record, create display URL if blob exists & ensure model metadata backwards-compatibility
        for (const item of records) {
          if (item.imageBlob && !item.imageDataUrl) {
            item.imageDataUrl = URL.createObjectURL(item.imageBlob);
          }
          if (item.analysisResult) {
            if (!item.analysisResult.requestedModel) {
              item.analysisResult.requestedModel = item.analysisResult.modelIdentifier || DEFAULT_MODEL_ID;
            }
            if (!item.analysisResult.actualModel) {
              item.analysisResult.actualModel = item.analysisResult.modelIdentifier || DEFAULT_MODEL_ID;
            }
            if (item.analysisResult.fallbackOccurred === undefined) {
              item.analysisResult.fallbackOccurred = false;
            }
          }
        }
        resolve(records);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getProductById(id: string): Promise<ProductRecord | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PRODUCTS, 'readonly');
      const store = tx.objectStore(STORES.PRODUCTS);
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result as ProductRecord | undefined;
        if (item) {
          if (item.imageBlob && !item.imageDataUrl) {
            item.imageDataUrl = URL.createObjectURL(item.imageBlob);
          }
          if (item.analysisResult) {
            if (!item.analysisResult.requestedModel) {
              item.analysisResult.requestedModel = item.analysisResult.modelIdentifier || DEFAULT_MODEL_ID;
            }
            if (!item.analysisResult.actualModel) {
              item.analysisResult.actualModel = item.analysisResult.modelIdentifier || DEFAULT_MODEL_ID;
            }
            if (item.analysisResult.fallbackOccurred === undefined) {
              item.analysisResult.fallbackOccurred = false;
            }
          }
        }
        resolve(item || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveProduct(product: ProductRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
      const store = tx.objectStore(STORES.PRODUCTS);

      // Clone without transient object URLs
      const toSave = { ...product };
      if (toSave.imageDataUrl && toSave.imageDataUrl.startsWith('blob:')) {
        delete toSave.imageDataUrl;
      }

      toSave.updatedAt = new Date().toISOString();

      const request = store.put(toSave);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProduct(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
      const store = tx.objectStore(STORES.PRODUCTS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async duplicateProduct(id: string): Promise<ProductRecord | null> {
    const original = await this.getProductById(id);
    if (!original) return null;

    const duplicated: ProductRecord = {
      ...original,
      id: 'prod_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      details: {
        ...original.details,
        workingName: `${original.details.workingName || 'Product'} (Copy)`
      },
      status: 'draft'
    };

    await this.saveProduct(duplicated);
    return duplicated;
  }

  // --- BUSINESS BRAIN REPOSITORY ---

  async getBusinessBrain(): Promise<BusinessBrainData> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BUSINESS_BRAIN, 'readonly');
      const store = tx.objectStore(STORES.BUSINESS_BRAIN);
      const request = store.get('active_brain');

      request.onsuccess = () => {
        if (request.result) {
          const { id, ...data } = request.result;
          resolve(data as BusinessBrainData);
        } else {
          resolve(INITIAL_BUSINESS_BRAIN);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveBusinessBrain(data: BusinessBrainData): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BUSINESS_BRAIN, 'readwrite');
      const store = tx.objectStore(STORES.BUSINESS_BRAIN);

      const updatedData: BusinessBrainData = {
        ...data,
        version: (data.version || 1) + 1,
        lastUpdated: new Date().toISOString()
      };

      const request = store.put({ id: 'active_brain', ...updatedData });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async resetBusinessBrainToDefault(): Promise<BusinessBrainData> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BUSINESS_BRAIN, 'readwrite');
      const store = tx.objectStore(STORES.BUSINESS_BRAIN);

      const resetData = {
        ...INITIAL_BUSINESS_BRAIN,
        version: 1,
        lastUpdated: new Date().toISOString()
      };

      const request = store.put({ id: 'active_brain', ...resetData });
      request.onsuccess = () => resolve(resetData);
      request.onerror = () => reject(request.error);
    });
  }

  // --- GIFT GUIDES REPOSITORY ---

  async getGiftGuides(): Promise<GiftGuide[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.GIFT_GUIDES)) {
          resolve(INITIAL_GIFT_GUIDES);
          return;
        }
        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          const tx = db.transaction(STORES.GIFT_GUIDES, 'readonly');
          const store = tx.objectStore(STORES.GIFT_GUIDES);
          const req = store.getAll();
          req.onsuccess = () => resolve((req.result as GiftGuide[]) || []);
          req.onerror = () => reject(req.error);
          return;
        }

        const tx = db.transaction([STORES.GIFT_GUIDES, STORES.CONFIG], 'readonly');
        const store = tx.objectStore(STORES.GIFT_GUIDES);
        const configStore = tx.objectStore(STORES.CONFIG);
        const initReq = configStore.get('gift_guides_initialized');

        initReq.onsuccess = () => {
          const isInitialized = !!initReq.result?.value;
          const req = store.getAll();
          req.onsuccess = () => {
            const list = req.result as GiftGuide[];
            if (!isInitialized && (!list || list.length === 0)) {
              resolve(INITIAL_GIFT_GUIDES);
            } else {
              resolve(list || []);
            }
          };
          req.onerror = () => reject(req.error);
        };

        initReq.onerror = () => {
          const req = store.getAll();
          req.onsuccess = () => resolve((req.result as GiftGuide[]) || []);
          req.onerror = () => reject(req.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  async saveGiftGuide(guide: GiftGuide): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        const stores: string[] = [STORES.GIFT_GUIDES];
        if (db.objectStoreNames.contains(STORES.CONFIG)) {
          stores.push(STORES.CONFIG);
        }
        const tx = db.transaction(stores, 'readwrite');
        const store = tx.objectStore(STORES.GIFT_GUIDES);
        store.put(guide);
        if (db.objectStoreNames.contains(STORES.CONFIG)) {
          const configStore = tx.objectStore(STORES.CONFIG);
          configStore.put({ key: 'gift_guides_initialized', value: true });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async deleteGiftGuide(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        const stores: string[] = [STORES.GIFT_GUIDES, STORES.PRODUCTS];
        if (db.objectStoreNames.contains(STORES.CONFIG)) stores.push(STORES.CONFIG);
        if (db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) stores.push(STORES.WORKING_CONTEXT);
        if (db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) stores.push(STORES.CONTEXT_PROFILES);

        const tx = db.transaction(stores, 'readwrite');
        const guideStore = tx.objectStore(STORES.GIFT_GUIDES);
        guideStore.delete(id);

        if (db.objectStoreNames.contains(STORES.CONFIG)) {
          const configStore = tx.objectStore(STORES.CONFIG);
          configStore.put({ key: 'gift_guides_initialized', value: true });
        }

        // Unlink guide from any assigned products without deleting the product records
        const prodStore = tx.objectStore(STORES.PRODUCTS);
        const prodReq = prodStore.getAll();
        prodReq.onsuccess = () => {
          const products = (prodReq.result as ProductRecord[]) || [];
          products.forEach((p) => {
            if (p.details && p.details.giftGuideId === id) {
              const updatedProduct: ProductRecord = {
                ...p,
                details: {
                  ...p.details,
                  giftGuideId: '',
                  giftGuideName: ''
                },
                updatedAt: new Date().toISOString()
              };
              prodStore.put(updatedProduct);
            }
          });
        };

        // Unlink from active working context if matched
        if (db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) {
          const wcStore = tx.objectStore(STORES.WORKING_CONTEXT);
          const wcReq = wcStore.get('active_working_context');
          wcReq.onsuccess = () => {
            if (wcReq.result && wcReq.result.context?.giftGuideId === id) {
              wcStore.put({
                ...wcReq.result,
                context: {
                  ...wcReq.result.context,
                  giftGuideId: '',
                  giftGuideName: ''
                },
                savedAt: new Date().toISOString()
              });
            }
          };
        }

        // Unlink from any context profiles if matched
        if (db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) {
          const cpStore = tx.objectStore(STORES.CONTEXT_PROFILES);
          const cpReq = cpStore.getAll();
          cpReq.onsuccess = () => {
            const profiles = (cpReq.result as ContextProfile[]) || [];
            profiles.forEach((profile) => {
              if (profile.context?.giftGuideId === id) {
                cpStore.put({
                  ...profile,
                  context: {
                    ...profile.context,
                    giftGuideId: '',
                    giftGuideName: ''
                  },
                  updatedAt: new Date().toISOString()
                });
              }
            });
          };
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- CONTEXT PROFILES & WORKING CONTEXT REPOSITORY ---

  async getContextProfiles(): Promise<ContextProfile[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) {
          resolve([]);
          return;
        }
        const tx = db.transaction(STORES.CONTEXT_PROFILES, 'readonly');
        const store = tx.objectStore(STORES.CONTEXT_PROFILES);
        const req = store.getAll();
        req.onsuccess = () => {
          const profiles = (req.result as ContextProfile[]) || [];
          profiles.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          resolve(profiles);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getContextProfileById(id: string): Promise<ContextProfile | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) {
          resolve(null);
          return;
        }
        const tx = db.transaction(STORES.CONTEXT_PROFILES, 'readonly');
        const store = tx.objectStore(STORES.CONTEXT_PROFILES);
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as ContextProfile) || null);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async saveContextProfile(profile: ContextProfile): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORES.CONTEXT_PROFILES, 'readwrite');
        const store = tx.objectStore(STORES.CONTEXT_PROFILES);
        const toSave: ContextProfile = {
          ...profile,
          updatedAt: new Date().toISOString()
        };
        const req = store.put(toSave);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async deleteContextProfile(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORES.CONTEXT_PROFILES, 'readwrite');
        const store = tx.objectStore(STORES.CONTEXT_PROFILES);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async duplicateContextProfile(id: string): Promise<ContextProfile | null> {
    const original = await this.getContextProfileById(id);
    if (!original) return null;

    const newId = 'profile_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    const duplicated: ContextProfile = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false
    };

    await this.saveContextProfile(duplicated);
    return duplicated;
  }

  async getWorkingContext(): Promise<{ context: SharedWorkingContext; activeProfileId: string | null } | null> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      try {
        if (!db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) {
          resolve(null);
          return;
        }
        const tx = db.transaction(STORES.WORKING_CONTEXT, 'readonly');
        const store = tx.objectStore(STORES.WORKING_CONTEXT);
        const req = store.get('active_working_context');
        req.onsuccess = () => {
          if (req.result && req.result.context) {
            resolve({
              context: req.result.context,
              activeProfileId: req.result.activeProfileId ?? null
            });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch (err) {
        console.warn('Error reading working context:', err);
        resolve(null);
      }
    });
  }

  async saveWorkingContext(context: SharedWorkingContext, activeProfileId: string | null): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) {
          resolve();
          return;
        }
        const tx = db.transaction(STORES.WORKING_CONTEXT, 'readwrite');
        const store = tx.objectStore(STORES.WORKING_CONTEXT);
        const req = store.put({
          id: 'active_working_context',
          context,
          activeProfileId,
          savedAt: new Date().toISOString()
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- SIMILARITY FEEDBACK REPOSITORY (Phase 2B) ---

  async saveComparisonFeedback(feedback: ComparisonFeedback): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.SIMILARITY_FEEDBACK)) {
          resolve();
          return;
        }
        const tx = db.transaction(STORES.SIMILARITY_FEEDBACK, 'readwrite');
        const store = tx.objectStore(STORES.SIMILARITY_FEEDBACK);
        const req = store.put(feedback);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getComparisonFeedback(comparisonKey: string): Promise<ComparisonFeedback | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.SIMILARITY_FEEDBACK)) {
          resolve(null);
          return;
        }
        const tx = db.transaction(STORES.SIMILARITY_FEEDBACK, 'readonly');
        const store = tx.objectStore(STORES.SIMILARITY_FEEDBACK);
        const index = store.index('comparisonKey');
        const req = index.getAll(comparisonKey);
        req.onsuccess = () => {
          const results = req.result as ComparisonFeedback[];
          if (!results || results.length === 0) {
            resolve(null);
          } else {
            // Return newest feedback for this pair
            results.sort((a, b) => new Date(b.updatedAt || b.submittedAt).getTime() - new Date(a.updatedAt || a.submittedAt).getTime());
            resolve(results[0]);
          }
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getAllComparisonFeedback(): Promise<ComparisonFeedback[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.SIMILARITY_FEEDBACK)) {
          resolve([]);
          return;
        }
        const tx = db.transaction(STORES.SIMILARITY_FEEDBACK, 'readonly');
        const store = tx.objectStore(STORES.SIMILARITY_FEEDBACK);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async deleteComparisonFeedback(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.SIMILARITY_FEEDBACK)) {
          resolve();
          return;
        }
        const tx = db.transaction(STORES.SIMILARITY_FEEDBACK, 'readwrite');
        const store = tx.objectStore(STORES.SIMILARITY_FEEDBACK);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- GUIDE PLANS REPOSITORY (Phase 4) ---

  async getGuidePlans(): Promise<GuidePlanRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.GUIDE_PLANS)) {
          resolve([]);
          return;
        }
        const tx = db.transaction(STORES.GUIDE_PLANS, 'readonly');
        const store = tx.objectStore(STORES.GUIDE_PLANS);
        const req = store.getAll();
        req.onsuccess = () => {
          const plans = req.result as GuidePlanRecord[];
          plans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          resolve(plans);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getGuidePlan(id: string): Promise<GuidePlanRecord | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.GUIDE_PLANS)) {
          resolve(null);
          return;
        }
        const tx = db.transaction(STORES.GUIDE_PLANS, 'readonly');
        const store = tx.objectStore(STORES.GUIDE_PLANS);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async saveGuidePlan(plan: GuidePlanRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.GUIDE_PLANS)) {
          resolve();
          return;
        }
        const tx = db.transaction(STORES.GUIDE_PLANS, 'readwrite');
        const store = tx.objectStore(STORES.GUIDE_PLANS);
        const planToSave = {
          ...plan,
          updatedAt: new Date().toISOString()
        };
        const req = store.put(planToSave);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async deleteGuidePlan(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.GUIDE_PLANS)) {
          resolve();
          return;
        }
        const tx = db.transaction(STORES.GUIDE_PLANS, 'readwrite');
        const store = tx.objectStore(STORES.GUIDE_PLANS);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- WRITING GUIDELINES & EXAMPLES REPOSITORY ---

  async saveAllWritingExamples(examples: ApprovedWritingExample[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) {
          resolve();
          return;
        }
        const tx = db.transaction([STORES.WRITING_EXAMPLES, STORES.CONFIG], 'readwrite');
        const store = tx.objectStore(STORES.WRITING_EXAMPLES);
        const configStore = tx.objectStore(STORES.CONFIG);

        const clearReq = store.clear();
        clearReq.onsuccess = () => {
          examples.forEach((ex) => store.put(ex));
          configStore.put({ key: 'writing_examples_initialized', value: true });
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getWritingGuidelines(): Promise<WritingGuidelinesSettings> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.WRITING_GUIDELINES)) {
          resolve(INITIAL_WRITING_GUIDELINES);
          return;
        }
        const tx = db.transaction(STORES.WRITING_GUIDELINES, 'readonly');
        const store = tx.objectStore(STORES.WRITING_GUIDELINES);
        const req = store.get('active_guidelines');
        req.onsuccess = () => resolve(req.result || INITIAL_WRITING_GUIDELINES);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async saveWritingGuidelines(settings: WritingGuidelinesSettings): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.WRITING_GUIDELINES)) {
          resolve();
          return;
        }
        const tx = db.transaction(STORES.WRITING_GUIDELINES, 'readwrite');
        const store = tx.objectStore(STORES.WRITING_GUIDELINES);
        const payload = {
          ...settings,
          id: 'active_guidelines',
          updatedAt: new Date().toISOString()
        };
        const req = store.put(payload);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getWritingExamples(): Promise<ApprovedWritingExample[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) {
          resolve(INITIAL_WRITING_EXAMPLES_LIST);
          return;
        }
        const tx = db.transaction([STORES.WRITING_EXAMPLES, STORES.CONFIG], 'readonly');
        const store = tx.objectStore(STORES.WRITING_EXAMPLES);
        const configStore = tx.objectStore(STORES.CONFIG);
        const initReq = configStore.get('writing_examples_initialized');

        initReq.onsuccess = () => {
          const isInitialized = !!initReq.result?.value;
          const req = store.getAll();
          req.onsuccess = () => {
            const list = req.result as ApprovedWritingExample[];
            if (!isInitialized && (!list || list.length === 0)) {
              resolve(INITIAL_WRITING_EXAMPLES_LIST);
            } else {
              resolve(list || []);
            }
          };
          req.onerror = () => reject(req.error);
        };

        initReq.onerror = () => {
          const req = store.getAll();
          req.onsuccess = () => resolve((req.result as ApprovedWritingExample[]) || []);
          req.onerror = () => reject(req.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  async saveWritingExample(example: ApprovedWritingExample): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) {
          resolve();
          return;
        }
        const tx = db.transaction([STORES.WRITING_EXAMPLES, STORES.CONFIG], 'readwrite');
        const store = tx.objectStore(STORES.WRITING_EXAMPLES);
        const configStore = tx.objectStore(STORES.CONFIG);
        store.put(example);
        configStore.put({ key: 'writing_examples_initialized', value: true });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async deleteWritingExample(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) {
          resolve();
          return;
        }
        const tx = db.transaction([STORES.WRITING_EXAMPLES, STORES.CONFIG], 'readwrite');
        const store = tx.objectStore(STORES.WRITING_EXAMPLES);
        const configStore = tx.objectStore(STORES.CONFIG);
        store.delete(id);
        configStore.put({ key: 'writing_examples_initialized', value: true });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- EXPORT & BULK BACKUP ---

  async exportBackup(): Promise<string> {
    const [products, brain, guides, profiles, workingCtx, feedback, guidePlans, guidelines, examples, editorialRules] = await Promise.all([
      this.getAllProducts(),
      this.getBusinessBrain(),
      this.getGiftGuides(),
      this.getContextProfiles(),
      this.getWorkingContext(),
      this.getAllComparisonFeedback(),
      this.getGuidePlans(),
      this.getWritingGuidelines(),
      this.getWritingExamples(),
      this.getEditorialRules()
    ]);

    const sanitizedProducts = products.map(({ imageBlob, imageDataUrl, ...rest }) => rest);

    const backupPayload = {
      app: 'Science of Gifts — Product Intelligence Studio',
      exportDate: new Date().toISOString(),
      schemaVersion: DB_VERSION,
      editorialRules,
      businessBrain: brain,
      giftGuides: guides,
      contextProfiles: profiles,
      workingContext: workingCtx,
      similarityFeedback: feedback,
      guidePlans: guidePlans,
      writingGuidelines: guidelines,
      writingExamples: examples,
      products: sanitizedProducts
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  async importBackup(jsonString: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !data.products || !Array.isArray(data.products)) {
        return { success: false, count: 0, error: 'Invalid backup JSON structure.' };
      }

      if (data.editorialRules && typeof data.editorialRules === 'string') {
        await this.saveEditorialRules(data.editorialRules).catch(console.warn);
      }

      const db = await this.openDB();
      const storesToTransact: string[] = [STORES.PRODUCTS, STORES.BUSINESS_BRAIN, STORES.GIFT_GUIDES];
      if (db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) storesToTransact.push(STORES.CONTEXT_PROFILES);
      if (db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) storesToTransact.push(STORES.WORKING_CONTEXT);
      if (db.objectStoreNames.contains(STORES.SIMILARITY_FEEDBACK)) storesToTransact.push(STORES.SIMILARITY_FEEDBACK);
      if (db.objectStoreNames.contains(STORES.GUIDE_PLANS)) storesToTransact.push(STORES.GUIDE_PLANS);
      if (db.objectStoreNames.contains(STORES.WRITING_GUIDELINES)) storesToTransact.push(STORES.WRITING_GUIDELINES);
      if (db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) storesToTransact.push(STORES.WRITING_EXAMPLES);

      const tx = db.transaction(storesToTransact, 'readwrite');
      const prodStore = tx.objectStore(STORES.PRODUCTS);
      const brainStore = tx.objectStore(STORES.BUSINESS_BRAIN);
      const guideStore = tx.objectStore(STORES.GIFT_GUIDES);

      if (data.businessBrain) {
        brainStore.put({ id: 'active_brain', ...data.businessBrain });
      }

      if (Array.isArray(data.giftGuides)) {
        data.giftGuides.forEach((g: GiftGuide) => guideStore.put(g));
      }

      if (Array.isArray(data.contextProfiles) && db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) {
        const profileStore = tx.objectStore(STORES.CONTEXT_PROFILES);
        data.contextProfiles.forEach((p: ContextProfile) => profileStore.put(p));
      }

      if (data.workingContext && db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) {
        const wcStore = tx.objectStore(STORES.WORKING_CONTEXT);
        wcStore.put({
          id: 'active_working_context',
          context: data.workingContext.context,
          activeProfileId: data.workingContext.activeProfileId ?? null,
          savedAt: new Date().toISOString()
        });
      }

      if (Array.isArray(data.similarityFeedback) && db.objectStoreNames.contains(STORES.SIMILARITY_FEEDBACK)) {
        const feedbackStore = tx.objectStore(STORES.SIMILARITY_FEEDBACK);
        data.similarityFeedback.forEach((fb: ComparisonFeedback) => feedbackStore.put(fb));
      }

      if (Array.isArray(data.guidePlans) && db.objectStoreNames.contains(STORES.GUIDE_PLANS)) {
        const planStore = tx.objectStore(STORES.GUIDE_PLANS);
        data.guidePlans.forEach((gp: GuidePlanRecord) => planStore.put(gp));
      }

      if (data.writingGuidelines && db.objectStoreNames.contains(STORES.WRITING_GUIDELINES)) {
        const wgStore = tx.objectStore(STORES.WRITING_GUIDELINES);
        wgStore.put({ ...data.writingGuidelines, id: 'active_guidelines' });
      }

      if (Array.isArray(data.writingExamples) && db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) {
        const weStore = tx.objectStore(STORES.WRITING_EXAMPLES);
        data.writingExamples.forEach((ex: ApprovedWritingExample) => weStore.put(ex));
      }

      let count = 0;
      data.products.forEach((p: ProductRecord) => {
        prodStore.put(p);
        count++;
      });

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve({ success: true, count });
        tx.onerror = () => resolve({ success: false, count: 0, error: 'Database transaction failed.' });
      });
    } catch (err: unknown) {
      return { success: false, count: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async clearAllData(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const storesToClear: string[] = [STORES.PRODUCTS, STORES.BUSINESS_BRAIN, STORES.GIFT_GUIDES];
      if (db.objectStoreNames.contains(STORES.CONFIG)) storesToClear.push(STORES.CONFIG);
      if (db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) storesToClear.push(STORES.CONTEXT_PROFILES);
      if (db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) storesToClear.push(STORES.WORKING_CONTEXT);
      if (db.objectStoreNames.contains(STORES.SIMILARITY_FEEDBACK)) storesToClear.push(STORES.SIMILARITY_FEEDBACK);
      if (db.objectStoreNames.contains(STORES.GUIDE_PLANS)) storesToClear.push(STORES.GUIDE_PLANS);
      if (db.objectStoreNames.contains(STORES.WRITING_GUIDELINES)) storesToClear.push(STORES.WRITING_GUIDELINES);
      if (db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) storesToClear.push(STORES.WRITING_EXAMPLES);

      const tx = db.transaction(storesToClear, 'readwrite');
      tx.objectStore(STORES.PRODUCTS).clear();
      tx.objectStore(STORES.BUSINESS_BRAIN).clear();
      tx.objectStore(STORES.GIFT_GUIDES).clear();
      if (db.objectStoreNames.contains(STORES.CONFIG)) tx.objectStore(STORES.CONFIG).clear();
      if (db.objectStoreNames.contains(STORES.CONTEXT_PROFILES)) tx.objectStore(STORES.CONTEXT_PROFILES).clear();
      if (db.objectStoreNames.contains(STORES.WORKING_CONTEXT)) tx.objectStore(STORES.WORKING_CONTEXT).clear();
      if (db.objectStoreNames.contains(STORES.SIMILARITY_FEEDBACK)) tx.objectStore(STORES.SIMILARITY_FEEDBACK).clear();
      if (db.objectStoreNames.contains(STORES.GUIDE_PLANS)) tx.objectStore(STORES.GUIDE_PLANS).clear();
      if (db.objectStoreNames.contains(STORES.WRITING_GUIDELINES)) tx.objectStore(STORES.WRITING_GUIDELINES).clear();
      if (db.objectStoreNames.contains(STORES.WRITING_EXAMPLES)) tx.objectStore(STORES.WRITING_EXAMPLES).clear();

      tx.oncomplete = async () => {
        await this.ensureInitialSeed(db);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbService = new ProductIntelligenceDB();
