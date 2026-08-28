import { getItem, removeItemsWithPrefix, setItem, storage } from '@/lib/storage';

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getItem', () => {
    it('returns null when nothing is stored for the key', () => {
      (storage.getString as jest.Mock).mockReturnValue(undefined);
      expect(getItem('missing')).toBeNull();
    });

    it('returns the parsed value when a valid JSON string is stored', () => {
      (storage.getString as jest.Mock).mockReturnValue(JSON.stringify({ a: 1 }));
      expect(getItem('key')).toEqual({ a: 1 });
    });

    it('returns null instead of throwing when the stored value is corrupted', () => {
      (storage.getString as jest.Mock).mockReturnValue('{not valid json');
      expect(getItem('key')).toBeNull();
    });
  });

  describe('setItem', () => {
    it('stringifies the value before writing it to MMKV', async () => {
      await setItem('key', { a: 1 });
      expect(storage.set).toHaveBeenCalledWith('key', JSON.stringify({ a: 1 }));
    });
  });

  describe('removeItemsWithPrefix', () => {
    it('removes only the keys matching the given prefix', () => {
      (storage.getAllKeys as jest.Mock).mockReturnValue([
        'events-snapshot:org-1:member-1:upcoming',
        'events-snapshot:org-1:member-1:past',
        'member-content.v1:org-1:member-1',
      ]);

      removeItemsWithPrefix('events-snapshot:');

      expect(storage.remove).toHaveBeenCalledWith('events-snapshot:org-1:member-1:upcoming');
      expect(storage.remove).toHaveBeenCalledWith('events-snapshot:org-1:member-1:past');
      expect(storage.remove).not.toHaveBeenCalledWith('member-content.v1:org-1:member-1');
      expect(storage.remove).toHaveBeenCalledTimes(2);
    });

    it('removes nothing when no key matches the prefix', () => {
      (storage.getAllKeys as jest.Mock).mockReturnValue(['unrelated-key']);

      removeItemsWithPrefix('events-snapshot:');

      expect(storage.remove).not.toHaveBeenCalled();
    });
  });
});
