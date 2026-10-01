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
| `retakeSuggestion` | AI 建議補拍時的一句中文提示，不需要時是 `null`。在「我的回報」顯示，要不要補拍由使用者決定 |

## 讀取權限

- 任何人都能讀 `status == "published"` 的回報。查詢時一定要加 `where("status", "==", "published")`，不然整個查詢會被擋
- 回報者能讀自己的所有回報（包含分析中、待複核）
- 回報建立後不能修改或刪除
