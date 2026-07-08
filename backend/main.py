from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.tour_service import get_nearby_attractions
from services.odsay_service import get_transit_route

app = FastAPI(title="ITTAKO API")

# 프론트엔드 연동을 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/explore")
async def explore(lat: float, lng: float, radius: int = 5000):
    """1단계: 사용자 좌표 기준 주변 관광지 및 축제 검색"""
    try:
        data = await get_nearby_attractions(lat, lng, radius)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/route")
async def route(sx: float, sy: float, ex: float, ey: float):
    """2단계: 출발지(대도시)에서 목적지(소도시 관광지)까지의 대중교통 요약"""
    try:
        route_summary = await get_transit_route(sx, sy, ex, ey)
        return route_summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))