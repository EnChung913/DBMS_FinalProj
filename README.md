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

請先去[此處](https://drive.google.com/drive/folders/1Sy7CGcHjWhhI_Idi095-tI2h8IE3kr96?usp=sharing)下載所需的 `backup.sql` 檔案，並放置於專案根目錄db/init下。

### 1. 啟動服務
請在專案根目錄下執行以下指令，
使用 Docker Compose 一鍵建置並啟動所有服務 (Backend, Frontend, DB, Redis, pgAdmin)。

```bash
# 建置並啟動 (背景執行)
docker compose up --build -d
```

### 2. 停止服務
```bash
docker compose down
```

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

## 以上遇到困難？

請進入frontend或backend目錄，使用以下指令安裝相依套件：
```bash
# 進入 frontend 目錄
cd frontend
# 安裝相依套件
npm install
# 回到專案根目錄
cd ..   
# 進入 backend 目錄
cd backend
# 安裝相依套件
npm install
# 回到專案根目錄
cd ..
```

接下來手動啟動服務

```bash
# 啟動後端服務
cd backend
npm run start:dev
```
開啟另一個終端機視窗

```bash
# 啟動前端服務
cd frontend
npm run dev
```                                                                                                                 

## 🌐 服務存取

服務啟動後，可透過以下網址存取：

| 服務 | 網址 | 說明 |
|------|------|------|
| **Frontend** | [http://localhost:5173](http://localhost:5173) | 使用者操作介面 |
| **Prometheus** | [http://localhost:3001](http://localhost:3001) | 監控視窗 |
| **pgAdmin** | [http://localhost:5050](http://localhost:5050) | 資料庫管理介面 |

## 📖 文件

更多詳細資訊請參考 docs 資料夾：

- **API 手冊**: backend/openapi.json - 詳細的後端 API 路由與參數說明。
- **常用 SQL**: usefulsql.sql - 包含常用的資料庫查詢語句，如查詢學生成績、資源申請狀況等。
- **開發筆記**: note.md - 紀錄開發過程中的指令與備忘。

---
&copy; 2025 UniConnect. Group 7 Database Project.
