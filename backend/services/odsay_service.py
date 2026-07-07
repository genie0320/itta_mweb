import httpx
from config import ODSAY_API_KEY

async def get_transit_route(sx: float, sy: float, ex: float, ey: float):
    # ODsay 대중교통 가장 빠른 경로 검색 API
    url = "https://api.odsay.com/v1/api/searchPubTransPathT"
    params = {
        "apiKey": ODSAY_API_KEY,
        "SX": sx,
        "SY": sy,
        "EX": ex,
        "EY": ey,
        "SearchPathType": 0 # 모든 대중교통(기차, 시외버스 포함) 후보 검색
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        raw_data = response.json()
        
        # 가독성을 높이기 위해 전체 타임라인 중 핵심 정보(총 소요시간, 환승 횟수)만 정제하여 반환합니다.
        best_path = raw_data.get("result", {}).get("path", [{}])[0]
        info = best_path.get("info", {})
        
        return {
            "totalTime": info.get("totalTime", 0),
            "payment": info.get("payment", 0),
            "firstStartStation": info.get("firstStartStation", ""),
            "lastEndStation": info.get("lastEndStation", "")
        }
