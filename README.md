# Line Chat Agent (Vercel + Firebase)

本專案是一個部署於 Vercel Edge Functions 的 Line 聊天機器人，支援多種大型語言模型（Google Gemini、OpenAI 或相容的 API 服務如 OpenRouter）。機器人具備多種智慧工具功能，使用 Firebase Firestore 進行對話記錄儲存，並支援 Tool calling 功能，讓 AI 能夠調用外部工具執行特定任務。


## 主要特色

- **Line Webhook**：透過 Line Webhook 接收用戶訊息並使用 AI 進行回應
- **Vercel Edge Functions**：免費版有 30 秒的執行時間限制，能盡量產生更多的回應內容
- **Vercel AI SDK**：支援 OpenAI (GPT-4o) 或 Google Gemini (gemini-2.0-flash)
- **Tool calling**：
  - 日期時間查詢
  - 對話記錄清除
  - 天氣查詢 (需 Google Weather API)
  - 地點搜尋 (需 Google Maps API)
  - 網路搜尋 (需 Tavily API)
- **FireStore**：透過 Firestore 儲存對話歷史


## 安裝與設定

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **設定環境變數**  
   請於 Vercel 專案設定或本地 `.env` 檔案中設置下列變數：

   | 變數名稱 | 取得方式 |
   |---|---|
   | `LINE_CHANNEL_ACCESS_TOKEN` | [Line Developers Console](https://developers.line.biz/console/) 建立 Channel 後取得 |
   | `LINE_CHANNEL_SECRET` | 同上 |
   | `FIREBASE_CONFIG` | 於 Firebase 專案設定 > Web 應用程式 > 複製設定物件，轉成 JSON 字串後再進行 **Base64 編碼** |
   | `LLM_PROVIDER` | `openai` 或 `google` |
   | `LLM_API_KEY` | <ul><li>OpenAI: [OpenAI API Keys](https://platform.openai.com/api-keys)</li><li>Google Gemini: [Google AI Studio](https://aistudio.google.com/app/apikey)</li></ul> |
   | `LLM_MODEL` | 依 Provider 設定（如 `gpt-4o`、`gemini-2.0-flash`）|
   | `GOOGLE_MAP_API_KEY` | (可選) [Google Cloud Console](https://console.cloud.google.com/) 啟用 Places API 和 Weather API 並取得 |
   | `TAVILY_API_KEY` | (可選) [Tavily AI](https://tavily.com/) 註冊取得 |

   其他 LLM 相關變數（`LLM_BASE_URL`, `LLM_SYSTEM_ROLE`, `LLM_MAX_TOKENS`, `LLM_TEMPERATURE`, `LLM_TIMEOUT`）可依需求調整。

3. **設定 Line Webhook URL**  
   部署到 Vercel 後，請將 Line Bot 的 Webhook URL 設為：  
   ```
   https://<你的 Vercel 網域>/api/webhook
   ```

4. **設定 Firestore 安全規則**
   可將 Firestore 的安全規則設為：
   ```
   rules_version = '2';

   service cloud.firestore {
      match /databases/{database}/documents {
         match /users/{userId} {
            allow read, write: if request.auth != null;
         }
      }
   }
   ```


## 使用方式

- 在 Line 上加入您的 Bot，傳送訊息即可互動。
- 支援指令：
  - 一般聊天
  - 「清除對話」：重置對話歷史
  - 詢問「現在幾點」、「今天幾號」等會自動取得最新時間
  - 詢問天氣狀況與預報（需設好 Google Map API Key）
  - 詢問地點、店家、景點（需設好 Google Map API Key）
  - 詢問最新新聞、網路資訊（需設好 Tavily API Key）


## 注意事項

- 請妥善保管所有 API 金鑰，勿公開於公開 Repo。
- Firestore 配置需正確，否則無法儲存對話紀錄。
- 若需自訂系統提示，可調整 `LLM_SYSTEM_ROLE` 變數或修改 `lib/DEFAULT_SYSTEM_ROLE.ts`。


## 授權

MIT License
