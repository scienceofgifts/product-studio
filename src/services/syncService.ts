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
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { dbService } from './db';
import { BusinessBrainData, WritingGuidelinesSettings, ApprovedWritingExample } from '../types';

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
        await this.startRealtimeListeners(user.uid);
        await this.syncAll(user.uid);
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
      this.syncAll(this.state.currentUser.uid).catch(console.error);
    } else if (!isOnline) {
      this.updateState({ status: 'offline' });
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

    // 1. Business Brain Listener
    const brainDocRef = doc(db, 'users', userId, 'settings', 'business_brain');
    const unsubBrain = onSnapshot(
      brainDocRef,
      async (snapshot) => {
        if (this.isInitialSyncing) return;
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as BusinessBrainData & { id?: string };
          const localData = await dbService.getBusinessBrain();

          const remoteTime = remoteData.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;
          const localTime = localData.updatedAt ? new Date(localData.updatedAt).getTime() : 0;

          if (remoteTime > localTime) {
            await dbService.saveBusinessBrain(remoteData);
            this.notifyDataChanged();
          }
        }
      },
      (error) => {
        console.error('Business brain sync snapshot error:', error);
      }
    );
    this.unsubscribers.push(unsubBrain);

    // 2. Writing Guidelines Listener
    const guidelinesDocRef = doc(db, 'users', userId, 'settings', 'writing_guidelines');
    const unsubGuidelines = onSnapshot(
      guidelinesDocRef,
      async (snapshot) => {
        if (this.isInitialSyncing) return;
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as WritingGuidelinesSettings & { id?: string };
          const localData = await dbService.getWritingGuidelines();

          const remoteTime = remoteData.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;
          const localTime = localData.updatedAt ? new Date(localData.updatedAt).getTime() : 0;

          if (remoteTime > localTime) {
            await dbService.saveWritingGuidelines(remoteData);
            this.notifyDataChanged();
          }
        }
      },
      (error) => {
        console.error('Writing guidelines sync snapshot error:', error);
      }
    );
    this.unsubscribers.push(unsubGuidelines);

    // 3. Writing Examples Collection Listener
    const examplesColRef = collection(db, 'users', userId, 'writing_examples');
    const unsubExamples = onSnapshot(
      examplesColRef,
      async (snapshot) => {
        if (this.isInitialSyncing) return;
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
      },
      (error) => {
        console.error('Writing examples sync snapshot error:', error);
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
        this.syncBusinessBrain(userId),
        this.syncWritingGuidelines(userId),
        this.syncWritingExamples(userId)
      ]);

      this.updateState({
        status: 'synced',
        lastSyncedAt: new Date(),
        errorMessage: null
      });
      this.notifyDataChanged();
    } catch (error: unknown) {
      console.error('Sync failed:', error);
      this.updateState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Synchronization failed.'
      });
    } finally {
      this.isInitialSyncing = false;
    }
  }

  // --- CATEGORY 1: BUSINESS BRAIN SYNC ---

  private async syncBusinessBrain(userId: string): Promise<void> {
    const localBrain = await dbService.getBusinessBrain();
    const docPath = `users/${userId}/settings/business_brain`;
    const docRef = doc(db, 'users', userId, 'settings', 'business_brain');

    let remoteSnap;
    try {
      remoteSnap = await getDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }

    if (!remoteSnap.exists()) {
      // Push local to remote if local brain exists
      if (localBrain) {
        const payload = {
          ...localBrain,
          id: 'business_brain',
          updatedAt: localBrain.updatedAt || new Date().toISOString()
        };
        try {
          await setDoc(docRef, payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, docPath);
        }
      }
    } else {
      const remoteBrain = remoteSnap.data() as BusinessBrainData & { id?: string };
      const remoteTime = remoteBrain.updatedAt ? new Date(remoteBrain.updatedAt).getTime() : 0;
      const localTime = localBrain?.updatedAt ? new Date(localBrain.updatedAt).getTime() : 0;

      if (remoteTime > localTime) {
        await dbService.saveBusinessBrain(remoteBrain);
      } else if (localTime > remoteTime && localBrain) {
        const payload = {
          ...localBrain,
          id: 'business_brain',
          updatedAt: localBrain.updatedAt
        };
        try {
          await setDoc(docRef, payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, docPath);
        }
      }
    }
  }

  // --- CATEGORY 2A: WRITING GUIDELINES SYNC ---

  private async syncWritingGuidelines(userId: string): Promise<void> {
    const localGuidelines = await dbService.getWritingGuidelines();
    const docPath = `users/${userId}/settings/writing_guidelines`;
    const docRef = doc(db, 'users', userId, 'settings', 'writing_guidelines');

    let remoteSnap;
    try {
      remoteSnap = await getDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }

    if (!remoteSnap.exists()) {
      if (localGuidelines) {
        const payload = {
          ...localGuidelines,
          id: 'writing_guidelines',
          updatedAt: localGuidelines.updatedAt || new Date().toISOString()
        };
        try {
          await setDoc(docRef, payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, docPath);
        }
      }
    } else {
      const remoteGuidelines = remoteSnap.data() as WritingGuidelinesSettings & { id?: string };
      const remoteTime = remoteGuidelines.updatedAt ? new Date(remoteGuidelines.updatedAt).getTime() : 0;
      const localTime = localGuidelines?.updatedAt ? new Date(localGuidelines.updatedAt).getTime() : 0;

      if (remoteTime > localTime) {
        await dbService.saveWritingGuidelines(remoteGuidelines);
      } else if (localTime > remoteTime && localGuidelines) {
        const payload = {
          ...localGuidelines,
          id: 'writing_guidelines',
          updatedAt: localGuidelines.updatedAt
        };
        try {
          await setDoc(docRef, payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, docPath);
        }
      }
    }
  }

  // --- CATEGORY 2B: WRITING EXAMPLES SYNC ---

  private async syncWritingExamples(userId: string): Promise<void> {
    const localExamples = await dbService.getWritingExamples();
    const colPath = `users/${userId}/writing_examples`;
    const colRef = collection(db, 'users', userId, 'writing_examples');

    let remoteSnaps;
    try {
      remoteSnaps = await getDocs(colRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, colPath);
    }

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
          handleFirestoreError(err, OperationType.WRITE, itemPath);
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
          handleFirestoreError(err, OperationType.WRITE, itemPath);
        }
      }
    }
  }

  // --- HOOK FOR WRITES ON LOCAL SETTINGS TO TRIGGER SYNC ---

  public async notifyBrainUpdated(brain: BusinessBrainData): Promise<void> {
    if (!this.state.currentUser || !this.state.isOnline) return;
    const userId = this.state.currentUser.uid;
    const docPath = `users/${userId}/settings/business_brain`;
    const docRef = doc(db, 'users', userId, 'settings', 'business_brain');

    const payload = {
      ...brain,
      id: 'business_brain',
      updatedAt: brain.updatedAt || new Date().toISOString()
    };

    try {
      this.updateState({ status: 'syncing' });
      await setDoc(docRef, payload);
      this.updateState({ status: 'synced', lastSyncedAt: new Date(), errorMessage: null });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  public async notifyWritingGuidelinesUpdated(guidelines: WritingGuidelinesSettings): Promise<void> {
    if (!this.state.currentUser || !this.state.isOnline) return;
    const userId = this.state.currentUser.uid;
    const docPath = `users/${userId}/settings/writing_guidelines`;
    const docRef = doc(db, 'users', userId, 'settings', 'writing_guidelines');

    const payload = {
      ...guidelines,
      id: 'writing_guidelines',
      updatedAt: guidelines.updatedAt || new Date().toISOString()
    };

    try {
      this.updateState({ status: 'syncing' });
      await setDoc(docRef, payload);
      this.updateState({ status: 'synced', lastSyncedAt: new Date(), errorMessage: null });
    } catch (err) {
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
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }
}

export const syncService = new FirebaseSyncService();
