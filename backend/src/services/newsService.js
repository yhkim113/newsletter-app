const axios = require('axios');
const naverConfig = require('../../config/naver');

// 지연 시간을 위한 유틸리티 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const searchNaverNews = async (query, startDate, endDate) => {
  const { clientId, clientSecret } = naverConfig;
  const display = 100; // 한 번에 가져올 뉴스 기사 수 (최대 100)
  const sort = 'date'; // 정렬 옵션 (sim: 정확도순, date: 날짜순)

  // 쿼리를 ' OR ' 기준으로 분리하고 각 키워드의 따옴표를 제거합니다.
  // 이 단계에서 제거하는 이유는 나중에 API 호출 시 다시 정확한 구문으로 추가할 것이기 때문입니다.
  const keywords = query.split(' OR ')
                       .map(kw => kw.replace(/^"|"$/g, '')) // 시작과 끝의 따옴표 제거
                       .filter(kw => kw.trim() !== ''); // 빈 문자열 제거

  let allArticles = [];
  const articleLinks = new Set(); // 중복 기사를 제거하기 위한 Set

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    if (keyword.trim() === '') continue; // 빈 키워드는 건너뜁니다.

    try {
      const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
        params: {
          query: `"${keyword}"`, // <<-- 이 부분이 중요합니다! 키워드를 다시 따옴표로 감싸서 정확한 구문 검색 요청
          display: display,
          sort: sort,
        },
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });

      response.data.items.forEach(item => {
        // 기사 링크를 기준으로 중복 확인
        if (!articleLinks.has(item.link)) {
          allArticles.push({
            title: item.title.replace(/<[^>]*>/g, ''),
            link: item.link,
            description: item.description.replace(/<[^>]*>/g, ''),
            pubDate: new Date(item.pubDate),
            source: item.originallink || '네이버 뉴스',
          });
          articleLinks.add(item.link);
        }
      });

    } catch (error) {
      console.error(`Error searching Naver news for keyword "${keyword}":`, error.response ? error.response.data : error.message);
      // 속도 제한 오류 발생 시 메시지를 좀 더 명확히 표시
      if (error.response && error.response.data && error.response.data.errorCode === '012') {
        console.warn(`Rate limit exceeded for keyword "${keyword}". Please try again after some time.`);
      }
    }

    // 다음 API 호출 전에 지연 시간 추가 (예: 300ms)
    // 마지막 키워드에는 지연을 추가하지 않아도 됩니다.
    if (i < keywords.length - 1) {
      await sleep(300); // 300밀리초(0.3초) 지연
    }
  }

  // 모든 기사를 날짜 내림차순으로 정렬
  allArticles.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  // 날짜 필터링 적용
  if (startDate && endDate) {
    const start = new Date(startDate);
    // endDate는 해당 날짜의 끝까지 포함하도록 시간을 설정합니다.
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    allArticles = allArticles.filter(article => {
      const articleDate = new Date(article.pubDate);
      return articleDate >= start && articleDate <= end;
    });
  }

  return allArticles;

};

module.exports = {
  searchNaverNews,
}; 