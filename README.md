# prototype MCP

## Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "prototype": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp.ts"],
      "env": {},
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## インストールと実行方法

1. **依存関係のインストール**:
   ```bash
   npm install
   ```

2. **直接実行**:
   ```bash
   npx tsx mcp.ts
   ```

## Tools

### Google Clasp操作ツール

このMCPサーバーは、Google Apps Scriptのコマンドラインツール[clasp](https://github.com/google/clasp)を操作するための以下のツールを提供します。

#### 環境設定 (env)

デプロイには環境（environment）が設定できるようになりました：

- `development`: 開発環境（デフォルト）
- `staging`: テスト環境
- `production`: 本番環境
  - **重要**: production環境へのデプロイは、gitのmainブランチかつ変更がない（すべてコミット済み）状態でのみ可能です

1. **clasp_setup**: claspの環境を一括セットアップします。インストール状態をチェックし、必要に応じてインストールします。オプションでGoogleアカウントへのログインも行います。
   ```json
   {
     "rootDir": "プロジェクトのルートディレクトリ",
     "autoInstall": "claspがインストールされていない場合、自動的にインストールするかどうか (任意: true/false)",
     "autoLogin": "自動的にGoogleアカウントへのログインを開始するかどうか (任意: true/false)",
     "global": "インストールする場合、グローバルインストールするかどうか (任意: true/false)",
     "listProjects": "セットアップ後にプロジェクト一覧を表示するかどうか (任意: true/false)"
   }
   ```
2. **clasp_logout**: 現在ログインしているGoogleアカウントからログアウトします。
   ```json
   {
     "rootDir": "プロジェクトのルートディレクトリ"
   }
   ```
3. **clasp_create**: 新しいGoogle Apps Scriptプロジェクトを作成します。
   ```json
   {
     "title": "プロジェクトのタイトル",
     "rootDir": "プロジェクトのルートディレクトリ",
     "type": "プロジェクトタイプ (任意: standalone/docs/sheets/slides/forms/webapp/api)"
   }
   ```
4. **clasp_clone**: 既存のGoogle Apps Scriptプロジェクトをクローンします。
   ```json
   {
     "scriptId": "クローンするスクリプトID",
     "rootDir": "クローン先のディレクトリ"
   }
   ```
5. **clasp_pull**: リモートのGoogle Apps Scriptプロジェクトの変更をローカルに取得します。
   ```json
   {
     "rootDir": "プルするプロジェクトのディレクトリ",
     "scriptId": "プルするスクリプトID（任意）"
   }
   ```
6. **clasp_push**: ローカルの変更をリモートのGoogle Apps Scriptプロジェクトにプッシュします。
   ```json
   {
     "rootDir": "プッシュするプロジェクトのディレクトリ",
     "force": "確認プロンプトを無視するかどうか (任意: true/false)",
     "watch": "ファイル変更を監視して自動プッシュするかどうか (任意: true/false)",
   }
   ```
7. **clasp_deploy**: Google Apps Scriptプロジェクトをデプロイします。
   ```json
   {
     "rootDir": "デプロイするプロジェクトのディレクトリ",
     "env": "実行環境 (development/staging/production)",
     "version": "デプロイするバージョン (任意)",
     "description": "デプロイの説明 (任意)",
   }
   ```
8. **clasp_list**: Google Apps Scriptプロジェクトのリストを表示します。
   ```json
   {
     "rootDir": "プロジェクトのディレクトリ"
   }
   ```

### 使用例

```javascript
// 開発環境でのデプロイ
use_mcp_tool({
  server_name: "test",
  tool_name: "clasp_deploy",
  arguments: {
    "rootDir": "/Users/username/projects/my-gas-project",
    "env": "development",
    "description": "開発環境デプロイ"
  }
});

// 本番環境でのデプロイ (mainブランチかつ変更なしの状態が必要)
use_mcp_tool({
  server_name: "test",
  tool_name: "clasp_deploy",
  arguments: {
    "rootDir": "/Users/username/projects/my-gas-project",
    "env": "production",
    "description": "本番環境リリース v1.0.0"
  }
});
```
