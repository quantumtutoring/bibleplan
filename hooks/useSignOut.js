// hooks/useSignOut.js
import { useRouter } from 'next/router';
import writeFireStore from './writeFireStore';
import { auth } from '../lib/firebase';

export default function useSignOut({ currentUser, version, isCustomSchedule, resetState }) {
  const router = useRouter();
  const { updateUserData } = writeFireStore();

  const signOut = async () => {
    try {
      if (currentUser) {
        const safeVersion = typeof version === 'undefined' ? 'nasb' : version;
        const safeIsCustomSchedule = typeof isCustomSchedule === 'undefined' ? false : isCustomSchedule;

        // Update only version and isCustomSchedule in Firestore.
        await updateUserData(currentUser.uid, {
          version: safeVersion,
          isCustomSchedule: safeIsCustomSchedule
        });
      }
      await auth.signOut();

      // Clear localStorage completely (clears local UI progress, etc.)
      localStorage.clear();

      // Reset local state if needed.
      if (resetState && typeof resetState === 'function') {
        resetState();
      }

      // Navigate to home and force a full reload.
      await router.replace('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return signOut;
}
