import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Leaflet 기본 마커 이미지 버그 해결용 코드
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 커스텀 SVG 마커 아이콘 정의 (Aesthetics 강화)
const userIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="10" fill="%233b82f6" stroke="white" stroke-width="3"><animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" /></circle><circle cx="15" cy="15" r="5" fill="%231d4ed8"/></svg>',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// 탐색 기준 핀 아이콘 (주황색 - 펄스 애니메이션 내장)
const searchIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="%23f97316" stroke="white" stroke-width="3"><animate attributeName="r" values="9;12;9" dur="2s" repeatCount="indefinite" /></circle><circle cx="16" cy="16" r="5" fill="%23c2410c"/></svg>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const tourIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="%236366f1" stroke="white" stroke-width="1"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

const festivalIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="%2310b981" stroke="white" stroke-width="1"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

function MapView({ userCoords, searchCoords, items, selectedDest, onSelect, onMapClick }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const searchMarkerRef = useRef(null);

  // 1. 지도 초기화 (최초 1회 실행)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const initialLat = userCoords ? userCoords.lat : 37.5546;
      const initialLng = userCoords ? userCoords.lng : 126.9706;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false
      }).setView([initialLat, initialLng], 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // 지도 클릭 시 좌표 획득 및 콜백 이벤트 트리거
      map.on('click', (e) => {
        if (onMapClick) {
          onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      mapRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. 사용자 위치 마커 업데이트 (실제 GPS 위치)
  useEffect(() => {
    if (!mapRef.current || !userCoords) return;

    const { lat, lng } = userCoords;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>내 위치</b> (출발지)');
    }
  }, [userCoords]);

  // 2.5. 관광지 탐색 중심 마커 업데이트
  useEffect(() => {
    if (!mapRef.current || !searchCoords) return;

    const { lat, lng } = searchCoords;

    if (searchMarkerRef.current) {
      searchMarkerRef.current.setLatLng([lat, lng]);
    } else {
      searchMarkerRef.current = L.marker([lat, lng], { icon: searchIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>탐색 중심지 (반경 150km)</b><br/>지도를 클릭하여 이동할 수 있습니다.');
    }
  }, [searchCoords]);

  // 3. 관광지 및 축제 마커 핀 렌더링
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    // 기존 마커 전체 클리어
    markersLayerRef.current.clearLayers();

    items.forEach((item) => {
      const lat = parseFloat(item.mapy);
      const lng = parseFloat(item.mapx);
      if (isNaN(lat) || isNaN(lng)) return;

      const isFestival = item.contenttypeid === '15';
      const marker = L.marker([lat, lng], {
        icon: isFestival ? festivalIcon : tourIcon
      });

      const popupContent = document.createElement('div');
      popupContent.className = 'map-popup-content';
      popupContent.innerHTML = `
        <div style="font-family: 'Outfit', sans-serif; color: #1e293b; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">${item.title}</h4>
          <p style="margin: 0 0 8px 0; font-size: 0.75rem; color: #64748b;">${item.addr1 || ''}</p>
          <button id="popup-btn-${item.contentid}" style="
            width: 100%;
            background-color: #6366f1;
            color: white;
            border: none;
            padding: 6px 12px;
            font-size: 0.8rem;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
          ">이곳으로 목적지 설정</button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-${item.contentid}`);
        if (btn) {
          btn.addEventListener('click', () => {
            onSelect(item);
            marker.closePopup();
          });
        }
      });

      markersLayerRef.current.addLayer(marker);
    });
  }, [items, onSelect]);

  // 4. 선택된 목적지(selectedDest)가 바뀔 때 해당 위치로 FlyTo 이동
  useEffect(() => {
    if (!mapRef.current || !selectedDest) return;

    const lat = parseFloat(selectedDest.mapy);
    const lng = parseFloat(selectedDest.mapx);
    if (isNaN(lat) || isNaN(lng)) return;

    mapRef.current.flyTo([lat, lng], 15, {
      animate: true,
      duration: 1.5
    });
  }, [selectedDest]);

  return (
    <div className="map-view-wrapper">
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
}

export default MapView;
