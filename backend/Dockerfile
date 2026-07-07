FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 개발 환경에서는 소스코드를 볼륨으로 마운트하므로 로컬 코드가 사용되나, Dockerfile 빌드 테스트 및 빌드 시점 파일 구조 호환성을 위해 COPY도 수행합니다.
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
