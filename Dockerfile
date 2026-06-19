# 単一サービスデプロイ用 Dockerfile（フロントをビルドし、バックエンドから配信）
FROM node:24-slim

WORKDIR /app

# 依存インストール（ワークスペース）
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install

# ソースをコピーしてビルド
COPY . .
RUN npm run build

# 永続データ用ディレクトリ（クラウドの永続ボリュームをここにマウントする）
ENV DB_PATH=/data/app.sqlite
ENV SERVE_STATIC=true
ENV ENABLE_SCHEDULER=true
ENV NODE_ENV=production
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 4000
CMD ["node", "backend/dist/index.js"]
