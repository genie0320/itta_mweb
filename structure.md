tiny-sherpa/
├── backend/
│ ├── main.py # FastAPI 진입점 및 라우팅
│ ├── config.py # API 키 관리 환경변수
│ └── services/
│ ├── tour_service.py # 한국관광공사 TourAPI 연동 로직
│ └── odsay_service.py # ODsay 대중교통 API 연동 로직
└── frontend/
├── src/
│ ├── App.jsx # 메인 상태 및 흐름 제어 (오케스트레이터)
│ ├── components/
│ │ ├── AttractionList.jsx # 주변 관광지/축제 카드 리스트
│ │ └── RouteSummary.jsx # 대중교통 이동 경로 요약 및 앱 핸드오프
│ └── utils/
│ └── deeplink.js # 네이버/카카오맵 딥링크 래퍼
