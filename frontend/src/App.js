import React, { useState, useEffect } from 'react';
import './App.css';

// 각 그룹별 키워드 정의
const keywordGroups = {
  경쟁사: [
    "메사쿠어", "한국인식산업", "유니버스AI", "인지소프트", "씨유박스", "페이스피(한컴)",
    "포지큐브", "컴트루 AI", "아르고스 아이덴티티 코리아", "달파 AI", "위시켓",
    "스파르타빌더스", "그릿지", "기묘한자동화", "인피닉", "에이모", "크라우드웍스",
    "테스트웍스", "셀렉트스타", "데이터메이커"
  ],
  산업: [
    "안면인식 AI기술동향", "금융권안면인식", "은행안면인식", "안면결제",
    "데이터라벨링 시장", "데이터라벨링 기술동향"
  ],
  고객사: [
    "은행비대면",
    "비대면실명인증",
    "안면결제"
  ]
};

// 키워드 배열을 'OR'로 연결된 문자열로 변환하는 함수
const getCombinedKeywords = (groupName) => {
  const keywords = keywordGroups[groupName];
  if (!keywords || keywords.length === 0) return "";
  // 각 키워드를 따옴표로 묶어서 정확도를 높이고 OR로 연결
  return keywords.map(kw => `"${kw}"`).join(" OR ");
};

function App() {
  const [keyword, setKeyword] = useState('');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeGroup, setActiveGroup] = useState(null); // 활성화된 그룹 버튼 상태

  // 오늘 날짜를 YYYY-MM-DD 형식으로 반환
  const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // n일 전 날짜를 YYYY-MM-DD 형식으로 반환
  const getDateBefore = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  // 컴포넌트가 처음 로드될 때 날짜 범위 초기화
  useEffect(() => {
    setEndDate(getToday());
    setStartDate(getDateBefore(7));
  }, []);

  // 날짜 범위 설정 함수
  const setDateRange = (days) => {
    setEndDate(getToday());
    setStartDate(getDateBefore(days));
  };

  // 그룹 버튼 클릭 핸들러
  const handleGroupClick = (groupName) => {
      const combinedKeywords = getCombinedKeywords(groupName);
      setKeyword(combinedKeywords); // 검색 입력창에도 키워드 표시
      setActiveGroup(groupName); // 클릭된 버튼 활성화 상태로 설정
      searchNews(combinedKeywords); // 해당 키워드로 뉴스 검색 실행
  };

  // 뉴스 검색 함수 (키워드를 인자로 받을 수 있도록 수정)
  const searchNews = async (searchKeyword = keyword) => {
    if (!searchKeyword) return; // 인자로 받은 키워드 또는 현재 keyword state 사용

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/news/search?keyword=${encodeURIComponent(searchKeyword)}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      setNews(data.articles || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      alert('뉴스를 가져오는데 실패했습니다.');
    }
    setLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>뉴스 검색</h1>
        {/* 그룹 버튼 섹션 추가 */}
        <div className="group-buttons-container">
          {Object.keys(keywordGroups).map(groupName => (
            <button
              key={groupName}
              className={`group-button ${activeGroup === groupName ? 'active' : ''}`} // active 클래스 추가
              onClick={() => handleGroupClick(groupName)}
            >
              {groupName}
            </button>
          ))}
        </div>
        {/* 기존 검색 및 날짜 선택 컨테이너 */}
        <div className="search-container">
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
                setKeyword(e.target.value);
                setActiveGroup(null); // 사용자가 직접 입력하면 그룹 버튼 비활성화
            }}
            placeholder="검색어를 입력하세요"
            onKeyPress={(e) => e.key === 'Enter' && searchNews()}
          />
          <div className="date-range-container">
            <div className="date-range">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
              <span>~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={getToday()}
              />
            </div>
            <div className="date-buttons">
              <button
                className="date-button"
                onClick={() => setDateRange(7)}
              >
                최근 일주일
              </button>
              <button
                className="date-button"
                onClick={() => setDateRange(30)}
              >
                최근 한달
              </button>
            </div>
          </div>
          <button className="search-button" onClick={() => searchNews()}>검색</button> {/* searchNews 호출 방식 수정 */}
        </div>
      </header>
      <main>
        {loading ? (
          <div className="loading">검색 중...</div>
        ) : (
          <div className="news-container">
            {news.map((article, index) => (
              <div key={index} className="news-item">
                <h2>{article.title}</h2>
                <p>{article.description}</p>
                <div className="news-meta">
                  <span className="news-date">{new Date(article.pubDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <a href={article.link} target="_blank" rel="noopener noreferrer">
                  기사 보기
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
