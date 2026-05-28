'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import type { TabId } from './tab-bar';

type Props = {
  tabs: Partial<Record<TabId, ReactNode>>;
};

/**
 * Reads `?tab=X` from URL and renders the matching tab content.
 * Defaults to `overview`. Disabled tabs (e.g. `activity`) fall back
 * to the overview if URL points there.
 */
export function WorkspaceRoute({ tabs }: Props) {
  const params = useSearchParams();
  const which = (params.get('tab') ?? 'overview') as TabId;
  return <>{tabs[which] ?? tabs.overview}</>;
}
