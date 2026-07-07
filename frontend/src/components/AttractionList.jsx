import React from 'react';

function AttractionList({ items, onSelect }) {
  // TourAPI contentTypeId 정의
  const TYPE_TOUR = '12';
  const TYPE_FESTIVAL = '15';

  // 이미지 예외 처리 (이미지가 없을 시 표시할 템플릿)
  const getThumbnail = (item) => {
    if (item.firstimage || item.firstimage2) {
      return item.firstimage || item.firstimage2;
    }
    // 기본 플레이스홀더 이미지 (SVG 형태의 데이터 URL)
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%231e293b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="sans-serif" font-size="24">📍</text></svg>`;
  };

  return (
    <div className="list-container">
      <h2 className="section-title">주변 추천 목적지 ({items.length})</h2>
      {items.map((item, idx) => {
        const isFestival = item.contenttypeid === TYPE_FESTIVAL;
        return (
          <div 
            key={item.contentid || idx} 
            className="attraction-item card" 
            onClick={() => onSelect(item)}
          >
            <img 
              src={getThumbnail(item)} 
              alt={item.title} 
              className="attraction-img"
              loading="lazy"
            />
            <div className="attraction-info">
              <span className={`badge ${isFestival ? 'badge-fest' : 'badge-tour'}`}>
                {isFestival ? '✨ 축제/행사' : '🏔️ 로컬 관광지'}
              </span>
              <h3 className="attraction-name">{item.title}</h3>
              <p className="attraction-addr">{item.addr1 || '상세 주소 정보 없음'}</p>
              {isFestival && item.eventenddate && (
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
                  ~ {item.eventenddate.substring(4, 6)}월 {item.eventenddate.substring(6, 8)}일까지 진행
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AttractionList;
