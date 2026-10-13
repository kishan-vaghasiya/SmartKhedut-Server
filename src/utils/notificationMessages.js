// Server-side copies of the password-reset decision texts, in the same three
// languages the mobile app supports (en / gu / hi). The device language is sent
// by the app with the reset request, so the push the user sees on the lock
// screen is in their own language.

const SUPPORTED_LANGUAGES = ['en', 'gu', 'hi'];

const PASSWORD_RESET_MESSAGES = {
  en: {
    approved: {
      title: 'Password reset approved',
      body: 'Your password reset was approved. You can sign in with the new password you submitted.',
    },
    rejected: {
      title: 'Password reset not approved',
      body: 'Your password reset was not approved. Please contact support.',
    },
  },
  gu: {
    approved: {
      title: 'પાસવર્ડ રીસેટ મંજૂર થયો',
      body: 'તમારો પાસવર્ડ રીસેટ મંજૂર થયો છે. તમે સબમિટ કરેલા નવા પાસવર્ડથી સાઇન ઇન કરી શકો છો.',
    },
    rejected: {
      title: 'પાસવર્ડ રીસેટ મંજૂર થયો નથી',
      body: 'તમારો પાસવર્ડ રીસેટ મંજૂર થયો નથી. કૃપા કરીને સપોર્ટનો સંપર્ક કરો.',
    },
  },
  hi: {
    approved: {
      title: 'पासवर्ड रीसेट स्वीकृत',
      body: 'आपका पासवर्ड रीसेट स्वीकृत हो गया है। आपके द्वारा दिए गए नए पासवर्ड से साइन इन करें।',
    },
    rejected: {
      title: 'पासवर्ड रीसेट स्वीकृत नहीं हुआ',
      body: 'आपका पासवर्ड रीसेट स्वीकृत नहीं हुआ। कृपया सहायता टीम से संपर्क करें।',
    },
  },
};

function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
}

function getPasswordResetMessage(status, language) {
  const messages = PASSWORD_RESET_MESSAGES[normalizeLanguage(language)];
  return status === 'approved' ? messages.approved : messages.rejected;
}

module.exports = { SUPPORTED_LANGUAGES, normalizeLanguage, getPasswordResetMessage };
