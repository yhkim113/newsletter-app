const axios = require('axios');
const naverConfig = require('../../config/naver');

// 캐시를 위한 Map 객체
const cache = new Map();
const CACHE_DURATION = 1000 * 60 * 30; // 30분 캐시

// 지연 시간을 위한 유틸리티 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 단일 키워드 검색 함수
const searchSingleKeyword = async (keyword, display, sort) => {
  const { clientId, clientSecret } = naverConfig;
  
  try {
    const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      params: {
        query: `"${keyword}"`,
        display: display,
        sort: sort,
      },
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    return response.data.items.map(item => ({
      title: item.title.replace(/<[^>]*>/g, ''),
      link: item.link,
      description: item.description.replace(/<[^>]*>/g, ''),
      pubDate: new Date(item.pubDate),
      source: item.originallink || '네이버 뉴스',
    }));
  } catch (error) {
    console.error(`Error searching Naver news for keyword "${keyword}":`, error.response ? error.response.data : error.message);
    if (error.response && error.response.data && error.response.data.errorCode === '012') {
      console.warn(`Rate limit exceeded for keyword "${keyword}". Please try again after some time.`);
    }
    return [];
  }
};

const searchNaverNews = async (query, startDate, endDate) => {
  const display = 100;
  const sort = 'date';

  // 쿼리를 ' OR ' 기준으로 분리
  const keywords = query.split(' OR ')
    .map(kw => kw.replace(/^"|"$/g, ''))
    .filter(kw => kw.trim() !== '');

  // 캐시 키 생성
  const cacheKey = `${query}-${startDate}-${endDate}`;
  const cachedResult = cache.get(cacheKey);
  
  if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
    return cachedResult.data;
  }

  let allArticles = [];
  const articleLinks = new Set();

  // 키워드를 3개씩 그룹화하여 병렬 처리
  for (let i = 0; i < keywords.length; i += 3) {
    const keywordGroup = keywords.slice(i, i + 3);
    const searchPromises = keywordGroup.map(keyword => searchSingleKeyword(keyword, display, sort));
    
    const results = await Promise.all(searchPromises);
    
    results.forEach(articles => {
      articles.forEach(article => {
        if (!articleLinks.has(article.link)) {
          allArticles.push(article);
          articleLinks.add(article.link);
        }
      });
    });

    // API 호출 간 지연 시간 추가 (마지막 그룹 제외)
    if (i + 3 < keywords.length) {
      await sleep(300);
    }
  }

  // 날짜 필터링
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    allArticles = allArticles.filter(article => {
      const articleDate = new Date(article.pubDate);
      return articleDate >= start && articleDate <= end;
    });
  }

  // 날짜순 정렬
  allArticles.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  // 결과 캐싱
  cache.set(cacheKey, {
    data: allArticles,
    timestamp: Date.now()
  });

  return allArticles;
};

module.exports = {
  searchNaverNews,
}; 