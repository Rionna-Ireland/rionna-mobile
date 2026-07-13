import * as React from 'react';

import { cleanup, screen, setup } from '@/lib/test-utils';

import { MinimalAccountSheet } from './minimal-account-sheet';

afterEach(cleanup);

describe('minimalAccountSheet', () => {
  it('shows the signed-in member and signs out', async () => {
    const onSignOut = jest.fn();
    const { user } = setup(
      <MinimalAccountSheet
        visible={true}
        member={{ id: 'member-1', name: 'Ada Member', email: 'ada@example.com' }}
        onClose={jest.fn()}
        onSignOut={onSignOut}
      />,
    );

    expect(screen.getByText('Ada Member')).toBeOnTheScreen();
    expect(screen.getByText('ada@example.com')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
