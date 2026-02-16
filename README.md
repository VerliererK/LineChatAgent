# Line Chat Agent (Vercel + Neon)

本專案是一個部署於 Vercel Functions 的 Line 聊天機器人，使用 Vercel AI Gateway（預設模型 `openai/gpt-5`），輕鬆開始聊天，也支援其它供應商（Google Gemini、OpenAI 或相容的 API 服務如 OpenRouter）。機器人具備多種智慧工具功能，使用 Neon Serverless Postgres 進行對話記錄儲存，並支援 Tool calling 功能，讓 AI 能夠調用外部工具執行特定任務。


## 主要特色

- **Line Webhook**：透過 Line Webhook 接收用戶訊息並使用 AI 進行回應，支援文字與圖片訊息（圖片不儲存在資料庫）
- **Web UI**：提供網頁聊天介面，支援串流回應、圖片上傳與 LLM 模型設定面板
- **Vercel Functions**：啟用 Fluid compute 能有 300 秒的運行時間，能產生更多的回應內容（Line 不支援 Streaming 回應，所以要等待全部內容產生完畢才能回應）
- **Vercel AI SDK**：支援 Vercel AI Gateway（預設）、OpenAI、Google Gemini
- **Tool calling**：
  - 對話記錄清除
  - 天氣查詢（需 Google Weather API）
  - 地點搜尋（需 Google Maps API）
  - 網路搜尋（需 Tavily API）
- **Neon Database**：透過 Neon Serverless Postgres 儲存對話歷史與模型設定


## 安裝與設定

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **設定 Neon 資料庫**
   在 Vercel 專案的儀表板中，前往 **Storage** 分頁，點擊 **Create DataBase**。
   選擇 **Neon** 建立資料庫。Vercel 會自動為您建立一個 Neon 專案，並將相關環境變數設定到專案中。

3. **設定環境變數**  
   請於 Vercel 專案設定或本地 `.env` 檔案中設置下列變數：

   | 變數名稱 | 取得方式 |
   |---|---|
   | `AUTH_KEY` | 自行設定的隨機安全金鑰，用於保護 API |
   | `AI_GATEWAY_API_KEY` | [Vercel AI Gateway](https://vercel.com/docs/ai-gateway/getting-started#set-up-your-api-key) 的 API 金鑰。當 Provider 為 `vercel` (預設) 時使用。 |
   | `LINE_CHANNEL_ACCESS_TOKEN` | [Line Developers Console](https://developers.line.biz/console/) 建立 Channel 後取得 |
   | `LINE_CHANNEL_SECRET` | 同上 |
   | `GOOGLE_MAP_API_KEY` | (可選) [Google Cloud Console](https://console.cloud.google.com/) 啟用 Places API 和 Weather API 並取得 |
   | `TAVILY_API_KEY` | (可選) [Tavily AI](https://tavily.com/) 註冊取得 |

4. **設定 Line Webhook URL**  
   部署到 Vercel 後，請將 Line Bot 的 Webhook URL 設為：  
   ```
   https://<你的 Vercel 網域>/api/webhook
   ```

5. **更改設定**
   部署完成後，請開啟您的 Vercel 網域的根目錄 (`https://<你的 Vercel 網域>`)。
   您會看到一個網頁介面，請在此頁面輸入您在環境變數中設定的 `AUTH_KEY` 進行登入。
   登入後，點擊右上角的齒輪圖示「⚙️」，即可開啟設定，在此處填寫並儲存您要使用的語言模型（LLM）相關設定。


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

- 請妥善保管所有 API 金鑰與環境變數，勿公開於公開 Repo。
- Neon 資料庫配置需正確，否則無法儲存對話紀錄與設定。
- 若需自訂系統提示，可透過設定更新 `system_role` 或修改 `lib/DEFAULT_SYSTEM_ROLE.ts`。


## 授權

MIT License
