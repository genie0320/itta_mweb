import React from 'react';
import { launchExternalMap } from '../utils/deeplink';

function RouteSummary({ route, destination, startCoords }) {
  const destData = {
    lat: destination.mapy,
    lng: destination.mapx,
    name: destination.title
  };

  return (
    <div className="route-summary-panel card">
      <h3>소도시 이동 안내</h3>
      <p>🎯 **목적지**: {destination.title}</p>
      <p>⏱️ **예상 소요 시간**: 약 {route.totalTime}분 (환승 {route.transitCount}회)</p>
      <p>🚌 **주요 거점**: {route.firstStartStation} 승차 ➔ {route.lastEndStation} 하차</p>
      
      {route.transitFlow && (
        <div className="transit-flow-wrapper">
          <p className="transit-flow-title">🛣️ 거시적 이동 경로 흐름</p>
          <div className="transit-flow-timeline">
            {route.transitFlow.split(" ➔ ").map((step, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="transit-arrow">➔</span>}
                <span className="transit-step-badge">{step}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {route.steps && route.steps.length > 0 && (
        <div className="transit-flow-wrapper" style={{ marginTop: '0.5rem' }}>
          <p className="transit-flow-title">📝 상세 이동 경로 단계</p>
          <div className="transit-steps-list">
            {route.steps.map((step, idx) => (
              <div key={idx} className="transit-step-item">
                <span className="step-number">{idx + 1}</span>
                <span className="step-text">{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="button-group">
        <button className="map-btn naver-btn" onClick={() => launchExternalMap('naver', destData, startCoords)}>
          네이버 지도로 실제 길찾기 시작
        </button>
        <button className="map-btn kakao-btn" onClick={() => launchExternalMap('kakao', destData, startCoords)}>
          카카오 지도로 실제 길찾기 시작
        </button>
      </div>
    </div>
  );
}

export default RouteSummary;