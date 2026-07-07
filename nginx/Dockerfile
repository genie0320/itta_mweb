FROM nginx:alpine

# openssl 설치
RUN apk add --no-cache openssl

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/nginx.conf

# SSL 자동생성 엔트리포인트 스크립트 복사 및 실행권한 부여
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
