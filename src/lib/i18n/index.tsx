/* eslint-disable react-refresh/only-export-components */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from './resources';

export * from './utils';

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v4',

  interpolation: {
    escapeValue: false,
  },
});

export const isRTL = false;

export default i18n;
