import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  linkWithPopup,
  onIdTokenChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Signed in with Google (not just the anonymous account reporting uses).
export const isGoogleUser = (user) => Boolean(user && !user.isAnonymous && user.email);

export function useUser() {
  const [state, setState] = useState({ ready: false, user: null });
  useEffect(
    () =>
      // Token changes, not just auth state: linking an anonymous account to
      // Google keeps the uid, so only the refreshed token reveals the upgrade.
      onIdTokenChanged(auth, (user) => {
        // A fresh object so the profile (name, photo) re-renders after linking.
        setState({ ready: true, user: user ? { ...user, uid: user.uid, isAnonymous: user.isAnonymous } : null });
      }),
    [],
  );
  return state;
}

// Someone who reported anonymously keeps their uid, and so their reports, by
// linking Google to that account. If that Google account already exists, sign
// into it instead; the anonymous reports stay with the old, unlinked uid.
export async function signInWithGoogle() {
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      await linkWithPopup(current, provider);
    } catch (err) {
      if (err.code !== "auth/credential-already-in-use") throw err;
      const credential = GoogleAuthProvider.credentialFromError(err);
      await signInWithCredential(auth, credential);
    }
  } else {
    await signInWithPopup(auth, provider);
  }
  // Pull a fresh token so the security rules see the verified email right away.
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export const signOutUser = () => signOut(auth);

// Message for errors worth showing; closing the popup isn't one.
export function signInErrorMessage(err) {
  if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") return "";
  if (err?.code === "auth/popup-blocked") return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
  return "Couldn't sign in. Check your connection and try again.";
}
