import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { ComposePostScreen } from '@/features/community-posting/screens/compose-post-screen';

/**
 * `post/new` is presented as a native iOS modal, which sits above the root
 * view where the app-wide BottomSheetModalProvider hosts its sheets — so a
 * sheet hosted there would render *behind* this screen. Host the composer's
 * space-picker sheet inside the modal's own view hierarchy instead.
 */
export default function NewPostRoute() {
  return (
    <BottomSheetModalProvider>
      <ComposePostScreen />
    </BottomSheetModalProvider>
  );
}
