import React, { useState, useEffect } from 'react';
import AttractionList from './components/AttractionList';
import RouteSummary from './components/RouteSummary';
import MapView from './components/MapView';

function App() {
  const [myCoords, setMyCoords] = useState(null);
  const [searchCoords, setSearchCoords] = useState(null); // 실제 검색 중심 (주황색 핀 위치)
  const [theme, setTheme] = useState('light'); // 다크/라이트 테마 상태 (디폴트: 라이트)
  const [attractions, setAttractions] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10); // 클라이언트 단 노출 개수 (초기 10)
  const [selectedDest, setSelectedDest] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 초기 진입 시 브라우저 HTML5 GPS로 좌표 수집
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyCoords(coords);
          setSearchCoords(coords);
          fetchAttractions(coords, 150000); // 디폴트 150km (8시간 이상)
        },
        (err) => {
          console.error("GPS 작동 권한이 거부되었거나 오류가 발생했습니다.", err);
          const defaultCoords = { lat: 37.5546, lng: 126.9706 };
          setMyCoords(defaultCoords);
          setSearchCoords(defaultCoords);
          setErrorMsg("위치 권한을 획득할 수 없어 기본 위치(서울역)로 검색합니다.");
          fetchAttractions(defaultCoords, 150000);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setErrorMsg("이 브라우저에서는 위치 정보 서비스를 지원하지 않습니다. 기본 위치로 탐색합니다.");
      const defaultCoords = { lat: 37.5546, lng: 126.9706 };
      setMyCoords(defaultCoords);
      setSearchCoords(defaultCoords);
      fetchAttractions(defaultCoords, 150000);
    }
  }, []);

  const fetchAttractions = async (coords, radiusM = 150000) => {
    setLoading(true);
    setVisibleCount(10); // 새 검색 시 항상 노출 한도를 10개로 초기화
    try {
      const res = await fetch(`/api/explore?lat=${coords.lat}&lng=${coords.lng}&radius=${radiusM}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setAttractions(data.response?.body?.items?.item || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(`관광 정보를 불러오는 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 지도 클릭 핸들러: 주황색 탐색 핀의 좌표만 갱신하며 API를 자동 호출하지 않음
  const handleMapClick = (newCoords) => {
    setSearchCoords(newCoords);
  };

  const handleSelectDestination = async (dest) => {
    // 선택된 장소의 좌표값을 브라우저 alert로 출력
    alert(`선택한 장소: ${dest.title}\n위도: ${dest.mapy}\n경도: ${dest.mapx}`);

    setSelectedDest(dest);
    setRouteInfo(null); // 새 방문지 선택 시 기존 경로 정보 리셋
  };

  // 3분면의 [경로탐색] 수동 클릭 핸들러
  const handleFindRoute = async () => {
    if (!selectedDest) return;
    setLoading(true);
    setRouteInfo(null);
    try {
      const res = await fetch(`/api/route?sx=${searchCoords.lng}&sy=${searchCoords.lat}&ex=${selectedDest.mapx}&ey=${selectedDest.mapy}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setRouteInfo(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(`대중교통 경로 정보를 요약하는 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 페이징: 더보기 처리
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  // 노출 개수 한도로 필터링된 슬라이스 아이템 목록
  const visibleItems = attractions.slice(0, visibleCount);

  return (
    <div className={`app-container theme-${theme}`}>
      <header className="app-header">
        <h1>ITTAKO 🗺️</h1>
        <button onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} className="bare-btn theme-toggle-btn">
          {theme === 'light' ? '🌙 다크모드' : '☀️ 라이트모드'}
        </button>
      </header>
      {loading && (
        <div className="loading-bar-container">
          <div className="loading-bar-progress"></div>
        </div>
      )}
      {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center', padding: '0 1rem' }}>{errorMsg}</div>}
      
      {myCoords ? (
        <div className="main-layout">
          {/* 1분면 (4/10 너비): 지도 및 탐색 컨트롤 */}
          <div className="layout-panel panel-map" style={{ flex: 4 }}>
            <div className="search-control-bar" style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.3rem' }}>
              <button onClick={() => fetchAttractions(searchCoords, 50000)} className="bare-btn primary-bare-btn" style={{ flex: 1 }}>3시간 여행 (~50km)</button>
              <button onClick={() => fetchAttractions(searchCoords, 100000)} className="bare-btn primary-bare-btn" style={{ flex: 1 }}>6시간 여행 (~100km)</button>
              <button onClick={() => fetchAttractions(searchCoords, 150000)} className="bare-btn primary-bare-btn" style={{ flex: 1 }}>8시간 이상 (~150km)</button>
            </div>
            <MapView 
              userCoords={myCoords} 
              searchCoords={searchCoords}
              items={visibleItems} 
              selectedDest={selectedDest} 
              onSelect={handleSelectDestination} 
              onMapClick={handleMapClick}
              theme={theme}
            />
          </div>

          {/* 2분면 (2/10 너비): 주변 관광지 목록 */}
          <div className="layout-panel panel-nearby" style={{ flex: 2 }}>
            <h3 className="panel-title">📍 주변 관광지</h3>
            {attractions.length === 0 ? (
              <div className="status-text">주변 반경 150km 이내에 발견된 관광지나 축제가 없습니다. [주변검색]을 클릭해 보세요.</div>
            ) : (
              <>
                <AttractionList items={visibleItems} onSelect={handleSelectDestination} />
                {attractions.length > visibleCount && (
                  <button onClick={handleLoadMore} className="load-more-btn">
                    더보기 (+10) [전체 {attractions.length}개 중 {visibleCount}개]
                  </button>
                )}
              </>
            )}
          </div>

          {/* 3분면 (2/10 너비): 선택된 관광지 상세 카드 */}
          <div className="layout-panel panel-selected" style={{ flex: 2 }}>
            <h3 className="panel-title">🎯 선택된 관광지</h3>
            {selectedDest ? (
              <div className="selected-detail-card card">
                {selectedDest.firstimage && (
                  <img src={selectedDest.firstimage} alt={selectedDest.title} className="detail-hero-img" />
                )}
                <h4>{selectedDest.title}</h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{selectedDest.addr1 || "상세 주소 없음"}</p>
                <button onClick={handleFindRoute} className="bare-btn primary-bare-btn" style={{ width: '100%', marginTop: '1rem' }}>
                  경로탐색 (대중교통)
                </button>
              </div>
            ) : (
              <div className="status-text">지도 혹은 주변 관광지 목록에서 방문할 장소를 선택해 주세요.</div>
            )}
          </div>

          {/* 4분면 (2/10 너비): 경로 안내 */}
          <div className="layout-panel panel-route" style={{ flex: 2 }}>
            <h3 className="panel-title">🛣️ 경로 안내</h3>
            {routeInfo ? (
              <RouteSummary route={routeInfo} destination={selectedDest} startCoords={searchCoords} />
            ) : (
              <div className="status-text">
                {selectedDest ? "선택한 관광지 상세 화면에서 [경로탐색] 버튼을 클릭해 주세요." : "장소 선택 및 경로탐색을 실행해 주세요."}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="status-text">
          <span>사용자 위치를 탐색 중입니다...</span>
        </div>
      )}
    </div>
  );
}

export default App;
