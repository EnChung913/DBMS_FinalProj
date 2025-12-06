# ----------------------
# 1st stage: Build
# ----------------------
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
COPY .env.docker .env

RUN npm run build -- --mode docker


# ----------------------
# 2nd stage: Nginx serve
# ----------------------
FROM nginx:alpine

# 複製 dist 靜態檔到 nginx 目錄
COPY --from=build /app/dist /usr/share/nginx/html

# 覆寫 nginx 預設設定 —— 這步非常重要
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]