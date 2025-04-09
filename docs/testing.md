# MCP SDK Testing Best Practices (Deno版)

このドキュメントは、`@modelcontextprotocol/sdk` を **Deno** 環境で利用する際の、  
**最適なテスト戦略**をまとめたものです。

---

## 1. 手動検証には MCP Inspector

- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) を使い、  
- MCPサーバに **stdio** または **HTTP/SSE** で接続し、  
- **ツール、リソース、プロンプト**をGUIで操作・検証  
- **JSON-RPC通信の詳細**も確認可能  
- **開発中の手動QAに最適**

---

## 2. 自動テストは `deno test` で完結

### 基本方針

- **Denoの標準 `deno test`** で全てのテストを実行  
- **MCPサーバをサブプロセスで起動し、`@modelcontextprotocol/sdk`の`Client`で通信**  
- **JSON-RPC通信を実サーバに対して行う**  
- **モックは極力使わず**、実際の通信を重視  
- **ユニットテスト**は純粋関数に限定

---

## 3. 実装例

### `Client` + `StdioClientTransport` を使う

```typescript
import { Client } from "npm:@modelcontextprotocol/sdk@1.5.0/client/index.js";
import { StdioClientTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/client/stdio.js";

const transport = new StdioClientTransport({
  command: "deno",
  args: ["run", "-A", "mcp.ts"],
});

const client = new Client({
  name: "test-client",
  version: "0.1.0",
});

await client.connect(transport);

const response = await client.listTools();

console.log(response.tools);

await transport.close();
```

### 実行例

```bash
deno test --allow-run --allow-net --allow-env --allow-read tests/test.ts
```
