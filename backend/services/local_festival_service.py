import pandas as pd
import numpy as np
import os
from datetime import datetime

FILE_PATH = "/app/data/전국문화축제표준데이터-20260707.xls"
df_festivals = None

def load_festival_data():
    global df_festivals
    if df_festivals is not None:
        return df_festivals
    
    if not os.path.exists(FILE_PATH):
        print(f"Error: Local festival file not found at {FILE_PATH}")
        return None
        
    try:
        # 파일 로드 (xls 포맷)
        raw_df = pd.read_excel(FILE_PATH)
        # 첫 번째 행을 실제 컬럼 헤더명으로 매핑
        raw_df.columns = raw_df.iloc[0]
        # 헤더로 승격시켰으므로 첫 번째 행을 데이터 슬라이스에서 배제하고 인덱스 리셋
        df_festivals = raw_df[1:].reset_index(drop=True)
        
        # 위도/경도를 수치형 float 데이터로 강제 변환 (오류 값은 NaN 처리)
        df_festivals["위도"] = pd.to_numeric(df_festivals["위도"], errors='coerce')
        df_festivals["경도"] = pd.to_numeric(df_festivals["경도"], errors='coerce')
        
        # 위경도가 유실되어 위치기반 탐색이 불가능한 행 드랍
        df_festivals = df_festivals.dropna(subset=["위도", "경도"])
        
        print(f"Successfully loaded and preprocessed {len(df_festivals)} local festivals from Excel database.")
        return df_festivals
    except Exception as e:
        print(f"Error preprocessing local festival data: {e}")
        return None

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Vectorized Haversine distance formula to calculate distance between center coordinates
    and all elements in the dataframe series. Returns distance in meters.
    """
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = np.sin(dlat / 2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0)**2
    c = 2 * np.arcsin(np.sqrt(a))
    earth_radius = 6371000  # meters
    return c * earth_radius

def get_nearby_local_festivals(center_lat: float, center_lng: float, radius_m: float):
    df = load_festival_data()
    if df is None or len(df) == 0:
        return []
        
    try:
        # 1. 위치 기반 반경 필터링 (Numpy 벡터 연산)
        distances = haversine_distance(center_lat, center_lng, df["위도"].values, df["경도"].values)
        df_filtered = df[distances <= radius_m].copy()
        df_filtered["distance"] = distances[distances <= radius_m]
        
        # 2. 시간 기반 필터링 (종료일이 오늘보다 크거나 같은 진행 중/예정 축제만 수집)
        today_str = datetime.now().strftime("%Y-%m-%d")
        df_filtered = df_filtered.dropna(subset=["축제종료일자"])
        df_filtered = df_filtered[df_filtered["축제종료일자"].astype(str) >= today_str]
        
        # 3. 거리순 정렬
        df_filtered = df_filtered.sort_values(by="distance")
        
        # 4. TourAPI 응답 규격 포맷팅
        local_festivals = []
        for idx, row in df_filtered.iterrows():
            # YYYY-MM-DD -> YYYYMMDD 변환
            end_date_raw = str(row["축제종료일자"]).replace("-", "").strip()
            event_end_date = end_date_raw[:8] if len(end_date_raw) >= 8 else today_str.replace("-", "")
            
            # 주소 선정 우선순위
            addr = row["소재지도로명주소"]
            if pd.isna(addr) or not str(addr).strip() or str(addr) == 'nan':
                addr = row["소재지지번주소"]
            if pd.isna(addr) or not str(addr).strip() or str(addr) == 'nan':
                addr = row["개최장소"]
            if pd.isna(addr) or not str(addr).strip() or str(addr) == 'nan':
                addr = "상세 주소 정보 없음"

            local_festivals.append({
                "title": f"[로컬] {str(row['축제명'])}", # 디버그 및 출처인식용 뱃지 역할
                "addr1": str(addr),
                "mapx": str(row["경도"]),
                "mapy": str(row["위도"]),
                "contentid": f"local_fest_{idx}",
                "contenttypeid": "15", # 축제
                "eventenddate": event_end_date,
                "is_local_db": True
            })
            
        return local_festivals
    except Exception as e:
        print(f"Error filtering local festivals: {e}")
        return []
