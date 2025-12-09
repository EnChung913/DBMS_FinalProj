adm# UniConnect - 大學生學習表現與資源媒合平台

**UniConnect** 是一個致力於連接學生、學校系所與企業資源的整合平台。透過分析學生的學習表現 (GPA)、修課紀錄與個人成就，系統能精準推薦適合的獎學金、實習機會或實驗室職缺，並提供完整的申請與審核流程。

## 📚 目錄

- [專案簡介](#-專案簡介)
- [核心功能](#-核心功能)
- [技術架構](#-技術架構)
- [專案結構](#-專案結構)
- [快速開始 (Installation)](#-快速開始-installation)
- [資料庫初始化 (Database Setup)](#-資料庫初始化-database-setup)
- [開發與維護指令 (Operations)](#-開發與維護指令-operations)
- [服務存取](#-服務存取)
- [文件](#-文件)

## 🚀 專案簡介

本專案旨在解決學生尋找資源困難以及企業/系所難以篩選合適人才的問題。系統包含三個主要角色：**學生 (Student)**、**系所 (Department)** 與 **企業 (Company)**，並由 **管理員 (Admin)** 進行系統維護。

## ✨ 核心功能

### 👨‍🎓 學生 (Student)
- **儀表板 (Dashboard)**：視覺化呈現 GPA 趨勢、學分進度與推薦資源。
- **資源申請**：瀏覽並申請各類機會（實習 Intern、研究 Research、競賽 Competition、專案 Project 等）。
- **成就歷程**：上傳並管理個人成就，支援 PDF 證明文件上傳。
- **雙重驗證 (2FA)**：支援 Google Authenticator 進行帳戶安全驗證。

### 🏢 系所與企業 (Department & Company)
- **資源管理**：發布資源並設定篩選條件 (如：系所限制、GPA 門檻)。
- **申請審核**：審核學生的資源申請，查看學生履歷與成績。
- **成就驗證**：系所可驗證學生上傳的校外成就真實性。
- **帳號註冊**：註冊後需等待管理員審核通過才可登入。

### 🛠 管理員 (Admin)
- **使用者管理**：審核企業或系所的帳號申請。
- **系統維護**：執行資料庫備份、清理過期資料。

## 🛠 技術架構

本專案採用前後端分離架構，並使用 Docker 進行容器化部署。

- **Frontend**: [Vue 3](frontend/) (Composition API), TypeScript, Vite, Pinia, Axios.
- **Backend**: [NestJS](backend/) (Node.js), TypeScript, TypeORM.
- **Database**: PostgreSQL.
- **Cache & Session**: Redis.
- **Infrastructure**: Docker, Docker Compose.

## 📂 專案結構

```text
.
├── all_tables_csv/         # 原始資料 CSV (供 Python 腳本讀取生成 SQL)
├── backend/                # NestJS 後端原始碼
├── frontend/               # Vue 3 前端原始碼
├── db/                     # 資料庫相關
│   └── init/               # 資料生成腳本 (light.py)
├── docs/                   # 專案文件
│   ├── api_manual.md       # API 規格書
│   ├── diary.md            # 開發日誌
│   └── note.md             # 開發筆記與指令
├── docker-compose.yaml     # Docker 部署設定
├── package.json            # 專案依賴描述
└── usefulsql.sql           # 常用 SQL 查詢語法
```

## 🚀 快速開始 (Installation)

### 先決條件
- Docker & Docker Compose
- Python 3 (用於生成測試資料)

### 1. 啟動服務
使用 Docker Compose 一鍵建置並啟動所有服務 (Backend, Frontend, DB, Redis, pgAdmin)。

```bash
# 建置並啟動 (背景執行)
docker compose up --build -d
```

### 2. 停止服務
```bash
docker compose down
```

## 💾 資料庫初始化 (Database Setup)

若為首次執行，資料庫內可能無資料。請依照以下步驟生成並匯入測試資料。

### 1. 生成 SQL 腳本
本專案提供 Python 腳本，讀取 all_tables_csv 下的 CSV 檔案並轉換為 SQL 插入語句。

```bash
cd db/init
python light.py
```
執行後，將會在該目錄下生成一系列 `.sql` 檔案 (如 `insert_user_data.sql`, `insert_resource.sql` 等)。

### 2. 匯入資料至 PostgreSQL
您可以透過 pgAdmin 或指令列將生成的 SQL 匯入。

**方法 A: 使用指令列 (推薦)**
假設您已進入 Docker 容器或本地有 `psql` 工具：

```bash
# 進入 postgres 容器 (假設容器名稱為 db-container，請依實際 docker ps 結果調整)
docker exec -it <db_container_name> psql -U postgres -d group_7

# 在 psql 內執行 SQL 檔案 (需先將 sql 檔案掛載或複製進容器，或直接貼上內容)
# 或者在宿主機執行：
cat db/init/insert_user_data.sql | docker exec -i <db_container_name> psql -U postgres -d group_7
```

**方法 B: 使用 pgAdmin**
1. 登入 pgAdmin (網址見下節)。
2. 連線至伺服器 (Host: db, Username/Password 參考 docker-compose.yaml)。
3. 開啟 Query Tool，將生成的 SQL 內容貼上並執行。

## 🔧 開發與維護指令 (Operations)

以下指令參考自 note.md，用於開發過程中的常見操作。

### 重建整個環境 (清除資料)
若需要完全重置環境（包含資料庫資料）：
```bash
sudo docker compose down --volumes
sudo docker compose build --no-cache
sudo docker compose up -d
```

### 修改後端程式碼後重啟
若只修改了後端邏輯，不需重建 Image，只需重啟容器：
```bash
sudo docker compose restart backend
```

### 更新後端依賴 (package.json / requirements)
若新增了 npm 套件，需要重新建置 Image：
```bash
sudo docker compose build backend
sudo docker compose up -d
```

## 🌐 服務存取

服務啟動後，可透過以下網址存取：

| 服務 | 網址 | 說明 |
|------|------|------|
| **Frontend** | [http://localhost:5173](http://localhost:5173) | 使用者操作介面 |
| **Backend API** | [http://localhost:3000](http://localhost:3000) | Swagger API 文件 (若有開啟) 或 API 入口 |
| **pgAdmin** | [http://localhost:5050](http://localhost:5050) | 資料庫管理介面 |

## 📖 文件

更多詳細資訊請參考 docs 資料夾：

- **API 手冊**: api_manual.md - 詳細的後端 API 路由與參數說明。
- **常用 SQL**: usefulsql.sql - 包含常用的資料庫查詢語句，如查詢學生成績、資源申請狀況等。
- **開發筆記**: note.md - 紀錄開發過程中的指令與備忘。

---
&copy; 2025 UniConnect. Group 7 Database Project.
