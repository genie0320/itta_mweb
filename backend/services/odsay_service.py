import httpx
from datetime import datetime
from config import ODSAY_API_KEY

async def get_transit_route(sx: float, sy: float, ex: float, ey: float):
    # ODsay 멀티모달 대중교통 길찾기 API (maasRP) 호출
    url = "https://api.odsay.com/v1/api/maasRP"
    
    # 시간대별 끊김을 막기 위해 현재 날짜의 오전 10시 기준으로 경로 검색 고정
    search_time = datetime.now().strftime("%Y%m%d1000")
    
    params = {
        "apiKey": ODSAY_API_KEY,
        "SX": sx,
        "SY": sy,
        "EX": ex,
        "EY": ey,
        "SearchTime": search_time,
        "SearchMethod": "2", # 2: 대중교통
        "output": "json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        raw_data = response.json()
        
        paths = raw_data.get("result", {}).get("paths", [])
        if not paths:
            return {
                "totalTime": 0,
                "payment": 0,
                "firstStartStation": "정보 없음",
                "lastEndStation": "정보 없음",
                "transitCount": 0,
                "transitFlow": "대중교통 경로를 검색할 수 없습니다.",
                "steps": []
            }
            
        best_path = paths[0]
        total_time = best_path.get("totalTime", 0)
        total_payment = best_path.get("totalPayment", 0)
        
        # 상세 구간 리스트 (rps) 순회
        rps = best_path.get("rps", [])
        stages = []
        steps = []
        
        train_map = {
            1: "KTX",
            2: "새마을호",
            3: "무궁화호",
            4: "누리호",
            5: "통근열차",
            6: "ITX-새마을",
            7: "ITX-청춘",
            8: "SRT"
        }
        
        first_station = "출발지"
        last_station = "목적지"
        transit_count = 0
        
        for rp in rps:
            traffic_type = rp.get("trafficType")
            duration = rp.get("duration", 0)
            distance = rp.get("distance", 0)
            start_name = rp.get("startName", "").strip()
            end_name = rp.get("endName", "").strip()
            
            # 도보
            if traffic_type == 3:
                step_text = f"🚶 도보 이동 (약 {duration}분, {distance}m)"
                steps.append({"type": 3, "text": step_text, "duration": duration})
            
            # 지하철
            elif traffic_type == 1:
                lanes = rp.get("lane", [{}])
                lane_name = lanes[0].get("name", "지하철") if lanes else "지하철"
                step_text = f"🚇 {lane_name} ({start_name}역 ➔ {end_name}역, 약 {duration}분)"
                steps.append({"type": 1, "text": step_text, "duration": duration})
                stages.append(f"🚇 {lane_name} ({start_name}역)")
                transit_count += 1
                if first_station == "출발지":
                    first_station = f"{start_name}역"
                last_station = f"{end_name}역"
                
            # 버스
            elif traffic_type == 2:
                lanes = rp.get("lane", [{}])
                bus_no = lanes[0].get("busNo", "버스") if lanes else "버스"
                step_text = f"🚌 {bus_no}번 버스 ({start_name} ➔ {end_name}, 약 {duration}분)"
                steps.append({"type": 2, "text": step_text, "duration": duration})
                stages.append(f"🚌 {bus_no} ({start_name})")
                transit_count += 1
                if first_station == "출발지":
                    first_station = start_name
                last_station = end_name
                
            # 기차/열차
            elif traffic_type == 4:
                sub_type = rp.get("trafficSubType", 0)
                train_name = train_map.get(sub_type, "열차")
                step_text = f"🚄 {train_name} ({start_name}역 ➔ {end_name}역, 약 {duration}분)"
                steps.append({"type": 4, "text": step_text, "duration": duration})
                stages.append(f"🚄 {train_name} ({start_name}역)")
                transit_count += 1
                if first_station == "출발지":
                    first_station = f"{start_name}역"
                last_station = f"{end_name}역"
                
            # 고속버스
            elif traffic_type == 5:
                step_text = f"🚌 고속버스 ({start_name} ➔ {end_name}, 약 {duration}분)"
                steps.append({"type": 5, "text": step_text, "duration": duration})
                stages.append(f"🚌 고속버스 ({start_name})")
                transit_count += 1
                if first_station == "출발지":
                    first_station = start_name
                last_station = end_name
                
            # 시외버스
            elif traffic_type == 6:
                step_text = f"🚌 시외버스 ({start_name} ➔ {end_name}, 약 {duration}분)"
                steps.append({"type": 6, "text": step_text, "duration": duration})
                stages.append(f"🚌 시외버스 ({start_name})")
                transit_count += 1
                if first_station == "출발지":
                    first_station = start_name
                last_station = end_name
                
            # 항공
            elif traffic_type == 7:
                step_text = f"✈️ 항공편 ({start_name} ➔ {end_name}, 약 {duration}분)"
                steps.append({"type": 7, "text": step_text, "duration": duration})
                stages.append(f"✈️ 항공 ({start_name})")
                transit_count += 1
                if first_station == "출발지":
                    first_station = start_name
                last_station = end_name
                
        transit_flow = " ➔ ".join(stages) if stages else "도보 이동만 필요"
        
        # 환승 횟수는 총 승차 횟수 - 1 로 보정
        final_transit_count = max(0, transit_count - 1)
        
        return {
            "totalTime": total_time,
            "payment": total_payment,
            "firstStartStation": first_station,
            "lastEndStation": last_station,
            "transitCount": final_transit_count,
            "transitFlow": transit_flow,
            "steps": steps
        }
