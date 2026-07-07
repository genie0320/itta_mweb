import os
from dotenv import load_dotenv

# 로컬 개발 환경용 .env 로드
load_dotenv()

TOUR_API_KEY = os.getenv("TOUR_API_KEY", "")
ODSAY_API_KEY = os.getenv("ODSAY_API_KEY", "")
