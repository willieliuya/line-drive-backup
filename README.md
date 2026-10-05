# line-drive-backup

LINE 群組裡的圖片、影片、音訊、檔案，在送出的當下自動存進 Google Drive。
跑在 Google Apps Script，不用架主機、不用付費。一個群組一個資料夾。

整個設定過程只需要瀏覽器，不用安裝任何軟體，大約 15 分鐘。

## 開始前先知道的限制

- Bot **只會存它加入群組之後**的檔案，之前的抓不回來。
- 單一檔案上限約 **50MB**，更大的影片會略過，其他檔案不受影響。
- 要備份哪個群組，就把 Bot 加進哪個群組。不想備份就把 Bot 踢出去。
- LINE 設定頁按 Verify 會顯示 302 錯誤，這是正常的（原因見步驟 6）。

## 設定步驟

### 1. 建立 LINE Bot

1. 開 <https://developers.line.biz/console/>，用你的 LINE 帳號登入。
2. 按「Create a new provider」，名稱隨便取（例如你的名字）。
3. 按「Create a Messaging API channel」。如果它要你先建立 LINE 官方帳號，就照著建，帳號名稱就是 Bot 在群組裡顯示的名字（例如「群組備份小幫手」）。建好後到官方帳號管理頁 → 設定 → Messaging API → 啟用。
4. 回到官方帳號管理頁（<https://manager.line.biz/>）：
   - **設定 → 回應設定**：把「加入好友的歡迎訊息」關掉。「自動回應訊息」維持關閉。
   - **設定 → 帳號設定 → 功能切換**：「加入群組／多人聊天室」改成接受。
5. 回到 LINE Developers → 你的 channel → **Messaging API** 分頁 → 捲到最底 **Channel access token (long-lived)** → 按 **Issue**。把那一長串複製下來存好，等等要用。

### 2. 在 Google Drive 建資料夾

1. 開 <https://drive.google.com>，新增一個資料夾，取名例如 `LINE備份`。
2. 點進去那個資料夾，看網址列：
   `https://drive.google.com/drive/folders/1AbCdEf...`
   `folders/` 後面那一串就是**資料夾 ID**，複製下來。

### 3. 建立 Apps Script 專案並貼上程式碼

1. 開 <https://script.google.com>，用**跟 Drive 同一個** Google 帳號登入。
2. 左上「新專案」。左上角專案名稱改成 `line-drive-backup`。
3. 把編輯器裡原本的內容全部刪掉，打開本專案的 [`src/Code.js`](src/Code.js)，點右上角的複製圖示，整份貼進編輯器。
4. 按 Ctrl+S（Mac 是 ⌘S）存檔。

### 4. 填三個設定值

1. 左側齒輪「專案設定」。
2. 「時區」改成 **(GMT+08:00) Taipei**。
3. 捲到最底「指令碼屬性」→「新增指令碼屬性」，加三筆：

| 屬性 | 值 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | 步驟 1 存下來的那一長串 |
| `ROOT_FOLDER_ID` | 步驟 2 的資料夾 ID |
| `WEBHOOK_TOKEN` | 自己亂打一串英數字，至少 20 個字，例如 `kq8m2x9vd4pz7wn3rt6yhb` |

4. 按「儲存指令碼屬性」。

### 5. 部署

1. 右上「部署」→「新增部署作業」。
2. 左邊齒輪 → 選「網頁應用程式」。
3. 執行身分：**我**。誰可以存取：**所有人**。
4. 按「部署」。第一次會要求授權：按「授權存取」→ 選你的帳號 → 若出現「Google 尚未驗證這個應用程式」，按左下「進階」→「前往 line-drive-backup（不安全）」→「允許」。這是你自己的腳本要存取你自己的 Drive，可以放心。
5. 部署完會顯示「網頁應用程式 網址」，按複製。長得像 `https://script.google.com/macros/s/AKfy.../exec`。

### 6. 把網址填回 LINE

1. 回 LINE Developers → 你的 channel → **Messaging API** 分頁。
2. **Webhook URL** → Edit，填入：
   `<步驟5的網址>?token=<步驟4的WEBHOOK_TOKEN>`
   例如 `https://script.google.com/macros/s/AKfy.../exec?token=kq8m2x9vd4pz7wn3rt6yhb`
3. 按 Update，然後把 **Use webhook** 開關打開。
4. 按 Verify 會顯示 **302 錯誤，這是正常的**。Google Apps Script 回應時一定先轉址一次，LINE 的 Verify 不接受轉址，但程式其實已經執行完了。直接做步驟 7 測試。

### 7. 測試

1. 在 Messaging API 分頁掃 QR code，把 Bot 加好友。
2. 把 Bot 邀進一個群組，丟一張圖片。
3. 等 5 到 10 秒，開 Drive 的 `LINE備份`，應該會多一個以群組名稱命名的資料夾，裡面有 `20261005_120506_xxx.jpg` 這樣的檔案。

沒出現的話，到 Apps Script 編輯器左側「執行作業」（時鐘圖示）看紀錄，點開失敗的那筆看紅字。最常見的原因是 `WEBHOOK_TOKEN` 跟網址裡的 `?token=` 不一樣，或 `ROOT_FOLDER_ID` 貼錯。

## 之後更新程式碼

把新版 `src/Code.js` 整份貼回編輯器存檔後，還要**重新部署**才會生效：
「部署」→「管理部署作業」→ 鉛筆圖示 → 版本選「新版本」→「部署」。網址不會變，LINE 那邊不用改。

---

## 給工程師：用 clasp 同步

不想手動貼程式碼的話，可以用 clasp 從這個 repo 直接推上去。

```bash
pnpm dlx @google/clasp login
pnpm dlx @google/clasp create --type webapp --title "line-drive-backup" --rootDir src
pnpm dlx @google/clasp push
```

第一次要先到 <https://script.google.com/home/usersettings> 開啟 Apps Script API。`clasp create` 會產生 `.clasp.json`（已 gitignore）。之後改完程式 `clasp push`，再到編輯器重新部署。

本機測試純函式：

```bash
node test/pure.test.js
```
