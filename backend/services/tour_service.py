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

        # 3. 두 리스트 병합 및 포맷팅 (프론트엔드 호환 포맷)
        combined_items = attractions + festivals
        
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
