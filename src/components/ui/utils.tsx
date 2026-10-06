/* eslint-disable react-refresh/only-export-components */
import { Dimensions, Platform } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { translate } from '@/lib/i18n';

export const IS_IOS = Platform.OS === 'ios';
const { width, height } = Dimensions.get('screen');

export const WIDTH = width;
export const HEIGHT = height;

/** How long a toast stays up (ms). Not motion: a reading time. */
export const TOAST_READ_MS = 4000;

/** Shows the branded danger toast (`Toaster`, A-037). */
export function showErrorMessage(message: string = translate('common.errorTitle')) {
  showMessage({
    message,
    type: 'danger',
    duration: TOAST_READ_MS,
  });
}
