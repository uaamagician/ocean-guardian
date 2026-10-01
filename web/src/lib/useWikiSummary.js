import { useEffect, useState } from "react";

const cache = new Map();

// Wikipedia's REST summary endpoint allows browser calls and returns a short
// extract plus a lead image.
function fetchSummary(title) {
  if (!cache.has(title)) {
    cache.set(
      title,
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) =>
          json?.extract
            ? {
                extract: json.extract,
                image: json.thumbnail?.source ?? null,
                url: json.content_urls?.desktop?.page ?? null,
              }
            : null,
        )
        .catch(() => {
          cache.delete(title);
          return null;
        }),
    );
  }
  return cache.get(title);
}

export default function useWikiSummary(title) {
  const [state, setState] = useState({ title: null, summary: null });
  useEffect(() => {
    if (!title) return undefined;
    let cancelled = false;
    fetchSummary(title).then((summary) => !cancelled && setState({ title, summary }));
    return () => {
      cancelled = true;
    };
  }, [title]);
  if (!title) return { loading: false, summary: null };
  return state.title === title ? { loading: false, summary: state.summary } : { loading: true, summary: null };
}
