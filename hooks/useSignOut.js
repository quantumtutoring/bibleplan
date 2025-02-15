// hooks/useSignOut.js
import { useRouter } from 'next/router';
import writeFireStore from './writeFireStore';
import { auth } from '../lib/firebase';

export default function useSignOut({ currentUser, version, isCustomSchedule, resetState }) {
  const router = useRouter();
  const { updateUserData } = writeFireStore();

  const signOut = async () => {
    try {
      // If a user is signed in, update Firestore with the latest version and isCustomSchedule.
      if (currentUser) {
        const safeVersion = typeof version === 'undefined' ? 'nasb' : version;
        const safeIsCustomSchedule = typeof isCustomSchedule === 'undefined' ? false : isCustomSchedule;
        // Write only these two fields to Firestore.
        await updateUserData(currentUser.uid, {
          version: safeVersion,
          isCustomSchedule: safeIsCustomSchedule,
        });
      }

      // Sign out from Firebase Auth.
      await auth.signOut();

      // Clear localStorage completely.
      localStorage.clear();

      // Reset any local state if you passed a resetState callback.
      if (resetState && typeof resetState === 'function') {
        resetState();
      }

      // Navigate to home ("/") and force a full reload.
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return signOut;
}
