# 🐾 Petopia

Petopia 是一個專為毛孩與飼主打造的 **寵物生活平台**，整合了 **寵物友善地點地圖** 與 **寵物交友** 功能。  
希望能解決飼主的日常痛點，讓毛孩和飼主都能有更好的生活體驗。

---

## 🚀 功能特色

### 🗺️ 地圖功能 (Map)
- 使用 **Leaflet + Next.js** 實作互動式地圖  
- 顯示 **寵物友善地點**（咖啡廳、餐廳、公園、美容等）  
- 提供分類篩選（ex: 🐶 寵物餐廳、🐱 貓咪咖啡廳、🦎 特寵店）  
- 支援：
  - 重新定位
  - 「搜尋此區域」自動更新地點
  - 地點詳情卡片（名稱、地址、電話、營業時間、評論、圖片）  
- 使用者可以收藏喜愛地點 👍  

### ❤️ 交友功能 (Pet Matching)
- 飼主可建立 **毛孩個人檔案**（名字、品種、生日、性格、照片）  
- 地圖上顯示附近毛孩，飼主能透過「愛心」配對  
- 若雙方互相喜歡 ➡️ 開啟一對一聊天室 💬  
- 支援毛孩性格標籤（例如：親人友善、喜歡露營、怕生、跑跑）  

---

## 🛠️ 技術架構

- **前端**：Next.js 14 + React 18  
- **後端**：Express + Prisma  
- **資料庫**：SQLite（本地開發） → 可改 MySQL  
- **UI/UX**：Tailwind CSS + DaisyUI + ShadCN  
- **地圖**：Leaflet + OpenStreetMap  
- **部署**：
  - 前端 → Vercel
  - 後端 API → Render  

---

## 📸 Screenshots

以下展示了本專案的核心功能畫面：

### 🔍 地圖入口首頁
使用者可以透過入口頁面了解地圖與交友的檢疫功能介紹。
![Map Search](./screenshots/map-index1.png)
![Map Search](./screenshots/map-index2.png)
![Map Search](./screenshots/map-index3.png)
![Map Search](./screenshots/map-index4.png)
![Map Search](./screenshots/map-index5.png)

### 🔍 地圖搜尋地點
使用者可以透過地圖搜尋附近的寵物友善地點，不同地點類型會顯示不同顏色的圖標。
![Map Search](./screenshots/map-search1.png)
![Map Search](./screenshots/map-search2.png)
![Map Search](./screenshots/map-search3.png)

### 🔍 詳細地點卡片
使用者可以查看地點詳細資訊，獲得地點的資訊及其他使用者的評論及分享的照片，按下導航功能會顯示定位與目標地點的路徑。
![Map Search](./screenshots/map-detail1.png)
![Map Search](./screenshots/map-detail2.png)
![Map Search](./screenshots/map-detail3.png)
![Map Search](./screenshots/map-navigation1.png)


### 🐾 寵物交友配對
寵物交友功能，讓毛孩們也能認識新朋友。
![Pet Match](./screenshots/friend1.png)
![Pet Match](./screenshots/friend2.png)
![Pet Match](./screenshots/friend3.png)
![Pet Match](./screenshots/friend4.png)
![Pet Match](./screenshots/friend5.png)
![Pet Match](./screenshots/friend6.png)
![Pet Match](./screenshots/friend7.png)
![Pet Match](./screenshots/friend8.png)
![Pet Match](./screenshots/friend9.png)
![Pet Match](./screenshots/friend10.png)
![Pet Match](./screenshots/friend11.png)
![Pet Match](./screenshots/friend12.png)
![Pet Match](./screenshots/friend13.png)
![Pet Match](./screenshots/friend14.png)
![Pet Match](./screenshots/friend15.png)

---

### 🎬 期末專題發表影片
以下展示了完整的操作流程：（稍等資展國際將影片連結上傳）

---


## 📂 專案結構 (前端部分)

```bash
app/
 ├── layout.js           # 全域佈局
 ├── page.js             # 首頁
 └── map/                # ⭐ 你的地圖 & 交友主要程式碼
      ├── page.js        # 地圖主頁
      ├── _components/   # 子元件 (地點卡片、篩選按鈕、交友 UI...)
      └── usedata/       # hooks, SWR 資料抓取
