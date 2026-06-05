import { ChatExchange } from '../entities/chat-message.entity';

export interface IChatRepository {
  saveExchange(uid: string, exchange: ChatExchange): Promise<void>;
  getHistory(uid: string): Promise<ChatExchange[]>;
  deleteHistory(uid: string): Promise<void>;
}
