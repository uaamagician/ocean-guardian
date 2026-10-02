# Ocean Guardian 前端

Vite + React。部署在 Firebase Hosting（`firebase deploy --only hosting`，會先需要 `npm run build`）。

```bash
cd web
npm install
npm run dev
```

## 連 Firebase

已經設定好，直接 import：

```js
import { auth, db, storage } from "./firebase";
```

`src/firebase-config.json` 是 Web App「Ocean Guardian Web」的公開設定，可以 commit，不是密碼。

## 送出一筆回報

使用者不用註冊，用匿名登入拿 uid：

```js
import { signInAnonymously } from "firebase/auth";
const { user } = await signInAnonymously(auth);
```

流程：**先上傳照片到 Storage，再建立 Firestore 文件**。文件一建立，後端的 `analyzeReport` 就會自動開始分析，前端不用另外呼叫。

1. 照片上傳到 `reports/{uid}/{任意檔名}`
2. 在 `reports` collection 新增文件，**只能有這 6 個欄位**，多一個或少一個都會被安全規則擋掉：

| 欄位 | 內容 |
|---|---|
| `type` | `"trash"` 或 `"coral"` |
| `photos` | 照片的 Storage 路徑清單，1 到 4 張，都要在自己的 `reports/{uid}/` 底下 |
| `location` | `{ lat, lng }`，數字 |
| `reporterId` | 目前使用者的 uid |
| `createdAt` | 一定要用 `serverTimestamp()` |
| `status` | 一定要是 `"processing"` |

### 照片限制

- 單張小於 **3MB**，格式 jpeg / png / webp / heic
- 手機原圖常常超過 3MB，**上傳前要先縮圖**（長邊 2048px 就夠 AI 判讀）
- 同一路徑不能重複上傳（防止 AI 判讀完後照片被換掉），檔名請用不會重複的值

### 拍照提示

拍法不限制，提示只是建議，不要擋使用者送出：
- 「退後一點，把整片沙灘拍進來」
- 「看到垃圾可以再靠近 1-2 公尺多拍一張」

## 讀取分析結果

AI 分析通常 5-10 秒，Gemini 塞車時會自動重試，最慢實測約 70 秒。送出後先顯示「分析中」，用 `onSnapshot` 監聽文件，不要讓使用者乾等。

`status` 會從 `processing` 變成：
- `published`：信心值 ≥ 0.5，會出現在公開地圖
- `pending_review`：信心值不夠、照片不是海灘或珊瑚、或分析出錯（`aiError` 有原因），只有回報者自己看得到

`aiAnalysis` 的內容：

| 欄位 | 內容 |
|---|---|
| `category` | 垃圾：`clean` / `light` / `moderate` / `heavy` / `not_beach`；珊瑚：`healthy` / `partially_bleached` / `severely_bleached` / `dead` / `not_coral` |
| `confidence` | 0 到 1 |
| `items` | AI 確定辨識出的人造垃圾（英文） |
| `uncertainItems` | 看不清楚、無法確定的東西 |
| `retakeSuggestion` | AI 建議補拍時的一句英文提示，不需要時是 `null`。在 My Reports 顯示，要不要補拍由使用者決定 |

## 讀取權限

- 任何人都能讀 `status == "published"` 的回報。查詢時一定要加 `where("status", "==", "published")`，不然整個查詢會被擋
- 回報者能讀自己的所有回報（包含分析中、待複核）
- 回報建立後不能修改或刪除

## 淨灘規劃（AI）

`planCleanup` 是 callable function，前端用 `src/lib/cleanup.js` 的 `requestPlan(beach)` 呼叫：

- 方圓 3 公里內至少要有 2 筆已公開的垃圾回報，否則回傳 `{ status: "needs_reports" }`
- 結果存在 Firestore `cleanupPlans/{beachId}`（任何人可讀，只有 function 能寫）。沒有新回報時直接回傳存好的，不會重複呼叫 Gemini
- `useStoredPlan(beachId)` 即時讀取存好的規劃；`planInputs(reports, beach)` 用和 function 相同的條件判斷規劃是否過期
- `plan.gear[].tool` 只會是 `src/lib/guide.js` 裡 `TOOLS` 的 id，連到 `/guide#tool-{id}` 的說明。新增工具時兩邊（這裡和 `functions/planCleanup.js`）都要加

## Field guide

垃圾種類、清理工具和安全守則都集中在 `src/lib/guide.js`，`/guide` 頁、首頁簡介和淨灘規劃都從這裡讀，不要在其他地方另外寫一份。

## 淨灘活動與工單

`src/lib/events.js` 包含所有讀寫。資料結構：

- `events/{id}`：活動本身。`workOrder` 是建立當下從 AI 規劃複製的快照（人數、時長、袋數、裝備、分組 `teams`、危險、建議），之後規劃更新也不會改到已經開放報名的活動。建立後只有主辦人能把 `status` 改成 `cancelled`，其他欄位都不能改
- `events/{id}/signups/{uid}`：每人一筆，公開（暱稱、人數 `groupSize`、可以帶的工具 `bringing`、備註）。修改報名請用 `updateDoc`，不要重寫 `createdAt`
- `events/{id}/contacts/{uid}`：聯絡方式，只有本人和主辦人讀得到

主辦人身分綁在匿名登入的 uid 上，換瀏覽器或清除網站資料就會失去主辦人權限（之後接正式登入再解決）。活動頁的「On the day」天氣約 16 天內、潮汐約一週內才有預報。
