import { clearEventsStorage } from '@/features/events/lib/events-logout';
import { queryClient } from '@/lib/api/query-client';
import { removeItemsWithPrefix } from '@/lib/storage';

jest.mock('@/lib/storage', () => ({
  removeItemsWithPrefix: jest.fn(),
}));

jest.mock('@/lib/api/query-client', () => ({
  queryClient: { removeQueries: jest.fn() },
}));

describe('clearEventsStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes every persisted events snapshot key and the in-memory events query cache', () => {
    clearEventsStorage();

    expect(removeItemsWithPrefix).toHaveBeenCalledWith('events-snapshot:');
    expect(queryClient.removeQueries).toHaveBeenCalledWith({ queryKey: ['events'] });
  });
});
