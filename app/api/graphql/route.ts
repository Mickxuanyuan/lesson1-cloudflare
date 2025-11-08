import { createSchema, createYoga } from "graphql-yoga";
import { gql } from "graphql-tag";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const typeDefs = gql`
  type ChatMessage {
    id: ID!
    role: String!
    content: String!
  }

  type ChatResponse {
    message: ChatMessage!
  }

  type Query {
    _health: String!
  }

  input SendMessageInput {
    message: String!
  }

  type Mutation {
    sendMessage(input: SendMessageInput!): ChatResponse!
  }
`;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type WorkerEnv = Record<string, string | undefined> & {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  DEEPSEEK_TIMEOUT_MS?: string;
  DEEPSEEK_BASE_URL?: string;
};

type YogaContext = {
  env?: WorkerEnv;
};

const resolvers = {
  Query: {
    _health: () => "ok",
  },
  Mutation: {
    sendMessage: async (
      _parent: unknown,
      args: { input: { message: string } },
      context: YogaContext
    ) => {
      const reply = await fetchDeepseekCompletion(
        args.input.message,
        context.env
      );

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
      };

      return {
        message: assistantMessage,
      };
    },
  },
};

type DeepseekChatResponse = {
  choices: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function readEnvValue(key: keyof WorkerEnv, env?: WorkerEnv) {
  const fromContext = env?.[key];
  if (fromContext && fromContext.trim() !== "") {
    return fromContext;
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    const fromProcess = process.env[key];
    if (fromProcess && fromProcess.trim() !== "") {
      return fromProcess;
    }
  }
  return undefined;
}

async function fetchDeepseekCompletion(
  userMessage: string,
  env?: WorkerEnv
): Promise<string> {
  const apiKey = readEnvValue("DEEPSEEK_API_KEY", env);
  if (!apiKey) {
    console.warn("[chat] Missing DEEPSEEK_API_KEY.");
    return "服务器缺少 DEEPSEEK_API_KEY，请先在环境变量或 Workers Secrets 中配置后再试。";
  }

  const timeoutSetting = readEnvValue("DEEPSEEK_TIMEOUT_MS", env);
  const timeoutParsed = timeoutSetting ? Number(timeoutSetting) : NaN;
  const timeoutMs =
    Number.isFinite(timeoutParsed) && timeoutParsed > 0 ? timeoutParsed : 25_000;

  const baseUrl =
    readEnvValue("DEEPSEEK_BASE_URL", env) ?? "https://api.deepseek.com";
  const endpoint = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: readEnvValue("DEEPSEEK_MODEL", env) ?? "deepseek-chat",
        temperature: 0.7,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "你是一位中英双语的 DeFi 技术助教，帮助用户把想法转换成下一步行动。",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `DeepSeek request failed (${response.status}): ${errorBody || "unknown"}`
      );
    }

    const data = (await response.json()) as DeepseekChatResponse;
    const content =
      data.choices?.[0]?.message?.content?.trim() ??
      `DeepSeek 没有返回内容，请稍后再试。`;

    return content;
  } catch (error) {
    console.error("[chat] DeepSeek request failed", error);
    if (error instanceof Error && error.name === "AbortError") {
      return `与 DeepSeek 的连接在 ${Math.floor(
        timeoutMs / 1000
      )} 秒后超时，请再尝试一次。`;
    }
    return `抱歉，调用 DeepSeek 出错：${
      error instanceof Error ? error.message : "未知原因"
    }`;
  } finally {
    clearTimeout(timeout);
  }
}

const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Request, Response, Headers },
  context: ({ request }): YogaContext => ({
    env: (request as any)?.env as WorkerEnv | undefined,
  }),
});

export { yoga as GET, yoga as POST, yoga as OPTIONS };
