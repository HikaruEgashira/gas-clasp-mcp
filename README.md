<div align="center">

<img src="website/static/img/logo.png" alt="Logo" width="200"/>

# GAS Clasp MCP

Google Apps Scriptを管理するMCPサーバーです

</div>

## 設定方法

1. Denoをインストールします（https://docs.deno.com/runtime/getting_started/installation/
   を参照）。
2. MCPの設定ファイルに以下を追加してください：

```json
{
  "mcpServers": {
    "gas-clasp": {
      "command": "deno",
      "args": [
        "run",
        "--allow-read=.",
        "--allow-run",
        "--allow-env",
        "--allow-net",
        "jsr:@hikae/gas-clasp-mcp/mcp.ts",
        "--rootdir",
        "/Users/xxx/workspace"
      ],
      "env": {},
      "disabled": false,
      "alwaysAllow": [],
      "autoApprove": []
    }
  }
}
```

### 環境設定（env）

デプロイは、以下の環境を指定して実行できます：

- `development`: 開発環境
- `production`: 本番環境
  - **重要**:
    本番環境へのデプロイは、`main`ブランチにpushが完了した後に実行可能になります。

## 利用可能なツール

1. **clasp_setup**:
   clasp環境のセットアップ（claspのインストール、ログイン）を行います。
2. **clasp_logout**: claspを使って現在のGoogleアカウントからログアウトします。｀
3. **clasp_create**: 新しいGoogle Apps Scriptプロジェクトを作成します。
4. **clasp_clone**: 既存のGoogle Apps Scriptプロジェクトをクローンします。
5. **clasp_pull**:
   リモートの変更をローカルプロジェクトに取得します。指定した環境に応じて自動的に`.clasp.json`を切り替えます。
6. **clasp_push_and_deploy**:
   ローカルの変更をプッシュし、必要に応じてデプロイします。指定した環境に応じて自動的に`.clasp.json`を切り替えます。
7. **clasp_list**: アカウントに紐づくGoogle Apps
   Scriptプロジェクトの一覧を表示します。
