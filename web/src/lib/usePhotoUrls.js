import { useEffect, useState } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "../firebase";

export default function usePhotoUrls(paths) {
  const [urls, setUrls] = useState([]);
  // Join to a string so a new-but-equal array from Firestore doesn't refetch.
  const key = paths.join("|");
  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split("|") : [];
    const load = (p) =>
      getDownloadURL(ref(storage, p)).catch((err) => {
        console.warn("Photo URL failed", p, err.code);
        return null;
      });
    Promise.all(list.map(load)).then(
      (result) => !cancelled && setUrls(result.filter(Boolean)),
    );
    return () => {
      cancelled = true;
    };
  }, [key]);
  return urls;
}
