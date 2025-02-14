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
        await updateUserData(currentUser.uid, {
          settings: { version, isCustomSchedule },
        });
      }
      await auth.signOut();

      // If you still store some app data in localStorage that you want cleared:
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
