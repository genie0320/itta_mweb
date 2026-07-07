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
        
        paths = raw_data.get("result", {}).get("path", [])
        if not paths:
            return {
                "totalTime": 0,
                "payment": 0,
                "firstStartStation": "정보 없음",
                "lastEndStation": "정보 없음",
                "transitCount": 0,
                "transitFlow": "직통 경로가 제공되지 않거나 대중교통 경로 검색에 실패했습니다."
            }
            
        best_path = paths[0]
        info = best_path.get("info", {})
        
        # 상세 환승 정보 파싱 (지하철 및 버스)
        sub_paths = best_path.get("subPath", [])
        stages = []
        for sp in sub_paths:
            traffic_type = sp.get("trafficType")
            if traffic_type == 1:  # 지하철
                lanes = sp.get("lane", [{}])
                lane_name = lanes[0].get("name", "지하철") if lanes else "지하철"
                start_name = sp.get("startName", "")
                stages.append(f"🚇 {lane_name} ({start_name}역)")
            elif traffic_type == 2:  # 버스
                lanes = sp.get("lane", [{}])
                bus_no = lanes[0].get("busNo", "버스") if lanes else "버스"
                start_name = sp.get("startName", "")
                stages.append(f"🚌 {bus_no}번 ({start_name})")
                
        transit_flow = " ➔ ".join(stages) if stages else "도보 이동만 필요"
        
        return {
            "totalTime": info.get("totalTime", 0),
            "payment": info.get("payment", 0),
            "firstStartStation": info.get("firstStartStation", ""),
            "lastEndStation": info.get("lastEndStation", ""),
            "transitCount": info.get("transitCount", 0),
            "transitFlow": transit_flow
        }
