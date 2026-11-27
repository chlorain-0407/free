# 房仲 AI 提示詞工作站

台灣房仲常用提示詞清單。選擇分類或搜尋，複製完整提示詞，再貼到使用者自己的對話式 AI，替換方括號並繼續調整。

18 組提示詞涵蓋開發委託、帶看跟進、物件行銷、議價斡旋、稅務法規、圖片視覺。圖片類同樣只提供文字提示詞。

## 執行

使用 Node.js 22 以上。不需安裝套件、不需環境變數、AI 金鑰或 MongoDB。

```sh
node server.mjs
```

開啟 http://localhost:3000。也可使用 `npm run dev` 或 `bun run dev`。`PORT` 可指定服務埠。

## 建置、測試與部署

```sh
node scripts/build.mjs
node --test
node server.mjs --preview
```

`dist/` 可直接部署到靜態主機。原本的 Node 主機可執行 `npm run build`，再用 `npm start`（正式環境設 `NODE_ENV=production`）。舊啟動入口 `server.ts` 仍可用 Node 執行。若部署平台曾設定自訂 Vite 指令或 frozen lockfile 安裝步驟，請改用本專案的新指令；本專案已無套件依賴。

網站沒有站內模型呼叫、圖片上傳、帳號、簽名檔或資料庫寫入。舊的生成與資料 API 已移除；既有資料庫本身未變動。瀏覽與搜尋僅在瀏覽器執行，複製失敗時會展開並選取全文供手動複製。

提示詞內容集中於 `src/data/prompts.js`；外觀於 `src/index.css`。稅務與貸款範本要求使用者的 AI 查核適用日期官方資料，不內嵌可能過期的稅率或政策額度。提示詞不保證第三方 AI 的正確性，產出仍需由使用者審閱。
