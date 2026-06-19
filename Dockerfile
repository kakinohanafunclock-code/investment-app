# 単一サービスデプロイ用 Dockerfile（フロントをビルドし、バックエンドから配信）
FROM node:24-slim

WORKDIR /app

# 依存インストール（ワークスペース）。--include=dev で型定義/tsc を確実に入れる。
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install --include=dev

# ソースをコピーしてビルド
COPY . .
RUN npm run build

# ランタイム設定
# 永続データは Railway の Volume を /data にマウントして使う（Dockerfile の VOLUME 命令は
# Railway 非対応のため使わない。ダッシュボードで Volume を作成し Mount path=/data に設定）。
ENV DB_PATH=/data/app.sqlite
ENV SERVE_STATIC=true
ENV ENABLE_SCHEDULER=true
ENV NODE_ENV=production
RUN mkdir -p /data

EXPOSE 4000
CMD ["node", "backend/dist/index.js"]
