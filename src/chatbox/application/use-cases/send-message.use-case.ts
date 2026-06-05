import { v4 as uuidv4 } from 'uuid';

import { ChatExchange } from '../../domain/entities/chat-message.entity';
import { IChatRepository } from '../../domain/repositories/chat.repository';
import { getBotReply } from '../../infrastructure/services/chatbot.service';

export const sendMessage = async (
  repo: IChatRepository,
  uid: string,
  message: string,
): Promise<string> => {
  const reply = getBotReply(message);
  const exchange: ChatExchange = {
    id: uuidv4(),
    userMessage: message,
    botReply: reply,
    timestamp: Date.now(),
  };
  await repo.saveExchange(uid, exchange);
  return reply;
};
