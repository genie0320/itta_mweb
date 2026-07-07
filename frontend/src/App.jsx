import React, { useState, useEffect } from 'react';
import AttractionList from './components/AttractionList';
import RouteSummary from './components/RouteSummary';
import MapView from './components/MapView';

function App() {
  const [myCoords, setMyCoords] = useState(null);
  const [searchCoords, setSearchCoords] = useState(null); // 지도를 클릭해 지정한 가상의 탐색 중심 좌표
  const [attractions, setAttractions] = useState([]);
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
          setSearchCoords(coords); // 첫 진입 시 탐색 중심도 내 위치로 동기화
          fetchAttractions(coords);
        },
        (err) => {
          console.error("GPS 작동 권한이 거부되었거나 오류가 발생했습니다.", err);
          // 권한 거부 시 예외 처리: 서울역 중심의 기본 좌표 설정
          const defaultCoords = { lat: 37.5546, lng: 126.9706 };
          setMyCoords(defaultCoords);
          setSearchCoords(defaultCoords);
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
      fetchAttractions(defaultCoords);
    }
  }, []);

  const fetchAttractions = async (coords) => {
    setLoading(true);
    try {
      // 150km (150000m) 반경 쿼리 고정
      const res = await fetch(`/api/explore?lat=${coords.lat}&lng=${coords.lng}&radius=150000`);
      const data = await res.json();
      setAttractions(data.response?.body?.items?.item || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("관광 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 지도 클릭 핸들러: 탐색 중심 변경 및 150km 범위 재검색
  const handleMapClick = (newCoords) => {
    setSearchCoords(newCoords);
    fetchAttractions(newCoords);
  };

  const handleSelectDestination = async (dest) => {
    setSelectedDest(dest);
    setRouteInfo(null);
    setLoading(true);
    try {
      // 출발 좌표는 지도의 클릭 위치(searchCoords)가 아니라, 본래 실제 내 위치(myCoords)로 고정하여 경로 검색
      const res = await fetch(`/api/route?sx=${myCoords.lng}&sy=${myCoords.lat}&ex=${dest.mapx}&ey=${dest.mapy}`);
      const data = await res.json();
      setRouteInfo(data);
    } catch (err) {
      console.error(err);
      setErrorMsg("대중교통 경로 정보를 요약하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Tiny Sherpa 🗺️</h1>
      </header>
      {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center', padding: '0 1rem' }}>{errorMsg}</div>}
      
      {myCoords ? (
        <main>
          {/* 지도 뷰어 상단 렌더링 */}
          <MapView 
            userCoords={myCoords} 
            searchCoords={searchCoords}
            items={attractions} 
            selectedDest={selectedDest} 
            onSelect={handleSelectDestination} 
            onMapClick={handleMapClick}
          />

          {loading && !routeInfo && !selectedDest && (
            <div className="status-text">
              <div className="spinner"></div>
              <span>데이터를 로드하는 중입니다...</span>
            </div>
          )}
          
          {!loading && attractions.length === 0 && (
            <div className="status-text">주변 반경 150km 이내에 발견된 관광지나 축제가 없습니다.</div>
          )}

          {attractions.length > 0 && (
            <AttractionList items={attractions} onSelect={handleSelectDestination} />
          )}

          {routeInfo && (
            <RouteSummary route={routeInfo} destination={selectedDest} />
          )}
        </main>
      ) : (
        <div className="status-text">
          <div className="spinner"></div>
          <span>사용자 위치를 탐색 중입니다...</span>
        </div>
      )}
    </div>
  );
}

export default App;
