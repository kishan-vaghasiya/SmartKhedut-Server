const NEWS_LANGUAGES = Object.freeze({
  gu: 'gu',
  hi: 'hi',
  pa: 'pa',
  mr: 'mr',
  en: 'en',
});

const CATEGORY_SEARCH_TERMS = Object.freeze({
  agriculture: { gu: 'ખેતી', hi: 'किसान कृषि खेती', en: 'farmer agriculture farming', pa: 'ਖੇਤੀਬਾੜੀ ਕਿਸਾਨ ਖੇਤੀ', mr: 'शेती कृषी शेतकरी' },
  farmer: { gu: 'ખેડૂત ખેડૂતો', hi: 'किसान', en: 'farmer farmers', pa: 'ਕਿਸਾਨ', mr: 'शेतकरी' },
  farming: { gu: 'ખેતી', hi: 'खेती', en: 'farming', pa: 'ਖੇਤੀ', mr: 'शेती' },
  crop: { gu: 'પાક ખેતી', hi: 'फसल खेती', en: 'crop farming', pa: 'ਫ਼ਸਲ ਖੇਤੀ', mr: 'पीक शेती' },
  market: { gu: 'ખેતી બજાર ભાવ', hi: 'कृषि बाजार भाव', en: 'agricultural market prices', pa: 'ਖੇਤੀ ਮੰਡੀ ਭਾਅ', mr: 'शेती बाजारभाव' },
  'government-schemes': { gu: 'ખેડૂત સરકારી યોજના', hi: 'किसान सरकारी योजना', en: 'farmer government schemes', pa: 'ਕਿਸਾਨ ਸਰਕਾਰੀ ਯੋਜਨਾ', mr: 'शेतकरी सरकारी योजना' },
  weather: { gu: 'ખેતી હવામાન', hi: 'कृषि मौसम', en: 'agriculture weather', pa: 'ਖੇਤੀ ਮੌਸਮ', mr: 'शेती हवामान' },
  gujarat: { gu: 'ગુજરાત ખેતી', hi: 'गुजरात कृषि', en: 'Gujarat agriculture', pa: 'ਗੁਜਰਾਤ ਖੇਤੀ', mr: 'गुजरात शेती' },
});

const CROP_SEARCH_TERMS = [
  { aliases: ['કપાસ', 'कपास', 'cotton', 'ਕਪਾਹ', 'कापूस'], terms: { gu: 'કપાસ', hi: 'कपास', en: 'cotton', pa: 'ਕਪਾਹ', mr: 'कापूस' } },
  { aliases: ['મગફળી', 'मूंगफली', 'groundnut', 'ਮੂੰਗਫਲੀ', 'भुईमूग'], terms: { gu: 'મગફળી', hi: 'मूंगफली', en: 'groundnut', pa: 'ਮੂੰਗਫਲੀ', mr: 'भुईमूग' } },
  { aliases: ['ડુંગળી', 'प्याज', 'onion', 'ਪਿਆਜ਼', 'कांदा'], terms: { gu: 'ડુંગળી', hi: 'प्याज', en: 'onion', pa: 'ਪਿਆਜ਼', mr: 'कांदा' } },
  { aliases: ['ઘઉં', 'गेहूं', 'wheat', 'ਕਣਕ', 'गहू'], terms: { gu: 'ઘઉં', hi: 'गेहूं', en: 'wheat', pa: 'ਕਣਕ', mr: 'गहू' } },
  { aliases: ['જીરૂ', 'जीरा', 'cumin', 'ਜੀਰਾ', 'जिरे'], terms: { gu: 'જીરૂ', hi: 'जीरा', en: 'cumin', pa: 'ਜੀਰਾ', mr: 'जिरे' } },
  { aliases: ['ચણા', 'चना', 'chickpea', 'ਛੋਲੇ', 'हरभरा'], terms: { gu: 'ચણા', hi: 'चना', en: 'chickpea', pa: 'ਛੋਲੇ', mr: 'हरभरा' } },
  { aliases: ['મગ', 'मूंग', 'moong', 'ਮੂੰਗੀ', 'मूग'], terms: { gu: 'મગ', hi: 'मूंग', en: 'moong', pa: 'ਮੂੰਗੀ', mr: 'मूग' } },
  { aliases: ['બાજરી', 'बाजरा', 'millet', 'ਬਾਜਰਾ', 'बाजरी'], terms: { gu: 'બાજરી', hi: 'बाजरा', en: 'millet', pa: 'ਬਾਜਰਾ', mr: 'बाजरी' } },
  { aliases: ['મકાઈ', 'मक्का', 'maize', 'ਮੱਕੀ', 'मका'], terms: { gu: 'મકાઈ', hi: 'मक्का', en: 'maize', pa: 'ਮੱਕੀ', mr: 'मका' } },
  { aliases: ['ટામેટા', 'टमाटर', 'tomato', 'ਟਮਾਟਰ', 'टोमॅटो'], terms: { gu: 'ટામેટા', hi: 'टमाटर', en: 'tomato', pa: 'ਟਮਾਟਰ', mr: 'टोमॅटो' } },
  { aliases: ['બટાકા', 'आलू', 'potato', 'ਆਲੂ', 'बटाटा'], terms: { gu: 'બટાકા', hi: 'आलू', en: 'potato', pa: 'ਆਲੂ', mr: 'बटाटा' } },
  { aliases: ['લસણ', 'लहसुन', 'garlic', 'ਲਸਣ', 'लसूण'], terms: { gu: 'લસણ', hi: 'लहसुन', en: 'garlic', pa: 'ਲਸਣ', mr: 'लसूण' } },
  { aliases: ['હળદર', 'हल्दी', 'turmeric', 'ਹਲਦੀ', 'हळद'], terms: { gu: 'હળદર', hi: 'हल्दी', en: 'turmeric', pa: 'ਹਲਦੀ', mr: 'हळद' } },
  { aliases: ['ધાણા', 'धनिया', 'coriander', 'ਧਨੀਆ', 'कोथिंबीर'], terms: { gu: 'ધાણા', hi: 'धनिया', en: 'coriander', pa: 'ਧਨੀਆ', mr: 'कोथिंबीर' } },
  { aliases: ['મરચાં', 'मिर्च', 'chilli', 'ਮਿਰਚ', 'मिरची'], terms: { gu: 'મરચાં', hi: 'मिर्च', en: 'chilli', pa: 'ਮਿਰਚ', mr: 'मिरची' } },
];

const cropCategories = new Map();
for (const crop of CROP_SEARCH_TERMS) {
  for (const alias of crop.aliases) cropCategories.set(alias.toLocaleLowerCase(), crop.terms);
}

const SUPPORTED_CATEGORIES = new Set([
  'all',
  ...Object.keys(CATEGORY_SEARCH_TERMS),
  ...cropCategories.keys(),
]);

function getCategorySearchTerm(category, language) {
  if (!category || category === 'all') return null;

  const normalizedCategory = category.toLocaleLowerCase();
  const categoryTerms = CATEGORY_SEARCH_TERMS[normalizedCategory] || cropCategories.get(normalizedCategory);
  return categoryTerms ? categoryTerms[language] : null;
}

module.exports = { NEWS_LANGUAGES, SUPPORTED_CATEGORIES, getCategorySearchTerm };