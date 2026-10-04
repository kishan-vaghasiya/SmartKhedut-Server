const NEWS_LANGUAGES = Object.freeze({
  gu: 'gu',
  hi: 'hi',
  en: 'en',
});

const CATEGORY_SEARCH_TERMS = Object.freeze({
  agriculture: { gu: 'ખેતી', hi: 'किसान कृषि खेती', en: 'farmer agriculture farming' },
  farmer: { gu: 'ખેડૂત ખેડૂતો', hi: 'किसान', en: 'farmer farmers' },
  farming: { gu: 'ખેતી', hi: 'खेती', en: 'farming' },
  crop: { gu: 'પાક ખેતી', hi: 'फसल खेती', en: 'crop farming' },
  market: { gu: 'ખેતી બજાર ભાવ', hi: 'कृषि बाजार भाव', en: 'agricultural market prices' },
  'government-schemes': { gu: 'ખેડૂત સરકારી યોજના', hi: 'किसान सरकारी योजना', en: 'farmer government schemes' },
  weather: { gu: 'ખેતી હવામાન', hi: 'कृषि मौसम', en: 'agriculture weather' },
  gujarat: { gu: 'ગુજરાત ખેતી', hi: 'गुजरात कृषि', en: 'Gujarat agriculture' },
});

const CROP_SEARCH_TERMS = [
  { aliases: ['કપાસ', 'कपास', 'cotton'], terms: { gu: 'કપાસ', hi: 'कपास', en: 'cotton' } },
  { aliases: ['મગફળી', 'मूंगफली', 'groundnut'], terms: { gu: 'મગફળી', hi: 'मूंगफली', en: 'groundnut' } },
  { aliases: ['ડુંગળી', 'प्याज', 'onion'], terms: { gu: 'ડુંગળી', hi: 'प्याज', en: 'onion' } },
  { aliases: ['ઘઉં', 'गेहूं', 'wheat'], terms: { gu: 'ઘઉં', hi: 'गेहूं', en: 'wheat' } },
  { aliases: ['જીરૂ', 'जीरा', 'cumin'], terms: { gu: 'જીરૂ', hi: 'जीरा', en: 'cumin' } },
  { aliases: ['ચણા', 'चना', 'chickpea'], terms: { gu: 'ચણા', hi: 'चना', en: 'chickpea' } },
  { aliases: ['મગ', 'मूंग', 'moong'], terms: { gu: 'મગ', hi: 'मूंग', en: 'moong' } },
  { aliases: ['બાજરી', 'बाजरा', 'millet'], terms: { gu: 'બાજરી', hi: 'बाजरा', en: 'millet' } },
  { aliases: ['મકાઈ', 'मक्का', 'maize'], terms: { gu: 'મકાઈ', hi: 'मक्का', en: 'maize' } },
  { aliases: ['ટામેટા', 'टमाटर', 'tomato'], terms: { gu: 'ટામેટા', hi: 'टमाटर', en: 'tomato' } },
  { aliases: ['બટાકા', 'आलू', 'potato'], terms: { gu: 'બટાકા', hi: 'आलू', en: 'potato' } },
  { aliases: ['લસણ', 'लहसुन', 'garlic'], terms: { gu: 'લસણ', hi: 'लहसुन', en: 'garlic' } },
  { aliases: ['હળદર', 'हल्दी', 'turmeric'], terms: { gu: 'હળદર', hi: 'हल्दी', en: 'turmeric' } },
  { aliases: ['ધાણા', 'धनिया', 'coriander'], terms: { gu: 'ધાણા', hi: 'धनिया', en: 'coriander' } },
  { aliases: ['મરચાં', 'मिर्च', 'chilli'], terms: { gu: 'મરચાં', hi: 'मिर्च', en: 'chilli' } },
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