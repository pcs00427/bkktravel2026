# Bangkok Travel Planner

一個可即時更新的五天旅遊行程網頁，現在先把資料存在瀏覽器的 `localStorage`，方便先整理行程、測試欄位與版型。之後可以再改成 Supabase，讓多人共用同一份資料。

## 目前功能

- 五天行程卡片
- 去程 / 回程航班資訊
- 全程交通提醒
- 每日多筆行程項目
- 每筆行程可填交通方式與 Google Maps 連結
- 自動儲存到 `localStorage`
- JSON 匯出 / 匯入

## 檔案結構

- `index.html`：頁面結構
- `styles.css`：版面與樣式
- `app.js`：資料、渲染、儲存邏輯

## 本機預覽

直接雙擊 `index.html` 可以先看畫面。

如果要用本機 server 預覽：

```bash
python3 -m http.server 4173
```

然後打開 `http://127.0.0.1:4173`

## 下一步

- 上 GitHub
- 開 GitHub Pages
- 串接 Supabase
- 改成多人共同編輯
