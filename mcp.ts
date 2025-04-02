#!/usr/bin/env npx tsx

import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { platform } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const execPromise = promisify(exec);

function toToolSchema(schema: z.ZodType<any, any>): any {
  return zodToJsonSchema(schema);
}

async function executeCommand(command: string[], rootDir?: string): Promise<string> {
  try {
    const cmd = command.join(" ");
    const options: { cwd?: string } = {};
    if (rootDir) options.cwd = resolve(rootDir);
    const { stdout, stderr } = await execPromise(cmd, options);

    if (stderr && stderr.length > 0) {
      return stdout + `\nWarnings: ${stderr}`;
    }

    return stdout;
  } catch (error: any) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

async function checkGitStatus(
  rootDir?: string
): Promise<{ isMainBranch: boolean; hasChanges: boolean }> {
  try {
    const options: { cwd?: string } = {};
    if (rootDir) {
      options.cwd = resolve(rootDir);
    }

    try {
      await access(resolve(rootDir || ".", ".git"), constants.R_OK);
    } catch (e) {
      throw new Error("Gitリポジトリが見つかりません。");
    }

    const { stdout: branchOutput } = await execPromise("git rev-parse --abbrev-ref HEAD", options);
    const currentBranch = branchOutput.trim();
    const isMainBranch = currentBranch === "main" || currentBranch === "master";

    const { stdout: statusOutput } = await execPromise("git status --porcelain", options);
    const hasChanges = statusOutput.trim() !== "";

    return { isMainBranch, hasChanges };
  } catch (error: any) {
    throw new Error(`Git状態の確認に失敗しました: ${error.message}`);
  }
}

async function manageClaspJson(rootDir: string, env?: string): Promise<() => Promise<void>> {
  const claspJsonPath = resolve(rootDir, ".clasp.json");
  const backupPath = resolve(rootDir, ".clasp.json.bak");
  let originalClaspJsonExists = false;
  let backupCreated = false;

  const cleanup = async () => {
    if (backupCreated) {
      try {
        await fs.rename(backupPath, claspJsonPath);
      } catch (err) {
        console.error(`Failed to restore .clasp.json from backup: ${err}`);
      }
    } else if (!originalClaspJsonExists && env) {
      try {
        await fs.unlink(claspJsonPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error(`Failed to remove temporary .clasp.json: ${err}`);
        }
      }
    }
  };

  if (!env) {
    return async () => {};
  }

  const envClaspJsonPath = resolve(rootDir, `.clasp.${env}.json`);

  try {
    await fs.access(envClaspJsonPath, constants.R_OK);
  } catch (e) {
    throw new Error(`指定された環境の設定ファイルが見つかりません: ${envClaspJsonPath}`);
  }

  try {
    await fs.access(claspJsonPath, constants.R_OK);
    originalClaspJsonExists = true;
    await fs.rename(claspJsonPath, backupPath);
    backupCreated = true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      await cleanup();
      throw new Error(`既存の.clasp.jsonのバックアップに失敗しました: ${e}`);
    }
    originalClaspJsonExists = false;
  }

  try {
    await fs.copyFile(envClaspJsonPath, claspJsonPath);
  } catch (e) {
    await cleanup();
    throw new Error(`.clasp.${env}.json から .clasp.json へのコピーに失敗しました: ${e}`);
  }

  return cleanup;
}

async function listEnvironments(
  rootDir: string
): Promise<{ environments: string[]; currentEnv: string | null }> {
  const files = await fs.readdir(rootDir);
  const envFiles = files.filter(
    (file) => file.match(/^\.clasp\..+\.json$/) && file !== ".clasp.json.bak"
  );
  const environments = envFiles
    .map((file) => file.match(/^\.clasp\.(.+)\.json$/)?.[1])
    .filter((env): env is string => !!env);

  let currentEnv: string | null = null;
  try {
    const currentClaspContent = await fs.readFile(resolve(rootDir, ".clasp.json"), "utf-8");
    const currentClaspData = JSON.parse(currentClaspContent);
    const currentScriptId = currentClaspData.scriptId;

    for (const env of environments) {
      const envFilePath = resolve(rootDir, `.clasp.${env}.json`);
      try {
        const envClaspContent = await fs.readFile(envFilePath, "utf-8");
        const envClaspData = JSON.parse(envClaspContent);
        if (envClaspData.scriptId === currentScriptId) {
          currentEnv = env;
          break;
        }
      } catch (e) {
        console.warn(`Warning: Could not read or parse ${envFilePath}: ${e}`);
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(
        `Warning: Could not read or parse .clasp.json to determine current environment: ${e}`
      );
    }
  }

  return { environments, currentEnv };
}

const EnvSchema = z
  .string()
  .optional()
  .describe(
    "操作対象の環境名 (例: dev, prod)。指定しない場合はデフォルトの.clasp.jsonを使用します。"
  );

async function isClaspInstalled(): Promise<boolean> {
  try {
    const whichCmd = platform() === "win32" ? "where" : "which";
    await executeCommand([whichCmd, "clasp"]);
    return true;
  } catch (e) {
    return false;
  }
}

const ClaspSetupArgsSchema = z.object({
  autoInstall: z
    .boolean()
    .optional()
    .default(true)
    .describe("claspがインストールされていない場合、自動的にインストールするかどうか"),
  autoLogin: z
    .boolean()
    .optional()
    .default(false)
    .describe("自動的にGoogleアカウントへのログインを開始するかどうか"),
  global: z
    .boolean()
    .optional()
    .default(true)
    .describe("インストールする場合、グローバルインストールするかどうか"),
  listProjects: z
    .boolean()
    .optional()
    .default(true)
    .describe("セットアップ後にプロジェクト一覧を表示するかどうか"),
});

const ClaspLogoutArgsSchema = z.object({});

const ClaspCreateArgsSchema = z.object({
  title: z.string().describe("プロジェクトのタイトル"),
  rootDir: z.string().describe("プロジェクトのルートディレクトリ"),
  type: z
    .enum(["standalone", "docs", "sheets", "slides", "forms", "webapp", "api"])
    .optional()
    .describe("プロジェクトタイプ"),
  env: EnvSchema.describe(
    "作成する環境名。指定した場合、成功後に .clasp.{env}.json が保存されます。"
  ),
});

const ClaspCloneArgsSchema = z.object({
  scriptId: z.string().describe("クローンするスクリプトID"),
  rootDir: z.string().describe("クローン先のディレクトリ"),
  env: EnvSchema.describe(
    "クローンする環境名。指定した場合、成功後に .clasp.{env}.json が保存されます。"
  ),
});

const ClaspPullArgsSchema = z.object({
  rootDir: z.string().describe("プルするプロジェクトのディレクトリ"),
  scriptId: z
    .string()
    .optional()
    .describe("プルするスクリプトID（指定しない場合は.clasp.jsonから取得）"),
  env: EnvSchema,
});

const ClaspPushArgsSchema = z.object({
  rootDir: z.string().describe("プッシュするプロジェクトのディレクトリ"),
  force: z.boolean().optional().default(false).describe("確認プロンプトを無視してプッシュする"),
  watch: z.boolean().optional().default(false).describe("ファイル変更を監視して自動プッシュする"),
  env: EnvSchema,
});

const ClaspDeployArgsSchema = z.object({
  rootDir: z.string().describe("デプロイするプロジェクトのディレクトリ"),
  env: z.string().describe("デプロイ対象の環境名 (例: dev, prod)。必須です。"),
  version: z.string().optional().describe("デプロイするバージョン"),
  description: z.string().optional().describe("デプロイの説明"),
});

const ClaspListArgsSchema = z.object({});

const ClaspListEnvsArgsSchema = z.object({
  rootDir: z.string().describe("環境一覧を取得するプロジェクトのディレクトリ"),
});

const TOOLS: Tool[] = [
  {
    name: "clasp_setup",
    description:
      "claspの環境を一括セットアップします。インストール状態をチェックし、必要に応じてインストールします。オプションでGoogleアカウントへのログインも行います。",
    inputSchema: toToolSchema(ClaspSetupArgsSchema),
  },
  {
    name: "clasp_logout",
    description: "現在ログインしているGoogle Accountからログアウトします。",
    inputSchema: toToolSchema(ClaspLogoutArgsSchema),
  },
  {
    name: "clasp_create",
    description: "新しいGoogle Apps Scriptプロジェクトを作成します。",
    inputSchema: toToolSchema(ClaspCreateArgsSchema),
  },
  {
    name: "clasp_clone",
    description: "既存のGoogle Apps Scriptプロジェクトをローカルにクローンします。",
    inputSchema: toToolSchema(ClaspCloneArgsSchema),
  },
  {
    name: "clasp_pull",
    description: "リモートのGoogle Apps Scriptプロジェクトの変更をローカルに取得します。",
    inputSchema: toToolSchema(ClaspPullArgsSchema),
  },
  {
    name: "clasp_push",
    description: "ローカルの変更をリモートのGoogle Apps Scriptプロジェクトにプッシュします。",
    inputSchema: toToolSchema(ClaspPushArgsSchema),
  },
  {
    name: "clasp_deploy",
    description: "Google Apps Scriptプロジェクトをデプロイします。",
    inputSchema: toToolSchema(ClaspDeployArgsSchema),
  },
  {
    name: "clasp_list",
    description: "Google Apps Scriptプロジェクトのリストを表示します。",
    inputSchema: toToolSchema(ClaspListArgsSchema),
  },
  {
    name: "clasp_list_envs",
    description: "プロジェクトの環境設定一覧を表示します。",
    inputSchema: toToolSchema(ClaspListEnvsArgsSchema),
  },
];

const server = new Server(
  {
    name: "clasp_tools",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, () => ({
  resources: [],
}));

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req: any) => {
  const { params } = req;
  const name = params.name;
  const args = params.arguments || {};

  switch (name) {
    case "clasp_setup": {
      const parsed = ClaspSetupArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for clasp_setup: ${parsed.error}`);
      }

      const { autoInstall, autoLogin, global, listProjects } = parsed.data;
      const installed = await isClaspInstalled();

      let resultText = "";
      let statusInfo = "";
      let version = "";

      if (installed) {
        try {
          version = await executeCommand(["clasp", "--version"]);
          statusInfo = `✅ Claspがインストールされています\nバージョン: ${version.trim()}`;
        } catch (e) {
          statusInfo = "✅ Claspがインストールされていますが、バージョン情報の取得に失敗しました";
        }
        resultText = `${statusInfo}\n\n🚀 claspの準備が完了しています。以下のコマンドを使用できます：\n- clasp_create: 新しいプロジェクトを作成\n- clasp_clone: 既存プロジェクトをクローン`;
      } else {
        statusInfo = "❌ Claspがインストールされていません";

        if (autoInstall) {
          resultText = `${statusInfo}\n\n🔄 claspを自動インストールします...`;

          try {
            const cmd = ["npm", "install"];
            if (global) {
              cmd.push("-g");
            }

            resultText += `\n\n⏳ @google/clasp をインストール中です...`;

            if (global) {
              resultText += " (グローバルインストール)";
            } else {
              resultText += " (ローカルインストール)";
            }

            resultText += "\nインストールには数分かかる場合があります...";

            cmd.push("@google/clasp");

            const output = await executeCommand(cmd);
            const newInstallCheck = await isClaspInstalled();

            if (newInstallCheck) {
              try {
                version = await executeCommand(["clasp", "--version"]);
                resultText += `\n\n✅ インストール成功！\nバージョン: ${version.trim()}\n\n🚀 次のステップ：\n1. autoLogin: true オプションでclasp_setup を実行してGoogleアカウントにログイン\n2. clasp_create または clasp_clone でプロジェクトを開始`;
              } catch (e) {
                resultText += `\n\n✅ インストール成功！\n\n🚀 次のステップ：\n1. autoLogin: true オプションでclasp_setup を実行してGoogleアカウントにログイン\n2. clasp_create または clasp_clone でプロジェクトを開始`;
              }
            } else {
              resultText += `\n\n⚠️ インストールプロセスは完了しましたが、claspが見つかりません。\nインストール出力:\n${output}\n\nパスが正しく設定されているか確認してください。`;
            }
          } catch (e: any) {
            resultText += `\n\n❌ インストールに失敗しました: ${e.message}\n\n手動でインストールするには：\n\`npm install -g @google/clasp\`を実行してください。`;
          }
        } else {
          resultText = `${statusInfo}\n\n💡 インストールするには：\n1. clasp_install を実行する\n2. または clasp_setup を autoInstall: true で実行する`;

          return {
            content: [
              {
                type: "text",
                text: resultText,
              },
            ],
          };
        }
      }

      if (autoLogin && (installed || (autoInstall && (await isClaspInstalled())))) {
        try {
          resultText += "\n\n🔑 Googleアカウントへのログインを開始します...";

          const loginOutput = await executeCommand(["clasp", "login"]);
          resultText += `\n\n${loginOutput}`;
          resultText +=
            "\n\nブラウザが開きます。表示されるGoogleログイン画面で認証を完了してください。";

          resultText += "\n\n認証プロセスが開始されました。ブラウザでの認証を完了してください。";
        } catch (e: any) {
          resultText += `\n\n❌ ログイン処理の開始に失敗しました: ${e.message}`;
          resultText +=
            "\n\n手動でログインするには、autoLogin: true オプションでclasp_setupを再実行してください。";
        }
      }

      if (listProjects && (installed || (autoInstall && (await isClaspInstalled())))) {
        try {
          const projectList = await executeCommand(["clasp", "list"]);

          if (projectList?.trim()) {
            resultText += `\n\n📋 プロジェクト一覧:\n${projectList}`;
          } else {
            resultText +=
              "\n\n📋 プロジェクトはまだありません。新しいプロジェクトを作成するには clasp_create を使用してください。";
          }
        } catch (e) {
          resultText +=
            "\n\n⚠️ プロジェクト一覧の取得に失敗しました。Google アカウントにログインしていない可能性があります。";
          resultText +=
            "\nログインするには autoLogin: true オプションでclasp_setupを実行してください。";
        }
      }

      resultText += "\n\n";
      resultText +=
        "注意: GASの操作はMCPツールを利用してください。手動で `npm install -g @google/clasp` を実行したり、`npx @google/clasp`のようにterminalでclaspを実行しないようにしましょう。";

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    }

    case "clasp_logout": {
      const parsed = ClaspLogoutArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for clasp_logout: ${parsed.error}`);
      }

      try {
        const output = await executeCommand(["clasp", "logout"]);
        return {
          content: [{ type: "text", text: `Clasp logout successful:\n${output}` }],
        };
      } catch (e: any) {
        throw new Error(`Failed to logout from clasp: ${e.message}`);
      }
    }

    case "clasp_create": {
      const parsed = ClaspCreateArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for clasp_create: ${parsed.error}`);
      }

      const { title, rootDir, type, env } = parsed.data;
      const cmd = ["clasp", "create", "--title", title];

      if (type) {
        cmd.push("--type", type);
      }

      try {
        let cleanup = async () => {};
        if (env) {
          cleanup = await manageClaspJson(rootDir, env);
        }

        try {
          const output = await executeCommand(cmd, rootDir);

          if (env) {
            const originalPath = resolve(rootDir, ".clasp.json");
            const envPath = resolve(rootDir, `.clasp.${env}.json`);

            try {
              await fs.copyFile(originalPath, envPath);
            } catch (err) {
              return {
                content: [
                  {
                    type: "text",
                    text: `プロジェクト「${title}」の作成は成功しましたが、環境ファイル(.clasp.${env}.json)の保存に失敗しました: ${err}\n\n${output}`,
                  },
                ],
              };
            }
          }

          return {
            content: [
              {
                type: "text",
                text: `プロジェクト「${title}」が作成されました${env ? `（環境: ${env}）` : ""}:\n${output}`,
              },
            ],
          };
        } finally {
          await cleanup();
        }
      } catch (e: any) {
        throw new Error(`プロジェクト作成に失敗しました: ${e.message}`);
      }
    }

    case "clasp_clone": {
      const parsed = ClaspCloneArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for clasp_clone: ${parsed.error}`);
      }

      const { scriptId, rootDir, env } = parsed.data;

      let directoryExists = false;
      let hasClaspConfig = false;

      try {
        await executeCommand([`[ -d "${rootDir}" ] && echo "exists" || echo "not exists"`]).then(
          (output) => {
            directoryExists = output.trim() === "exists";
          }
        );

        await executeCommand([
          `[ -f "${rootDir}/.clasp.json" ] && echo "exists" || echo "not exists"`,
        ]).then((output) => {
          hasClaspConfig = output.trim() === "exists";
        });
      } catch (error) {
        directoryExists = false;
        hasClaspConfig = false;
      }

      if (directoryExists && hasClaspConfig) {
        return {
          content: [
            {
              type: "text",
              text: `エラー: 指定されたディレクトリ(${rootDir})は既に存在し、.clasp.jsonファイルが含まれています。\n別のディレクトリを指定するか、既存のディレクトリを削除してください。`,
            },
          ],
        };
      }

      try {
        const cmd = ["clasp", "clone", scriptId];

        if (rootDir) {
          cmd.push("--rootDir", rootDir);
        }

        const output = await executeCommand(cmd);

        if (env) {
          const originalPath = resolve(rootDir, ".clasp.json");
          const envPath = resolve(rootDir, `.clasp.${env}.json`);

          try {
            await fs.copyFile(originalPath, envPath);
            return {
              content: [
                {
                  type: "text",
                  text: `プロジェクトのクローンに成功しました（環境: ${env}）:\n${output}`,
                },
              ],
            };
          } catch (err) {
            return {
              content: [
                {
                  type: "text",
                  text: `プロジェクトのクローンは成功しましたが、環境ファイル(.clasp.${env}.json)の保存に失敗しました: ${err}\n\n${output}`,
                },
              ],
            };
          }
        }

        return {
          content: [{ type: "text", text: `プロジェクトのクローンに成功しました:\n${output}` }],
        };
      } catch (e: any) {
        throw new Error(`プロジェクトのクローンに失敗しました: ${e.message}`);
      }
    }

    case "clasp_pull": {
      const parsed = ClaspPullArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for clasp_pull: ${parsed.error}`);
      }

      const { rootDir, scriptId, env } = parsed.data;

      try {
        let cleanup = async () => {};
        if (env) {
          cleanup = await manageClaspJson(rootDir, env);
        }

        try {
          const cmd = ["clasp", "pull"];
          if (scriptId) {
            cmd.push("--scriptId", scriptId);
          }

          const output = await executeCommand(cmd, rootDir);
          return {
            content: [
              {
                type: "text",
                text: `プロジェクトの取得に成功しました${env ? `（環境: ${env}）` : ""}:\n${output}`,
              },
            ],
          };
        } finally {
          await cleanup();
        }
      } catch (e: any) {
        throw new Error(`プロジェクトの取得に失敗しました: ${e.message}`);
      }
    }

    case "clasp_push": {
      const parsed = ClaspPushArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for clasp_push: ${parsed.error}`);
      }

      const { rootDir, force, watch, env } = parsed.data;

      try {
        let cleanup = async () => {};
        if (env) {
          cleanup = await manageClaspJson(rootDir, env);
        }

        try {
          if (env === "production") {
            const gitStatus = await checkGitStatus(rootDir);

            if (!gitStatus.isMainBranch) {
              throw new Error(
                "本番環境(production)へのプッシュは、mainまたはmasterブランチからのみ可能です。"
              );
            }

            if (gitStatus.hasChanges) {
              throw new Error(
                "本番環境(production)へのプッシュ前に、すべての変更をコミットする必要があります。"
              );
            }
          }
          const cmd = ["clasp", "push"];

          if (force) {
            cmd.push("--force");
          }

          if (watch) {
            cmd.push("--watch");
          }

          const output = await executeCommand(cmd, rootDir);
          return {
            content: [
              {
                type: "text",
                text: `プロジェクトのプッシュに成功しました${env ? `（環境: ${env}）` : ""}:\n${output}`,
              },
            ],
          };
        } finally {
          await cleanup();
        }
      } catch (e: any) {
        throw new Error(`プロジェクトのプッシュに失敗しました: ${e.message}`);
      }
    }

    case "clasp_deploy": {
      const parsed = ClaspDeployArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for clasp_deploy: ${parsed.error}`);
      }

      const { rootDir, env, version, description } = parsed.data;

      try {
        let cleanup = async () => {};
        cleanup = await manageClaspJson(rootDir, env);

        try {
          if (env === "production") {
            const gitStatus = await checkGitStatus(rootDir);

            if (!gitStatus.isMainBranch) {
              throw new Error(
                "本番環境(production)へのデプロイは、mainまたはmasterブランチからのみ可能です。"
              );
            }

            if (gitStatus.hasChanges) {
              throw new Error(
                "本番環境(production)へのデプロイ前に、すべての変更をコミットする必要があります。"
              );
            }
          }

          const cmd = ["clasp", "deploy"];

          if (version) {
            cmd.push("--version", version);
          }

          if (description) {
            cmd.push("--description", description);
          }

          const output = await executeCommand(cmd, rootDir);
          return {
            content: [
              {
                type: "text",
                text: `プロジェクトのデプロイに成功しました（環境: ${env}）:\n${output}`,
              },
            ],
          };
        } finally {
          await cleanup();
        }
      } catch (e: any) {
        throw new Error(`プロジェクトのデプロイに失敗しました: ${e.message}`);
      }
    }

    case "clasp_list": {
      const parsed = ClaspListArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for clasp_list: ${parsed.error}`);
      }

      try {
        const output = await executeCommand(["clasp", "list"]);
        return {
          content: [{ type: "text", text: `Google Apps Scriptプロジェクト一覧:\n${output}` }],
        };
      } catch (e: any) {
        throw new Error(`プロジェクト一覧の取得に失敗しました: ${e.message}`);
      }
    }

    case "clasp_list_envs": {
      const parsed = ClaspListEnvsArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for clasp_list_envs: ${parsed.error}`);
      }

      const { rootDir } = parsed.data;

      try {
        const { environments, currentEnv } = await listEnvironments(rootDir);

        if (environments.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `環境設定がまだ存在しません。\n\n新しい環境を作成するには、clasp_create または clasp_clone コマンドを env パラメータを指定して実行してください。`,
              },
            ],
          };
        }

        let resultText = "プロジェクトの環境一覧:\n\n";

        for (const env of environments) {
          const envPath = resolve(rootDir, `.clasp.${env}.json`);
          try {
            const content = await fs.readFile(envPath, "utf-8");
            const configData = JSON.parse(content);
            const scriptId = configData.scriptId || "unknown";
            const rootDir = configData.rootDir || ".";

            resultText += `📌 ${env}${currentEnv === env ? " (現在の環境)" : ""}\n`;
            resultText += `   Script ID: ${scriptId}\n`;
            resultText += `   Root Dir: ${rootDir}\n\n`;
          } catch (e) {
            resultText += `📌 ${env}: 設定ファイルの読み取りに失敗しました\n\n`;
          }
        }

        resultText += "\n使用方法:\n";
        resultText +=
          "各環境を利用するには、clasp_pull, clasp_push, clasp_deploy などのコマンドで env パラメータを指定します。\n";
        resultText += '例: { "env": "dev" } または { "env": "production" }';

        return {
          content: [{ type: "text", text: resultText }],
        };
      } catch (e: any) {
        throw new Error(`環境一覧の取得に失敗しました: ${e.message}`);
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  transport.start();
}

main();
