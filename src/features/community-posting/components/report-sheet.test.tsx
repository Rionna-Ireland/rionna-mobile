import type { ReportTarget } from '@/features/community-posting/types';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { Alert } from 'react-native';

import { ReportSheet } from '@/features/community-posting/components/report-sheet';

jest.mock('@/components/ui/modal', () => {
  const RN = jest.requireActual('react-native');
  return {
    Modal: ({ children }: { children: React.ReactNode }) => <RN.View>{children}</RN.View>,
    useModal: () => ({ ref: { current: null }, present: jest.fn(), dismiss: jest.fn() }),
  };
});

const mockReport = jest.fn();
let mockIsPending = false;

jest.mock('@/features/community-posting/api/use-report-content', () => ({
  useReportContent: () => ({ report: (...args: unknown[]) => mockReport(...args), isPending: mockIsPending }),
}));

const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

const POST_TARGET: ReportTarget = {
  surface: 'post',
  postId: 'post-1',
  spaceId: 'space-1',
  excerpt: 'Some post text',
  authorName: 'Jane Member',
};

const COMMENT_TARGET: ReportTarget = {
  surface: 'comment',
  postId: 'post-1',
  commentId: 'comment-1',
  spaceId: 'space-1',
  excerpt: 'Some comment text',
  authorName: 'Sam Member',
};

describe('reportSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('shows the four report reasons', () => {
    render(<ReportSheet scope={SCOPE} target={POST_TARGET} onClose={jest.fn()} />);
    expect(screen.getByLabelText('Spam')).toBeOnTheScreen();
    expect(screen.getByLabelText('Abusive')).toBeOnTheScreen();
    expect(screen.getByLabelText('Off topic')).toBeOnTheScreen();
    expect(screen.getByLabelText('Other')).toBeOnTheScreen();
  });

  it('only shows the note field when Other is selected', () => {
    render(<ReportSheet scope={SCOPE} target={POST_TARGET} onClose={jest.fn()} />);
    expect(screen.queryByLabelText('Report note')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Other'));
    expect(screen.getByLabelText('Report note')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Spam'));
    expect(screen.queryByLabelText('Report note')).not.toBeOnTheScreen();
  });

  it('sends a post report with the target fields and shows the thanks toast', async () => {
    mockReport.mockResolvedValue(true);
    const onClose = jest.fn();
    render(<ReportSheet scope={SCOPE} target={POST_TARGET} onClose={onClose} />);

    fireEvent.press(screen.getByLabelText('Abusive'));
    fireEvent.press(screen.getByLabelText('Send report'));
    await waitFor(() => expect(mockReport).toHaveBeenCalled());

    expect(mockReport).toHaveBeenCalledWith({
      surface: 'post',
      postId: 'post-1',
      commentId: undefined,
      spaceId: 'space-1',
      excerpt: 'Some post text',
      authorName: 'Jane Member',
      reason: 'abusive',
      note: undefined,
    });
    expect(Alert.alert).toHaveBeenCalledWith('Thanks — the club has been notified.');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sends a comment report with a trimmed note when Other is selected', async () => {
    mockReport.mockResolvedValue(true);
    render(<ReportSheet scope={SCOPE} target={COMMENT_TARGET} onClose={jest.fn()} />);

    fireEvent.press(screen.getByLabelText('Other'));
    fireEvent.changeText(screen.getByLabelText('Report note'), '  Keeps posting spam links  ');
    fireEvent.press(screen.getByLabelText('Send report'));
    await waitFor(() => expect(mockReport).toHaveBeenCalled());

    expect(mockReport).toHaveBeenCalledWith({
      surface: 'comment',
      postId: 'post-1',
      commentId: 'comment-1',
      spaceId: 'space-1',
      excerpt: 'Some comment text',
      authorName: 'Sam Member',
      reason: 'other',
      note: 'Keeps posting spam links',
    });
  });

  it('shows the failure copy and keeps the sheet open when the report fails', async () => {
    mockReport.mockResolvedValue(false);
    const onClose = jest.fn();
    render(<ReportSheet scope={SCOPE} target={POST_TARGET} onClose={onClose} />);

    fireEvent.press(screen.getByLabelText('Send report'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Couldn\'t send that report. Try again.'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets the reason and note when a new target is presented', () => {
    const { rerender } = render(<ReportSheet scope={SCOPE} target={POST_TARGET} onClose={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Other'));
    fireEvent.changeText(screen.getByLabelText('Report note'), 'Draft note');

    rerender(<ReportSheet scope={SCOPE} target={null} onClose={jest.fn()} />);
    rerender(<ReportSheet scope={SCOPE} target={COMMENT_TARGET} onClose={jest.fn()} />);

    expect(screen.queryByLabelText('Report note')).not.toBeOnTheScreen();
  });
});
