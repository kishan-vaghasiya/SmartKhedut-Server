const asyncHandler = require('../middleware/asyncHandler');
const { NEWS_LANGUAGES, SUPPORTED_CATEGORIES, getCategorySearchTerm } = require('../config/news');

const NEWS_API_URL = 'https://newsdata.io/api/1/latest';
const NEWS_API_TIMEOUT_MS = 10000;

function validationError(res, message) {
  return res.status(400).json({ success: false, message, data: [] });
}

function unavailableError(res, statusCode = 502) {
  return res.status(statusCode).json({
    success: false,
    message: 'Unable to fetch news at the moment',
    data: [],
  });
}

function configurationError(res) {
  return res.status(503).json({
    success: false,
    message: 'News service is not configured',
    data: [],
  });
}

function mapArticle(article, requestedLanguage) {
  return {
    id: article.article_id || article.link || null,
    title: article.title || null,
    description: article.description || null,
    image: article.image_url || null,
    url: article.link || null,
    source: article.source_name || null,
    sourceUrl: article.source_url || null,
    language: requestedLanguage,
    publishedAt: article.pubDate || null,
    keywords: Array.isArray(article.keywords) ? article.keywords : [],
  };
}

const getNews = asyncHandler(async (req, res) => {
  const language = req.query.language === undefined ? 'gu' : req.query.language;
  const category = req.query.category;
  const query = req.query.q;
  const page = req.query.page;

  console.log('[News] request', {
    language,
    category: category || 'all',
    hasCustomQuery: Boolean(query),
    hasPageToken: Boolean(page),
  });

  if (typeof language !== 'string' || !Object.hasOwn(NEWS_LANGUAGES, language)) {
    return validationError(res, 'language must be one of: gu, hi, en');
  }
  if (category !== undefined && (
    typeof category !== 'string'
    || !SUPPORTED_CATEGORIES.has(category.trim().toLocaleLowerCase())
  )) {
    return validationError(res, 'category is not supported');
  }
  if (query !== undefined && (
    typeof query !== 'string'
    || !query.trim()
    || query.trim().length > 200
  )) {
    return validationError(res, 'q must be between 1 and 200 characters');
  }
  if (page !== undefined && (
    typeof page !== 'string'
    || !page.trim()
    || page.length > 1000
    || /[\u0000-\u001f\u007f]/.test(page)
  )) {
    return validationError(res, 'page is invalid');
  }

  const apiKey = process.env.NEWSDATA_API_KEY;
  if (
    !apiKey
    || apiKey === 'YOUR_API_KEY'
    || apiKey === 'YOUR_NEW_NEWSDATA_API_KEY'
    || apiKey === 'YOUR_NEW_API_KEY'
  ) {
    console.error('[News] NEWSDATA_API_KEY is missing or still a placeholder');
    return configurationError(res);
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    country: 'in',
    language: NEWS_LANGUAGES[language],
  });
  const categoryQuery = query?.trim()
    || getCategorySearchTerm(category?.trim(), language)
    || getCategorySearchTerm('farmer', language);
  if (categoryQuery) params.set('q', categoryQuery);
  if (page !== undefined) params.set('page', page);

  try {
    const response = await fetch(`${NEWS_API_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(NEWS_API_TIMEOUT_MS),
    });
    console.log('[News] upstream response', { status: response.status, ok: response.ok });
    if (!response.ok) return unavailableError(res);

    const payload = await response.json();
    if (payload.status !== 'success' || !Array.isArray(payload.results)) {
      console.error('[News] upstream payload was unsuccessful', {
        status: payload.status,
        hasResults: Array.isArray(payload.results),
      });
      return unavailableError(res);
    }

    const articles = payload.results.map((article) => mapArticle(article, language));
    console.log('[News] mapped articles', {
      count: articles.length,
      totalResults: Number.isFinite(payload.totalResults) ? payload.totalResults : 0,
      hasNextPage: Boolean(payload.nextPage),
    });
    console.log('[News] article preview', articles.slice(0, 3).map(({ id, title, url, source }) => ({
      id,
      title,
      url,
      source,
    })));

    return res.json({
      success: true,
      message: 'News fetched successfully',
      data: articles,
      pagination: {
        totalResults: Number.isFinite(payload.totalResults) ? payload.totalResults : 0,
        nextPage: payload.nextPage || null,
      },
    });
  } catch (err) {
    console.error('[News] upstream request failed', { name: err.name });
    return unavailableError(res, err.name === 'TimeoutError' || err.name === 'AbortError' ? 504 : 502);
  }
});

module.exports = { getNews };