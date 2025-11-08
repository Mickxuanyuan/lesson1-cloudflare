"use client";

import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useMutation,
} from "@apollo/client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      message {
        id
        role
        content
      }
    }
  }
`;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const client = useMemo(
    () =>
      new ApolloClient({
        uri: "/api/graphql",
        cache: new InMemoryCache(),
      }),
    []
  );

  return (
    <ApolloProvider client={client}>
      <ChatInterface />
    </ApolloProvider>
  );
}

function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "你好，我是你的 AI 伙伴。和我聊聊你在 DeFi 或 Cloudflare 课程里的收获吧！",
    },
  ]);
  const [input, setInput] = useState("");
  const [sendMessage, { loading }] = useMutation(SEND_MESSAGE_MUTATION);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const { data } = await sendMessage({
        variables: { input: { message: trimmed } },
      });

      const aiMessage = data?.sendMessage?.message;
      if (aiMessage) {
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("Failed to send message", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "抱歉，暂时无法获取 AI 回应，请稍后再试或检查网络连接。",
        },
      ]);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 font-sans text-zinc-900">
      <div className="flex w-full max-w-3xl flex-col rounded-3xl border border-zinc-200 bg-white shadow-xl">
        <header className="border-b border-zinc-200 px-8 py-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            lession1-cloudflare
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">
            AI Chat Companion
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            通过 GraphQL API 与第三方服务对接，快速验证你的想法。
          </p>
        </header>

        <div
          ref={containerRef}
          className="flex-1 space-y-4 overflow-y-auto px-8 py-6"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-2 text-sm text-zinc-500">
                正在召唤 AI 回应…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-zinc-200 px-8 py-6"
        >
          <label htmlFor="chat" className="sr-only">
            发送消息
          </label>
          <div className="flex gap-4">
            <textarea
              id="chat"
              name="chat"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入你的问题或想法..."
              className="h-24 w-full resize-none rounded-2xl border border-zinc-200 p-4 text-base text-zinc-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-24 rounded-2xl bg-emerald-500 px-6 text-base font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "发送中…" : "发送"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? "rounded-br-sm bg-emerald-500 text-white"
            : "rounded-tl-sm bg-zinc-100 text-zinc-800"
        }`}
      >
        {message.content.split("\n").map((line, index) => (
          <p key={`${message.id}-${index}`} className="whitespace-pre-wrap">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
