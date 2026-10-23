/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  isFirestoreOfflineError
} from './firebase';
import { dbService } from './db';
import {
  BusinessBrainData,
  WritingGuidelinesSettings,
  ApprovedWritingExample
} from '../types';
import { synthesizeEditorialRulesFromLegacy } from '../data/defaultEditorialRules';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncState {
  currentUser: User | null;
  status: SyncStatus;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  isOnline: boolean;
}

type SyncListener = (state: SyncState) => void;
type DataChangeCallback = () => void;

class FirebaseSyncService {
  private state: SyncState = {
    currentUser: null,
    status: 'idle',
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  };

  private listeners: Set<SyncListener> = new Set();
  private dataChangeCallbacks: Set<DataChangeCallback> = new Set();
  private unsubscribers: Unsubscribe[] = [];
  private isInitialSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }

    onAuthStateChanged(auth, async (user) => {
      this.state.currentUser = user;
      this.cleanupSnapshotListeners();

      if (user) {
        this.updateState({ status: 'syncing', errorMessage: null });
        try {
          await this.startRealtimeListeners(user.uid);
          await this.syncAll(user.uid);
        } catch (err) {
          if (isFirestoreOfflineError(err)) {
            console.warn('[Firestore] Operating in offline mode during auth change.');
            this.updateState({
              status: 'offline',
              errorMessage: 'Offline mode active (local data safe)'
            });
          } else {
            console.error('Error during user auth sync initialization:', err);
          }
        }
      } else {
        this.updateState({ status: 'idle', errorMessage: null, lastSyncedAt: null });
      }
      this.notifyListeners();
    });
  }

  public subscribeState(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public onDataChange(callback: DataChangeCallback): () => void {
    this.dataChangeCallbacks.add(callback);
    return () => this.dataChangeCallbacks.delete(callback);
  }

  public getState(): SyncState {
    return { ...this.state };
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  private notifyDataChanged() {
    this.dataChangeCallbacks.forEach((fn) => fn());
  }

  private handleNetworkChange(isOnline: boolean) {
    this.updateState({ isOnline });
    if (isOnline && this.state.currentUser) {
      this.syncAll(this.state.currentUser.uid).catch((err) => {
        if (!isFirestoreOfflineError(err)) {
          console.error('Sync failed on network restore:', err);
        }
      });
    } else if (!isOnline) {
      this.updateState({ status: 'offline', errorMessage: 'Device is offline.' });
    }
  }

  private cleanupSnapshotListeners() {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (err) {
        console.warn('Error unsubscribing listener:', err);
      }
    });
    this.unsubscribers = [];
  }

  // --- REALTIME LISTENERS FOR SIGNED-IN USER ---

  private async startRealtimeListeners(userId: string) {
    if (!this.state.isOnline) return;

    // 1. Editorial Rules Listener (Replaces legacy Business Brain and Writing Guidelines)
    const editorialDocRef = doc(db, 'users', userId, 'settings', 'editorial_rules');
    const unsubEditorial = onSnapshot(
      editorialDocRef,
      async (snapshot) => {
        if (this.isInitialSyncing) return;
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as { rules?: string; updatedAt?: string };
          const localRules = await dbService.getEditorialRules();

          if (remoteData.rules && remoteData.rules !== localRules) {
            await dbService.saveEditorialRules(remoteData.rules);
            this.notifyDataChanged();
          }
        }
      },
      (error) => {
        if (isFirestoreOfflineError(error)) {
          console.warn('[Firestore] Realtime editorial rules listener operating offline.');
          this.updateState({ status: 'offline' });
        } else {
          console.error('Editorial rules sync snapshot error:', error);
        }
      }
    );
    this.unsubscribers.push(unsubEditorial);

    // 2. Writing Examples Collection Listener
    const examplesColRef = collection(db, 'users', userId, 'writing_examples');
    const unsubExamples = onSnapshot(
      examplesColRef,
      async (snapshot) => {
        if (this.isInitialSyncing) return;
        try {
          const localExamples = await dbService.getWritingExamples();
          const localMap = new Map(localExamples.map((ex) => [ex.id, ex]));
          let hasChanges = false;

          for (const change of snapshot.docChanges()) {
            const remoteDoc = change.doc.data() as ApprovedWritingExample & { deleted?: boolean };

            if (remoteDoc.deleted) {
              if (localMap.has(remoteDoc.id)) {
                await dbService.deleteWritingExample(remoteDoc.id);
                hasChanges = true;
              }
            } else {
              const localEx = localMap.get(remoteDoc.id);
              const remoteTime = remoteDoc.updatedAt ? new Date(remoteDoc.updatedAt).getTime() : 0;
              const localTime = localEx?.updatedAt ? new Date(localEx.updatedAt).getTime() : 0;

              if (!localEx || remoteTime > localTime) {
                await dbService.saveWritingExample(remoteDoc);
                hasChanges = true;
              }
            }
          }

          if (hasChanges) {
            this.notifyDataChanged();
          }
        } catch (err) {
          console.warn('Error processing writing examples snapshot:', err);
        }
      },
      (error) => {
        if (isFirestoreOfflineError(error)) {
          console.warn('[Firestore] Writing examples listener operating offline.');
          this.updateState({ status: 'offline' });
        } else {
          console.error('Writing examples sync snapshot error:', error);
        }
      }
    );
    this.unsubscribers.push(unsubExamples);
  }

  // --- MANUAL & INITIAL SYNC DISPATCHER ---

  public async triggerManualSync(): Promise<void> {
    if (!this.state.currentUser) return;
    if (!this.state.isOnline) {
      this.updateState({ status: 'offline', errorMessage: 'Device is currently offline.' });
      return;
    }
    this.updateState({ status: 'syncing', errorMessage: null });
    await this.syncAll(this.state.currentUser.uid);
  }

  private async syncAll(userId: string): Promise<void> {
    if (!this.state.isOnline) {
      this.updateState({ status: 'offline' });
      return;
    }

    try {
      this.isInitialSyncing = true;

      await Promise.all([
        this.syncEditorialRules(userId),
        this.syncWritingExamples(userId)
      ]);

      this.updateState({
        status: 'synced',
        lastSyncedAt: new Date(),
        errorMessage: null
      });
      this.notifyDataChanged();
    } catch (error: unknown) {
      if (isFirestoreOfflineError(error)) {
        console.warn('[Firestore Offline] Could not reach Cloud Firestore. Local IndexedDB data is active.');
        this.updateState({
          status: 'offline',
          errorMessage: 'Offline mode active. Local data is preserved.'
        });
        return;
      }
      console.error('Sync failed:', error);
      this.updateState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Synchronization failed.'
      });
    } finally {
      this.isInitialSyncing = false;
    }
  }

  // --- CANONICAL EDITORIAL RULES SYNC ---

  private async syncEditorialRules(userId: string): Promise<void> {
    const localRules = await dbService.getEditorialRules();
    const docPath = `users/${userId}/settings/editorial_rules`;
    const docRef = doc(db, 'users', userId, 'settings', 'editorial_rules');

    let remoteSnap;
    try {
      remoteSnap = await getDoc(docRef);
    } catch (err) {
      if (isFirestoreOfflineError(err)) {
        console.warn(`[Firestore Offline] Operating offline for ${docPath}. Local rules retained.`);
        return;
      }
      handleFirestoreError(err, OperationType.GET, docPath);
      return;
    }

    if (!remoteSnap || !remoteSnap.exists()) {
      // Check if remote has legacy business_brain or writing_guidelines to migrate into editorial_rules
      let migratedFromLegacyRemote = false;
      try {
        const legacyBrainRef = doc(db, 'users', userId, 'settings', 'business_brain');
        const legacyGuidelinesRef = doc(db, 'users', userId, 'settings', 'writing_guidelines');
        const [brainSnap, guidelinesSnap] = await Promise.all([
          getDoc(legacyBrainRef).catch(() => null),
          getDoc(legacyGuidelinesRef).catch(() => null)
        ]);

        const legacyBrain = brainSnap?.exists() ? (brainSnap.data() as BusinessBrainData) : null;
        const legacyGuidelines = guidelinesSnap?.exists() ? (guidelinesSnap.data() as WritingGuidelinesSettings) : null;

        if (legacyBrain || legacyGuidelines) {
          const synthesized = synthesizeEditorialRulesFromLegacy(legacyBrain, legacyGuidelines);
          if (synthesized) {
            await dbService.saveEditorialRules(synthesized);
            const payload = {
              id: 'editorial_rules',
              rules: synthesized,
              updatedAt: new Date().toISOString()
            };
            try {
              await setDoc(docRef, payload);
              migratedFromLegacyRemote = true;
            } catch (wErr) {
              if (!isFirestoreOfflineError(wErr)) {
                console.warn('Could not save synthesized rules to remote:', wErr);
              }
            }
          }
        }
      } catch (legacyErr) {
        console.warn('Legacy remote migration check skipped:', legacyErr);
      }

      // If not migrated from legacy remote and local rules exist, upload local rules
      if (!migratedFromLegacyRemote && localRules) {
        const payload = {
          id: 'editorial_rules',
          rules: localRules,
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(docRef, payload);
        } catch (err) {
          if (isFirestoreOfflineError(err)) {
            console.warn('[Firestore Offline] Could not push editorial rules to remote; preserved locally.');
            return;
          }
          handleFirestoreError(err, OperationType.WRITE, docPath);
        }
      }
    } else {
      const remoteData = remoteSnap.data() as { rules?: string; updatedAt?: string };
      const remoteRules = remoteData?.rules;

      if (remoteRules && remoteRules !== localRules) {
        // If remote rules differ, update local rules
        await dbService.saveEditorialRules(remoteRules);
      } else if (localRules && localRules !== remoteRules) {
        const payload = {
          id: 'editorial_rules',
          rules: localRules,
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(docRef, payload);
        } catch (err) {
          if (isFirestoreOfflineError(err)) {
            console.warn('[Firestore Offline] Could not push updated editorial rules to remote.');
            return;
          }
          handleFirestoreError(err, OperationType.WRITE, docPath);
        }
      }
    }
  }

  // --- WRITING EXAMPLES SYNC ---

  private async syncWritingExamples(userId: string): Promise<void> {
    const localExamples = await dbService.getWritingExamples();
    const colPath = `users/${userId}/writing_examples`;
    const colRef = collection(db, 'users', userId, 'writing_examples');

    let remoteSnaps;
    try {
      remoteSnaps = await getDocs(colRef);
    } catch (err) {
      if (isFirestoreOfflineError(err)) {
        console.warn(`[Firestore Offline] Operating offline for ${colPath}. Local examples retained.`);
        return;
      }
      handleFirestoreError(err, OperationType.GET, colPath);
      return;
    }

    if (!remoteSnaps) return;

    const remoteMap = new Map<string, ApprovedWritingExample & { deleted?: boolean }>();
    remoteSnaps.forEach((docSnap) => {
      remoteMap.set(docSnap.id, docSnap.data() as ApprovedWritingExample & { deleted?: boolean });
    });

    const localMap = new Map<string, ApprovedWritingExample>();
    localExamples.forEach((ex) => localMap.set(ex.id, ex));

    // 1. Process Remote Items
    for (const [id, remoteEx] of remoteMap.entries()) {
      const localEx = localMap.get(id);

      if (remoteEx.deleted) {
        if (localEx) {
          await dbService.deleteWritingExample(id);
        }
        continue;
      }

      const remoteTime = remoteEx.updatedAt ? new Date(remoteEx.updatedAt).getTime() : 0;
      const localTime = localEx?.updatedAt ? new Date(localEx.updatedAt).getTime() : 0;

      if (!localEx || remoteTime > localTime) {
        await dbService.saveWritingExample(remoteEx);
      } else if (localTime > remoteTime && localEx) {
        const itemPath = `users/${userId}/writing_examples/${id}`;
        try {
          await setDoc(doc(db, 'users', userId, 'writing_examples', id), localEx);
        } catch (err) {
          if (!isFirestoreOfflineError(err)) {
            handleFirestoreError(err, OperationType.WRITE, itemPath);
          }
        }
      }
    }

    // 2. Process Local Items missing from remote
    for (const [id, localEx] of localMap.entries()) {
      if (!remoteMap.has(id)) {
        const itemPath = `users/${userId}/writing_examples/${id}`;
        const payload = {
          ...localEx,
          updatedAt: localEx.updatedAt || localEx.createdAt || new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'users', userId, 'writing_examples', id), payload);
        } catch (err) {
          if (!isFirestoreOfflineError(err)) {
            handleFirestoreError(err, OperationType.WRITE, itemPath);
          }
        }
      }
    }
  }

  // --- HOOK FOR WRITES ON LOCAL EDITORIAL RULES TO TRIGGER SYNC ---

  public async notifyEditorialRulesUpdated(rules: string): Promise<void> {
    if (!this.state.currentUser || !this.state.isOnline) return;
    const userId = this.state.currentUser.uid;
    const docPath = `users/${userId}/settings/editorial_rules`;
    const docRef = doc(db, 'users', userId, 'settings', 'editorial_rules');

    const payload = {
      id: 'editorial_rules',
      rules,
      updatedAt: new Date().toISOString()
    };

    try {
      this.updateState({ status: 'syncing' });
      await setDoc(docRef, payload);
      this.updateState({ status: 'synced', lastSyncedAt: new Date(), errorMessage: null });
    } catch (err) {
      if (isFirestoreOfflineError(err)) {
        console.warn('[Firestore Offline] Editorial rules saved locally. Cloud sync pending connection.');
        this.updateState({ status: 'offline', errorMessage: 'Rules saved locally (offline mode).' });
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  public async notifyWritingExampleSaved(example: ApprovedWritingExample): Promise<void> {
    if (!this.state.currentUser || !this.state.isOnline) return;
    const userId = this.state.currentUser.uid;
    const docPath = `users/${userId}/writing_examples/${example.id}`;
    const docRef = doc(db, 'users', userId, 'writing_examples', example.id);

    const payload = {
      ...example,
      updatedAt: example.updatedAt || example.createdAt || new Date().toISOString(),
      deleted: false
    };

    try {
      this.updateState({ status: 'syncing' });
      await setDoc(docRef, payload);
      this.updateState({ status: 'synced', lastSyncedAt: new Date(), errorMessage: null });
    } catch (err) {
      if (isFirestoreOfflineError(err)) {
        this.updateState({ status: 'offline' });
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  public async notifyWritingExampleDeleted(exampleId: string): Promise<void> {
    if (!this.state.currentUser || !this.state.isOnline) return;
    const userId = this.state.currentUser.uid;
    const docPath = `users/${userId}/writing_examples/${exampleId}`;
    const docRef = doc(db, 'users', userId, 'writing_examples', exampleId);

    const tombstone = {
      id: exampleId,
      deleted: true,
      updatedAt: new Date().toISOString()
    };

    try {
      this.updateState({ status: 'syncing' });
      await setDoc(docRef, tombstone);
      this.updateState({ status: 'synced', lastSyncedAt: new Date(), errorMessage: null });
    } catch (err) {
      if (isFirestoreOfflineError(err)) {
        this.updateState({ status: 'offline' });
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  // --- BACKWARDS-COMPATIBILITY DEPRECATED METHODS ---

  public async notifyBrainUpdated(_brain?: unknown): Promise<void> {
    // Superseded by notifyEditorialRulesUpdated
  }

  public async notifyWritingGuidelinesUpdated(_guidelines?: unknown): Promise<void> {
    // Superseded by notifyEditorialRulesUpdated
  }
}

export const syncService = new FirebaseSyncService();
