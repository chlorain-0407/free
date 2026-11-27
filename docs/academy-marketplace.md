# AI 研究所 App 市集串接與登記清單

## 功能與安裝

18 組共用提示詞、分類、搜尋、展開與複製；圖片類只提供文字提示詞。沒有站內 AI 生成、圖片上傳或點數扣款。本次安裝 `@agentgo-tw/app-sdk` 2.7.0 與 Express 5，提交 npm 鎖定檔。Node.js 20 以上使用 `server.mjs` 啟動；舊 `server.ts` 入口只供可直接執行 TypeScript 的執行器相容使用。

## 身分與過渡

- `createAcademy()` 與 `app.use(academy.express())` 讀取平台注入設定；不自行設定任何 `ACADEMY_` 開頭的環境變數。
- SDK 驗證簽章、有效期限與 App audience 後，後端只信任 `req.academy.user.uuid`。網址、表單、請求內容及自行帶入的會員標頭不會選擇資料擁有者。
- `GET /api/me` 只回當前會員的 `user`、`entitlement`、`env`；不回身分 JWT、App token 或完整 context。回應不可快取。
- 原網站沒有登入頁或帳號系統。context 為 null 時保留匿名提示詞流程，回傳 `user: null`；不新增另一套登入或自發憑證。有平台身分時直接顯示其姓名。
- 訂閱與入口放行由平台決定；不以 tier 自行擋人，不因未知 entitlement kind 阻擋會員。
- 本 App 未開放外部服務；已驗證的 `req.academyService` 不能當成會員，會員 API 回 403 `SERVICE_NOT_SUPPORTED`。

## 資料隔離與刪除

目前沒有會員資料庫、session、分析追蹤、上傳檔案、會員自訂內容或店家共用資料。平台身分只存在請求中，瀏覽器不存 localStorage／cookie。共用提示詞不屬於任何會員。

`server/user-data.mjs` 提供 `await deleteUserData(userUuid)`，回傳：

```json
{ "deletedRecords": 0, "anonymizedRecords": 0, "storesPersonalData": false }
```

這是明確的無資料刪除結果，並非已串接某個資料庫。`DELETE /api/me/data` 只用 SDK 驗證的當前會員編號呼叫此函式，不能指定另一位會員；沒有會員身分時回 401。沒有任意 UUID 的刪除端點。

未來新增資料儲存時，每筆紀錄須存 `userUuid = req.academy.user.uuid`，所有讀寫刪除均須帶該條件；店家歸屬須由伺服器以會員編號查得，不能採信前端店號。任何新增儲存都須同步擴充 `deleteUserData`，包含共用紀錄中的個人欄位匿名化。

## 精確公開路徑

只登記以下精確路徑，**不要登記 `/`、`/api/*`、`/src/*` 等概括前綴**。下列回應不含會員資料。

| 路徑 | 方法 | 用途 |
| --- | --- | --- |
| `/health` | GET、HEAD | 固定健康檢查 |
| `/src/index.css` | GET、HEAD | 公開樣式 |
| `/src/main.js` | GET、HEAD | 公開前端程式 |
| `/src/platform.js` | GET、HEAD | 公開錯誤處理程式，不含憑證 |
| `/src/data/prompts.js` | GET、HEAD | 共用提示詞 |

平台保留自檢路徑 `GET /__academy/selfcheck` 由 SDK 自動處理並驗證簽章 challenge；無有效 challenge 回 403。請依平台自檢保留路徑機制處理，不要把整個 `/__academy/*` 公開，也不要將自檢改成無驗證的健康檢查。

`/`、`/index.html`、`/api/me`、`/api/me/data` **不登記公開**，由平台入口處理會員權益。尚未啟用入口時首頁保留原本匿名流程，不等於將會員 API 登記為免登入。

Webhook：**無**。沒有 LINE、金流或其他回呼，也沒有未驗簽回呼端點。未來新增時須先驗證來源簽章，再登記必要路徑。

## 「程式用戶端」登記

| 類型 | 名稱／代號 | 用途 | 轉址網址／資料送往哪裡 |
| --- | --- | --- | --- |
| 擴充功能、桌面、手機用戶端 | 無 | 只有一般瀏覽器網頁 | 無 |
| 外部主機服務 | 無 | 沒有背景工作或跨主機會員資料交換 | 無 |

目前不需要建立程式用戶端或服務憑證。程式不發放、驗證或撤銷自訂存取憑證，也不新增公開的外部程式 API。ChatGPT／Gemini／Claude 連結僅由使用者自行開啟第三方網站，不自動傳送提示詞或會員資料，不是程式用戶端。

未來新增實際用戶端時，另行確認名稱、用途、精確轉址網址，再用 `createAcademyClient()`／`academy.fetch()`；後端仍讀 `req.academy` 與 `client`。新增外部主機服務時，先登記 `service.key`、用途與目的地，只接受平台服務憑證；處理指定會員資料前必須 `await academy.members.entitlement(userUuid)` 且 `active === true`。目前沒有這些端點，未虛構轉址或資料目的地。

## 前端錯誤

自己的後端呼叫統一使用 `src/platform.js` 的 `requestJson()`：

| HTTP 與 code | 行為 |
| --- | --- |
| 401 `LOGIN_REQUIRED` | 以 `login_url` 導向整頁登入 |
| 403 `SUBSCRIPTION_REQUIRED` | 以 `subscribe_url` 導向整頁訂閱 |
| 402 `INSUFFICIENT_POINTS` | 顯示「點數不足」與 `upgrade_url` 升級連結 |
| 其他錯誤 | 不誤導向登入或訂閱，顯示可重試提示 |

僅接受 HTTPS 或同來源 HTTP 行動網址，不執行 javascript／data 網址。回應缺少行動網址時不自行發明登入或訂閱網址，而是顯示錯誤。網站無點數操作，402 處理不代表新增扣點功能。

## 部署與驗收

```sh
npm ci
npm run build
npm test
npm start
```

正式環境由主機設定 `NODE_ENV=production` 與 `PORT`。SDK 金鑰僅在後端讀取平台注入值，不進前端、儲存庫或自建 `.env`。本次沒有新增 `.env`、AI 金鑰或資料庫連線字串。

**不能只部署 `dist/` 到純靜態主機。** 須連同 `server.mjs`、`server/`、`package.json`、`package-lock.json` 部署並安裝依賴。

本機使用真實 SDK 驗章與測試專用 EC 金鑰／JWKS，覆蓋有效、偽造、過期、錯誤 audience、雙會員、刪除目標覆寫拒絕、服務身分拒絕、帶簽章自檢、公開回應無個資及前端錯誤分流。測試金鑰不是平台正式憑證，不用於部署。

仍須部署到平台後執行平台自檢、真實會員登入／訂閱測試與送審。本機驗章通過不等於平台已啟用或市集已上架。
