# 環境構築と使い始め方

## 1. Node.jsのインストール

最新版のNode.jsをインストール  
[Node.js公式サイト](https://nodejs.org/)

## 2. gas-clasp-mcpのクローン

```bash
git clone https://github.com/HikaruEgashira/gas-clasp-mcp.git
cd gas-clasp-mcp
```

## 3. 依存関係のインストール

```bash
npm install
```

## 4. claspのセットアップ

Googleアカウントで認証し、claspを使えるようにする

```bash
npx tsx mcp.ts clasp_setup --autoInstall true --autoLogin true --listProjects true
```

## 5. プロジェクトの作成・複製

- 新規作成: `clasp_create`
- 既存複製: `clasp_clone`

# 環境(ENV)の切り替えと管理

gas-clasp-mcpは **開発用 (development)** と **本番用 (production)** の2つの環境設定を切り替えて利用できる。

- `workspaceDir/.clasp.development.json` : 開発用のclasp設定ファイル
- `workspaceDir/.clasp.production.json` : 本番用のclasp設定ファイル

`clasp_push_and_deploy`コマンドは、指定した`env`に応じて
対応する設定ファイルを `.clasp.json` に自動でコピーし、環境を切り替える。

```bash
npx tsx mcp.ts clasp_push_and_deploy --env development
npx tsx mcp.ts clasp_push_and_deploy --env production
```

production環境で`deploy`を行う場合は、
- **Gitのブランチが`main`であること**
- **作業ツリーがクリーン(未コミット変更なし)であること**
が強制される。

これにより、誤った環境や不完全な状態での本番デプロイを防止できる。
## 6. コードのプッシュ・プル・デプロイ

- `clasp_push_and_deploy`
- `clasp_pull`
