import pandas as pd
import numpy as np
import os
from datetime import datetime

FILE_PATH = "/app/data/전국문화축제표준데이터-20260707.xls"
CACHE_PATH = "/app/data/festivals.pkl"
df_festivals = None

def load_festival_data():
    global df_festivals
    if df_festivals is not None:
        return df_festivals
    
    # 1. 고속 캐시 파일(Pickle)이 존재하는 경우 즉시 로드
    if os.path.exists(CACHE_PATH):
        try:
            df_festivals = pd.read_pickle(CACHE_PATH)
            print(f"Successfully loaded {len(df_festivals)} local festivals from pickle cache in <0.1s.")
            return df_festivals
        except Exception as e:
            print(f"Failed to load local festival cache, falling back to raw Excel: {e}")

    if not os.path.exists(FILE_PATH):
        print(f"Error: Local festival file not found at {FILE_PATH}")
        return None
        
    try:
        # 2. 캐시가 없으면 엑셀 로드 및 전처리
        raw_df = pd.read_excel(FILE_PATH)
        raw_df.columns = raw_df.iloc[0]
        df_festivals = raw_df[1:].reset_index(drop=True)
        
        df_festivals["위도"] = pd.to_numeric(df_festivals["위도"], errors='coerce')
        df_festivals["경도"] = pd.to_numeric(df_festivals["경도"], errors='coerce')
        df_festivals = df_festivals.dropna(subset=["위도", "경도"])
        
        # 다음번 고속 로딩을 위해 전처리 완료된 데이터프레임을 캐시로 저장
        try:
            df_festivals.to_pickle(CACHE_PATH)
            print("Successfully cached preprocessed local festival database to pickle.")
        except Exception as cache_err:
            print(f"Warning: Failed to save pickle cache: {cache_err}")

        print(f"Successfully loaded and preprocessed {len(df_festivals)} local festivals from raw Excel database.")
        return df_festivals
    except Exception as e:
        print(f"Error preprocessing local festival data: {e}")
        return None
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
