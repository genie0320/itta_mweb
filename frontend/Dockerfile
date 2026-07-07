FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# 개발 서버용으로 볼륨 마운트를 주로 사용하지만 이미지 내 파일 구조의 안전한 테스트를 위해 COPY도 실행합니다.
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
