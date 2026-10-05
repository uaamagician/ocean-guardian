// The site is English only, so text other people will read (titles, names,
// notes) and anything shown from stored data stays free of CJK characters.
const CJK = /[　-鿿가-힯＀-￯]/;

export const hasCjk = (text) => typeof text === "string" && CJK.test(text);
export const isEnglish = (text) => typeof text === "string" && !CJK.test(text);

export const ENGLISH_ONLY = "Please write this in English so every volunteer can read it.";

// The Google profile name if it's written in English, otherwise nothing.
export const englishName = (user) => (isEnglish(user?.displayName) ? user.displayName : "");

// What to call someone on screen: their English name, or else their email.
export const shownName = (user) => englishName(user) || user?.email || "";
