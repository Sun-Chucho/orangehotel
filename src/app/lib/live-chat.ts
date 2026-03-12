import { readJson, writeJson } from "@/app/lib/storage";

export const STORAGE_LIVE_CHAT = "orange-hotel-live-chat";
export const LANDING_CHAT_THREAD_KEY = "orange-hotel-landing-chat-thread-id";

export type LiveChatSender = "guest" | "reception";
export type LiveChatThreadStatus = "open" | "closed";

export interface LiveChatMessage {
  id: string;
  sender: LiveChatSender;
  text: string;
  createdAt: string;
}

export interface LiveChatThread {
  id: string;
  guestName: string;
  guestContact: string;
  createdAt: string;
  updatedAt: string;
  status: LiveChatThreadStatus;
  unreadByGuest: number;
  unreadByReception: number;
  messages: LiveChatMessage[];
}

export function readLiveChatThreads() {
  const value = readJson<LiveChatThread[]>(STORAGE_LIVE_CHAT);
  return Array.isArray(value) ? value : [];
}

export function writeLiveChatThreads(threads: LiveChatThread[]) {
  writeJson(STORAGE_LIVE_CHAT, threads);
}

export function getLandingChatThreadId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LANDING_CHAT_THREAD_KEY);
}

export function setLandingChatThreadId(threadId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANDING_CHAT_THREAD_KEY, threadId);
}

export function createLiveChatThread(guestName: string, guestContact: string, openingMessage: string) {
  const now = new Date().toISOString();
  const thread: LiveChatThread = {
    id: `chat-${Date.now()}`,
    guestName: guestName.trim() || "Website Guest",
    guestContact: guestContact.trim(),
    createdAt: now,
    updatedAt: now,
    status: "open",
    unreadByGuest: 0,
    unreadByReception: 1,
    messages: [
      {
        id: `msg-${Date.now()}`,
        sender: "guest",
        text: openingMessage.trim(),
        createdAt: now,
      },
    ],
  };

  writeLiveChatThreads([thread, ...readLiveChatThreads()]);
  setLandingChatThreadId(thread.id);
  return thread;
}

export function appendLiveChatMessage(threadId: string, sender: LiveChatSender, text: string) {
  const nextText = text.trim();
  if (!nextText) return readLiveChatThreads();

  const now = new Date().toISOString();
  const nextThreads = readLiveChatThreads().map((thread) => {
    if (thread.id !== threadId) return thread;

    return {
      ...thread,
      updatedAt: now,
      unreadByGuest: sender === "reception" ? thread.unreadByGuest + 1 : 0,
      unreadByReception: sender === "guest" ? thread.unreadByReception + 1 : 0,
      messages: [
        ...thread.messages,
        {
          id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          sender,
          text: nextText,
          createdAt: now,
        },
      ],
    };
  });

  writeLiveChatThreads(nextThreads);
  return nextThreads;
}

export function markThreadSeenByGuest(threadId: string) {
  const nextThreads = readLiveChatThreads().map((thread) =>
    thread.id === threadId ? { ...thread, unreadByGuest: 0 } : thread,
  );
  writeLiveChatThreads(nextThreads);
  return nextThreads;
}

export function markThreadSeenByReception(threadId: string) {
  const nextThreads = readLiveChatThreads().map((thread) =>
    thread.id === threadId ? { ...thread, unreadByReception: 0 } : thread,
  );
  writeLiveChatThreads(nextThreads);
  return nextThreads;
}
