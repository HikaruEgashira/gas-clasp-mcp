## 開発環境のセットアップ

1. **Denoのインストール**: [https://deno.land/](https://deno.land/)
   の手順に従ってください。
2. **依存関係のキャッシュ**:
   ```bash
   deno cache mcp.ts
   ```
3. **直接実行**:
   ```bash
   deno run --allow-read --allow-run --allow-env --allow-net mcp.ts --workspacedir /path/to/project
   ```
   
   または、環境変数を使用:
   ```bash
   WORKSPACE_DIR=/path/to/project deno run --allow-read --allow-run --allow-env --allow-net mcp.ts
   ```

## Build with Docker

```bash
docker login ghcr.io

docker buildx build --load -t gas-clasp-mcp .
docker tag gas-clasp-mcp ghcr.io/hikaruegashira/gas-clasp-mcp:latest
IMAGE_ID=$(docker inspect --format='{{.Id}}' gas-clasp-mcp | cut -d':' -f2 | head -c 12)
docker tag gas-clasp-mcp ghcr.io/hikaruegashira/gas-clasp-mcp:sha-$IMAGE_ID

docker push ghcr.io/hikaruegashira/gas-clasp-mcp:latest
docker push ghcr.io/hikaruegashira/gas-clasp-mcp:sha-$IMAGE_ID
```
