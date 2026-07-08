import React, { useState, useEffect } from 'react';
import AttractionList from './components/AttractionList';
import RouteSummary from './components/RouteSummary';
import MapView from './components/MapView';

function App() {
  const [myCoords, setMyCoords] = useState(null);
  const [searchCoords, setSearchCoords] = useState(null); // 실제 검색 기준 좌표 (핀 위치)
  const [mapCenter, setMapCenter] = useState(null); // 지도가 움직여서 대기 중인 임시 중심 좌표
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
          setMapCenter(coords);
          fetchAttractions(coords);
        },
        (err) => {
          console.error("GPS 작동 권한이 거부되었거나 오류가 발생했습니다.", err);
          const defaultCoords = { lat: 37.5546, lng: 126.9706 };
          setMyCoords(defaultCoords);
          setSearchCoords(defaultCoords);
          setMapCenter(defaultCoords);
          setErrorMsg("위치 권한을 획득할 수 없어 기본 위치(서울역)로 검색합니다.");
          fetchAttractions(defaultCoords);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setErrorMsg("이 브라우저에서는 위치 정보 서비스를 지원하지 않습니다. 기본 위치로 탐색합니다.");
      const defaultCoords = { lat: 37.5546, lng: 126.9706 };
      setMyCoords(defaultCoords);
      setSearchCoords(defaultCoords);
      setMapCenter(defaultCoords);
      fetchAttractions(defaultCoords);
    }
  }, []);

  const fetchAttractions = async (coords) => {
    setLoading(true);
    setVisibleCount(10); // 새 검색 시 항상 노출 한도를 10개로 초기화
    try {
      const res = await fetch(`/api/explore?lat=${coords.lat}&lng=${coords.lng}&radius=150000`);
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

  // 수동 검색 트리거 (내 실제 GPS 위치 기준)
  const handleSearchMyCoords = () => {
    if (!myCoords) return;
    setSearchCoords(myCoords);
    setMapCenter(myCoords);
    fetchAttractions(myCoords);
  };

  // 수동 검색 트리거 (지도를 조작해서 도달한 지도 중심 기준)
  const handleSearchMapCenter = () => {
    if (!mapCenter) return;
    setSearchCoords(mapCenter);
    fetchAttractions(mapCenter);
  };

  const handleSelectDestination = async (dest) => {
    setSelectedDest(dest);
    setRouteInfo(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/route?sx=${myCoords.lng}&sy=${myCoords.lat}&ex=${dest.mapx}&ey=${dest.mapy}`);
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
    <div className="app-container">
      <header>
        <h1>Tiny Sherpa 🗺️</h1>
      </header>
      {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center', padding: '0 1rem' }}>{errorMsg}</div>}
      
      {myCoords ? (
        <main>
          {/* 수동 검색 실행용 미니멀 버튼 배치 */}
          <div className="search-control-bar">
            <button onClick={handleSearchMyCoords} className="bare-btn">내 위치 기준 검색</button>
            <button onClick={handleSearchMapCenter} className="bare-btn primary-bare-btn">이 지도 중심 검색</button>
          </div>

          <MapView 
            userCoords={myCoords} 
            searchCoords={searchCoords}
            items={visibleItems} // 지도 핀 마커도 렉 최소화를 위해 10개만 표시
            selectedDest={selectedDest} 
            onSelect={handleSelectDestination} 
            onMapMoveEnd={setMapCenter} // 지도가 움직여 멈추면 임시 중심 갱신
          />

          {loading && !routeInfo && !selectedDest && (
            <div className="status-text">
              <span>데이터 로딩 중...</span>
            </div>
          )}
          
          {!loading && attractions.length === 0 && (
            <div className="status-text">주변 반경 150km 이내에 발견된 관광지나 축제가 없습니다.</div>
          )}

          {attractions.length > 0 && (
            <>
              <AttractionList items={visibleItems} onSelect={handleSelectDestination} />
              {attractions.length > visibleCount && (
                <button onClick={handleLoadMore} className="load-more-btn">
                  더보기 (+10) [전체 {attractions.length}개 중 {visibleCount}개 노출]
                </button>
              )}
            </>
          )}

          {routeInfo && (
            <RouteSummary route={routeInfo} destination={selectedDest} />
          )}
        </main>
      ) : (
        <div className="status-text">
          <span>사용자 위치를 탐색 중입니다...</span>
        </div>
      )}
    </div>
  );
}

export default App;
