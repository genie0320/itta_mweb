import httpx
import asyncio
from datetime import datetime
from config import TOUR_API_KEY

async def fetch_detail_intro(client: httpx.AsyncClient, content_id: str) -> str:
    """축제/행사의 상세 정보(detailIntro2)를 조회하여 종료일을 가져옵니다."""
    url = "https://apis.data.go.kr/B551011/KorService2/detailIntro2"
    params = {
        "serviceKey": TOUR_API_KEY,
        "contentId": content_id,
        "contentTypeId": "15",
        "MobileOS": "ETC",
        "MobileApp": "TinySherpa",
        "_type": "json"
    }
    try:
        response = await client.get(url, params=params, timeout=5.0)
        if response.status_code == 200:
            res_data = response.json()
            items = res_data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
            if isinstance(items, list) and len(items) > 0:
                return items[0].get("eventenddate", "")
            elif isinstance(items, dict):
                return items.get("eventenddate", "")
    except Exception as e:
        print(f"Error fetching detail intro for {content_id}: {e}")
    return ""

async def get_nearby_attractions(lat: float, lng: float, radius: int):
    # TourAPI 4.0 위치기반 관광정보조회 URL
    url = "https://apis.data.go.kr/B551011/KorService2/locationBasedList2"
    base_params = {
        "serviceKey": TOUR_API_KEY,
        "numOfRows": 40,
        "pageNo": 1,
        "MobileOS": "ETC",
        "MobileApp": "TinySherpa",
        "_type": "json",
        "arrange": "O",  # O = 거리순 정렬
        "mapX": lng,
        "mapY": lat,
        "radius": radius
    }
    
    async with httpx.AsyncClient() as client:
        # 1. 관광지(contentTypeId=12)와 축제(contentTypeId=15) 정보를 비동기로 각각 호출
        tasks = []
        
        # 관광지 조회 파라미터
        attraction_params = base_params.copy()
        attraction_params["contentTypeId"] = "12"
        tasks.append(client.get(url, params=attraction_params, timeout=5.0))
        
        # 축제 조회 파라미터
        festival_params = base_params.copy()
        festival_params["contentTypeId"] = "15"
        tasks.append(client.get(url, params=festival_params, timeout=5.0))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        attractions = []
        festivals = []
        
        # 관광지 응답 파싱
        if not isinstance(responses[0], Exception) and responses[0].status_code == 200:
            data = responses[0].json()
            items = data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
            if isinstance(items, list):
                attractions = items
            elif isinstance(items, dict):
                attractions = [items]
                
        # 축제 응답 파싱
        if not isinstance(responses[1], Exception) and responses[1].status_code == 200:
            data = responses[1].json()
            items = data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
            if isinstance(items, list):
                festivals = items
            elif isinstance(items, dict):
                festivals = [items]

        # 2. 축제 정보에 대해 종료일(eventenddate)을 병렬로 조회
        if festivals:
            detail_tasks = [fetch_detail_intro(client, f.get("contentid")) for f in festivals]
            end_dates = await asyncio.gather(*detail_tasks, return_exceptions=True)
            
            today_str = datetime.now().strftime("%Y%m%d")
            filtered_festivals = []
            
            for f, end_date in zip(festivals, end_dates):
                if isinstance(end_date, Exception) or not end_date:
                    # 종료일 조회 실패 시 안전을 위해 노출
                    filtered_festivals.append(f)
                    continue
                
                # 종료일이 오늘 날짜보다 크거나 같은 경우에만 리스트에 추가 (오늘 진행중이거나 향후 예정된 축제)
                if end_date >= today_str:
                    f["eventenddate"] = end_date
                    filtered_festivals.append(f)
            
            festivals = filtered_festivals

        # 3. 로컬 엑셀 축제 데이터 조회 및 온라인 API 결과와 병합
        from services.local_festival_service import get_nearby_local_festivals
        local_festivals = get_nearby_local_festivals(lat, lng, radius)
        
        combined_items = attractions + festivals + local_festivals
        
        # 4. 타이틀 기반 중복 제거 (API 축제와 로컬 축제의 명칭 공백 제거 비교)
        seen_titles = set()
        unique_items = []
        for item in combined_items:
            # "[로컬] " 접두사 및 공백 제거한 클린 타이틀로 중복 체크
            clean_title = item.get("title", "").replace("[로컬]", "").replace(" ", "").strip()
            if clean_title not in seen_titles:
                seen_titles.add(clean_title)
                unique_items.append(item)
                
        combined_items = unique_items
        
        return {
            "response": {
                "header": {
                    "resultCode": "0000",
                    "resultMsg": "OK"
                },
                "body": {
                    "items": {
                        "item": combined_items
                    },
                    "numOfRows": len(combined_items),
                    "pageNo": 1,
                    "totalCount": len(combined_items)
                }
            }
        }
