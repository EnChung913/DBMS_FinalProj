FROM node:20-slim
WORKDIR /app

# --- 安裝 curl ---
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*
# -----------------

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 8000
CMD ["node", "dist/main.js"]