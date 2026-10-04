# line-drive-backup

LINE 群組裡的圖片、影片、音訊、檔案，在送出的當下自動存進 Google Drive。
跑在 Google Apps Script（GAS），零主機、零費用。一個群組一個資料夾。

## 限制（先看）

- Bot **只收得到加入群組之後**的訊息，歷史檔案抓不回來。
- GAS 的 `doPost` 拿不到 HTTP header，**無法驗證 LINE 簽章**，改用 webhook URL 的 `?token=` 擋陌生來源。
- `UrlFetchApp` 單檔上限約 **50MB**，更大的影片會失敗（只記 log，不影響其他檔案）。
- 要備份哪個群組 = 把 Bot 加進哪個群組。不想備份就把 Bot 踢出去。

## 設定步驟

### 1. LINE Developers 建 Bot

1. 到 <https://developers.line.biz/console/> 用 LINE 帳號登入。
2. 建立 Provider → 建立 **Messaging API** channel（免費方案即可，不需要推播額度）。
3. 進 channel 的 **Messaging API** 分頁：
   - **Allow bot to join group chats** → 開啟。
   - **Auto-reply messages** → 關閉（不然 Bot 會在群組亂回話）。
   - 最下面 **Channel access token (long-lived)** → Issue，複製起來。

### 2. Google Drive 建根資料夾

在 Drive 建一個資料夾（例如 `LINE備份`），開啟後網址最後一段就是 **資料夾 ID**：
`https://drive.google.com/drive/folders/<這段就是ID>`

### 3. 用 clasp 上傳程式碼

```bash
pnpm dlx @google/clasp login
pnpm dlx @google/clasp create --type webapp --title "line-drive-backup" --rootDir src
pnpm dlx @google/clasp push
```

`clasp create` 會在專案根目錄產生 `.clasp.json`（已 gitignore）。
第一次 `clasp login` 可能要先到 <https://script.google.com/home/usersettings> 開啟 Apps Script API。

### 4. 填 Script Properties

`pnpm dlx @google/clasp open` 開啟 GAS 編輯器 → 左側齒輪「專案設定」→ **指令碼屬性** → 新增三個：

| 屬性 | 值 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | 步驟 1 的 token |
| `ROOT_FOLDER_ID` | 步驟 2 的資料夾 ID |
| `WEBHOOK_TOKEN` | 自己產一串隨機字，例如 `openssl rand -hex 24` |

### 5. 部署成網頁應用程式

GAS 編輯器右上 **部署 → 新增部署** → 類型選 **網頁應用程式**：
- 執行身分：**我**
- 誰可以存取：**所有人**

按部署、授權 Drive 權限，複製 **網頁應用程式 URL**（`https://script.google.com/macros/s/.../exec`）。

> 之後改程式碼要 `clasp push` 後再「管理部署 → 編輯 → 版本：新版本」，URL 才會更新到新程式。

### 6. 把 Webhook 接到 LINE

回 LINE Developers 的 Messaging API 分頁：
- **Webhook URL** 填 `<步驟5的URL>?token=<WEBHOOK_TOKEN>`
- **Use webhook** 開啟
- 按 **Verify**，應顯示 Success

### 7. 測試

掃 QR code 把 Bot 加好友，再邀進目標群組，丟一張圖片和一個 PDF。
幾秒後 Drive 的 `LINE備份/<群組名>/` 應出現 `20261005_120506_xxx.jpg`、`20261005_120510_report.pdf`。

出問題看 GAS 編輯器左側「執行」頁的 log。

## 本機測試

```bash
node test/pure.test.js
```

只測不碰 GAS 全域物件的純函式（事件過濾、檔名組合）。
