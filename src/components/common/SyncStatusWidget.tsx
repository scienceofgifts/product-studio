/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, LogIn, LogOut, CheckCircle2, AlertCircle, WifiOff, User as UserIcon } from 'lucide-react';
import { syncService, SyncState } from '../../services/syncService';
import { signInWithGoogle, logoutUser } from '../../services/firebase';

interface SyncStatusWidgetProps {
  compact?: boolean;
}

export const SyncStatusWidget: React.FC<SyncStatusWidgetProps> = ({ compact = false }) => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  useEffect(() => {
    const unsub = syncService.subscribeState((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  const handleSignIn = async () => {
    try {
      setIsAuthorizing(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in failed:', err);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const handleManualSync = () => {
    syncService.triggerManualSync();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        {syncState.currentUser ? (
          <div className="flex items-center gap-1 sm:gap-2 bg-stone-100/80 px-1.5 sm:px-2.5 py-1 rounded-full border border-stone-200">
            {syncState.status === 'syncing' && (
              <span className="flex items-center gap-1 text-blue-700 font-medium whitespace-nowrap shrink-0">
                <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                <span className="hidden min-[380px]:inline">Syncing</span>
              </span>
            )}
            {syncState.status === 'synced' && (
              <span className="flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap shrink-0" title="Business Brain & Guidelines synchronized with Cloud Firestore">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="hidden min-[380px]:inline">Synced</span>
              </span>
            )}
            {syncState.status === 'offline' && (
              <span className="flex items-center gap-1 text-amber-700 font-medium whitespace-nowrap shrink-0" title="Device is offline. Changes cached locally in IndexedDB">
                <WifiOff className="w-3 h-3 shrink-0" />
                <span className="hidden min-[380px]:inline">Offline</span>
              </span>
            )}
            {syncState.status === 'error' && (
              <span className="flex items-center gap-1 text-red-700 font-medium whitespace-nowrap shrink-0" title={syncState.errorMessage || 'Sync error'}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="hidden min-[380px]:inline">Sync Error</span>
              </span>
            )}
            {syncState.status === 'idle' && (
              <span className="flex items-center gap-1 text-stone-600 font-medium whitespace-nowrap shrink-0">
                <Cloud className="w-3 h-3 shrink-0" />
                <span className="hidden min-[380px]:inline">Ready</span>
              </span>
            )}

            <button
              onClick={handleManualSync}
              disabled={syncState.status === 'syncing' || !syncState.isOnline}
              className="p-0.5 hover:text-stone-900 text-stone-500 rounded transition-colors disabled:opacity-40 shrink-0"
              title="Manual Sync Now"
            >
              <RefreshCw className="w-3 h-3" />
            </button>

            <span className="w-px h-3 bg-stone-300 mx-0.5 shrink-0" />

            <div className="flex items-center gap-1 sm:gap-1.5 text-stone-700 font-medium max-w-[50px] min-[380px]:max-w-[80px] sm:max-w-[120px] truncate shrink" title={syncState.currentUser.email || ''}>
              {syncState.currentUser.photoURL ? (
                <img src={syncState.currentUser.photoURL} alt="User Avatar" className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              )}
              <span className="truncate">{syncState.currentUser.displayName?.split(' ')[0] || syncState.currentUser.email?.split('@')[0]}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="p-0.5 text-stone-400 hover:text-red-600 transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={isAuthorizing}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-full transition-colors whitespace-nowrap shrink-0"
            title="Sign in with Google to sync Business Brain & Writing Guidelines"
          >
            <LogIn className="w-3 h-3 text-[#1E3A8A] shrink-0" />
            <span>{isAuthorizing ? 'Signing in...' : 'Sign In'}<span className="hidden sm:inline"> to Sync</span></span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-stone-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#1E3A8A]" />
            <h4 className="font-semibold text-sm text-stone-900">Cloud Firestore Synchronization</h4>
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-blue-100 text-[#1E3A8A]">
              Selected Settings
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1 max-w-xl">
            Synchronizes <span className="font-medium text-stone-900">Business Brand / Brain</span> and <span className="font-medium text-stone-900">Writing Guidelines & Style Profiles</span> across your devices. Products, images, and working drafts remain stored safely in your local browser cache (IndexedDB).
          </p>
        </div>

        <div>
          {syncState.currentUser ? (
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-stone-200 shadow-xs">
                {syncState.currentUser.photoURL ? (
                  <img src={syncState.currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4 text-stone-500" />
                )}
                <span className="text-xs font-medium text-stone-800">{syncState.currentUser.email}</span>
                <button
                  onClick={handleSignOut}
                  className="ml-2 px-2 py-1 text-xs font-medium text-stone-600 hover:text-red-600 hover:bg-stone-100 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500">Status:</span>
                {syncState.status === 'synced' && (
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                  </span>
                )}
                {syncState.status === 'syncing' && (
                  <span className="flex items-center gap-1 font-semibold text-blue-700">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing...
                  </span>
                )}
                {syncState.status === 'offline' && (
                  <span className="flex items-center gap-1 font-semibold text-amber-700">
                    <WifiOff className="w-3.5 h-3.5" /> Offline Mode
                  </span>
                )}
                {syncState.status === 'error' && (
                  <span className="flex items-center gap-1 font-semibold text-red-700">
                    <AlertCircle className="w-3.5 h-3.5" /> Sync Error
                  </span>
                )}

                <button
                  onClick={handleManualSync}
                  disabled={syncState.status === 'syncing' || !syncState.isOnline}
                  className="flex items-center gap-1 ml-2 px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-medium rounded transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isAuthorizing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAuthorizing ? 'Signing in...' : 'Sign In with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {syncState.errorMessage && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncState.errorMessage}</span>
        </div>
      )}
    </div>
  );
};
