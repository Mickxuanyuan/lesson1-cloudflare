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
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  useEffect(() => {
    if (isScrolledToBottom) {
      containerRef.current?.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isScrolledToBottom]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsScrolledToBottom(isAtBottom);
  };

  const scrollToBottom = () => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
    setIsScrolledToBottom(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsScrolledToBottom(true);

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-emerald-50/30 to-zinc-50 px-4 py-6 sm:py-10 font-sans">
      <div className="flex w-full max-w-4xl flex-col rounded-3xl border border-zinc-200/80 bg-white/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="border-b border-zinc-200/80 bg-gradient-to-r from-emerald-50/50 to-zinc-50/50 px-6 sm:px-8 py-5 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] text-emerald-600">
                lession1-cloudflare
              </p>
              <h1 className="mt-1 text-xl sm:text-2xl font-bold text-zinc-900">
                AI Chat Companion
              </h1>
            </div>
          </div>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 leading-relaxed">
            通过 GraphQL API 与第三方服务对接，快速验证你的想法。
          </p>
        </header>

        {/* Messages Container */}
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-[500px] sm:h-[600px] overflow-y-auto px-4 sm:px-6 py-6 space-y-4 scroll-smooth"
          >
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isFirst={index === 0}
              />
            ))}
            {loading && <LoadingIndicator />}
          </div>

          {/* Scroll to bottom button */}
          {!isScrolledToBottom && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 sm:right-6 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-all hover:bg-emerald-600 hover:scale-110 active:scale-95"
              aria-label="滚动到底部"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-zinc-200/80 bg-gradient-to-r from-zinc-50/50 to-emerald-50/30 px-4 sm:px-6 py-4 sm:py-5"
        >
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                id="chat"
                name="chat"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                placeholder="输入你的问题或想法... (Shift+Enter 换行)"
                rows={3}
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 pr-12 text-sm sm:text-base text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200/50 focus:shadow-md"
              />
              <div className="absolute bottom-3 right-3 text-xs text-zinc-400">
                {input.length > 0 && `${input.length} 字符`}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-auto items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 sm:px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-lg transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-lg"
            >
              {loading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="hidden sm:inline">发送中…</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span className="hidden sm:inline">发送</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500 text-center">
            按 Enter 发送，Shift+Enter 换行
          </p>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isFirst,
}: {
  message: ChatMessage;
  isFirst: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-md ${
          isUser
            ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
            : "bg-gradient-to-br from-zinc-400 to-zinc-500"
        }`}
      >
        {isUser ? (
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[75%] sm:max-w-[70%]`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm sm:text-base leading-relaxed shadow-sm transition-all duration-200 ${
            isUser
              ? "rounded-br-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
              : "rounded-tl-sm bg-zinc-100 text-zinc-800 border border-zinc-200/50"
          }`}
        >
          {message.content.split("\n").map((line, index) => (
            <p
              key={`${message.id}-${index}`}
              className="whitespace-pre-wrap break-words"
            >
              {line || "\u00A0"}
            </p>
          ))}
        </div>
        {!isFirst && (
          <span className="text-xs text-zinc-400 px-1">
            {isUser ? "你" : "AI"}
          </span>
        )}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-400 to-zinc-500 shadow-md">
        <svg
          className="h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-zinc-100 border border-zinc-200/50 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" />
          </div>
          <span className="text-sm text-zinc-600 ml-1">正在思考中...</span>
        </div>
      </div>
    </div>
  );
}
