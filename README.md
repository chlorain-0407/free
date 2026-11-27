# 房仲 AI 提示詞工作站

18 組台灣房仲提示詞，支援分類、搜尋、展開全文與一鍵複製。使用者把提示詞貼到自己的對話式 AI 再調整。圖片類同樣只提供文字提示詞，沒有上傳或站內 AI 生成。

已串接 AI 研究所 SDK 的 Express middleware，從已驗證的 `req.academy` 取得會員身分；無平台身分時保留原本匿名流程。目前不儲存會員資料。

## 執行與部署

使用 Node.js 20 以上：

```sh
npm ci
npm run build
npm test
npm start
```

開啟 http://localhost:3000。`npm run dev` 使用原始前端檔案；`npm run preview` 使用 `dist/`。正式環境設定 `NODE_ENV=production`；埠使用主機提供的 `PORT`。

SDK 設定由平台注入，不自行設定任何 `ACADEMY_` 開頭的環境變數。不需要自備 AI 金鑰或 MongoDB。必須部署 Node 後端，不能只部署 `dist/`，否則無法取得會員身分。

## 上架資訊

詳見 [平台串接與 App 市集登記清單](docs/academy-marketplace.md)，包含精確公開路徑、會員資料與刪除、登入過渡、程式用戶端／服務清單及驗收限制。

- 會員身分：`GET /api/me`；回應不包含 JWT 或 App token，不可快取。
- 刪除自己的資料：`DELETE /api/me/data`；只接受 SDK 驗證的會員身分。目前沒有會員資料儲存，因此回報刪除 0 筆。
- 上架自檢：SDK 自動處理 `GET /__academy/selfcheck` 並驗證平台 challenge。
- 目前沒有外部程式用戶端、主機服務或 webhook，不需虛構登記項目。

提示詞集中於 `src/data/prompts.js`；外觀於 `src/index.css`。SDK 身分驗證在後端，前端的 `src/platform.js` 只呼叫自己的 API 並處理平台登入、訂閱和點數錯誤。產出的內容仍由使用者審閱。
