import * as React from 'react';

import { showErrorMessage } from '@/components/ui/utils';

type QueryLike = { isError: boolean; data: unknown; errorUpdatedAt: number };

/**
 * A refetch that fails while cached data is on screen (offline pull, A-006)
 * keeps the content and shows one quiet notice instead of the error page.
 * Fires once per failure (keyed on `errorUpdatedAt`).
 */
export function useRefetchFailureNotice(query: QueryLike, message: string) {
  const { isError, data, errorUpdatedAt } = query;
  const shownFor = React.useRef(0);
  const hasData = data !== undefined;
  React.useEffect(() => {
    if (!isError || !hasData || errorUpdatedAt === shownFor.current)
      return;
    shownFor.current = errorUpdatedAt;
    showErrorMessage(message);
  }, [isError, hasData, errorUpdatedAt, message]);
}
