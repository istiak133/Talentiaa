import { useEffect } from 'react';

const BASE_TITLE = 'Talentiaa';

/**
 * Sets the document title for the current page.
 * Usage: usePageTitle('Dashboard') → "Dashboard — Talentiaa"
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE_TITLE}` : `${BASE_TITLE} — AI Recruitment Platform`;
    return () => { document.title = `${BASE_TITLE} — AI Recruitment Platform`; };
  }, [title]);
}
