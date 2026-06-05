import { ChatExchange } from '../../domain/entities/chat-message.entity';
import { IChatRepository } from '../../domain/repositories/chat.repository';

export const getHistory = async (
  repo: IChatRepository,
  uid: string,
): Promise<ChatExchange[]> => {
  return repo.getHistory(uid);
};
