import { db } from "../../db";
import type { Conversation, Message } from "@shared/schema";

export interface IChatStorage {
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<Message>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const row = await db("conversations").where("id", id).first();
    return row ? { id: row.id, title: row.title, createdAt: row.created_at } : undefined;
  },

  async getAllConversations() {
    const rows = await db("conversations").orderBy("created_at", "desc");
    return rows.map((r: any) => ({ id: r.id, title: r.title, createdAt: r.created_at }));
  },

  async createConversation(title: string) {
    const [row] = await db("conversations").insert({ title }).returning("*");
    return { id: row.id, title: row.title, createdAt: row.created_at };
  },

  async deleteConversation(id: number) {
    await db("messages").where("conversation_id", id).del();
    await db("conversations").where("id", id).del();
  },

  async getMessagesByConversation(conversationId: number) {
    const rows = await db("messages").where("conversation_id", conversationId).orderBy("created_at", "asc");
    return rows.map((r: any) => ({ id: r.id, conversationId: r.conversation_id, role: r.role, content: r.content, createdAt: r.created_at }));
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const [row] = await db("messages").insert({ conversation_id: conversationId, role, content }).returning("*");
    return { id: row.id, conversationId: row.conversation_id, role: row.role, content: row.content, createdAt: row.created_at };
  },
};
