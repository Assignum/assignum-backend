import { v4 as uuidv4 } from 'uuid';

import { ChatExchange } from '../../domain/entities/chat-message.entity';
import { IChatRepository } from '../../domain/repositories/chat.repository';
import { getBotReply, getReplyForIntent } from '../../infrastructure/services/chatbot.service';
import { analyzeMessage } from '../../infrastructure/services/clu.service';
import { AssistantContext, runAssistantAction } from '../services/assistant-actions';

// Below this CLU confidence we fall back to the keyword rules.
const MIN_CONFIDENCE = 0.7;

const ACTION_ERROR_REPLY = 'Tuve un problema al consultar tus actividades. Intenta de nuevo en unos segundos.';

const buildReply = async (ctx: AssistantContext, message: string): Promise<string> => {
  const prediction = await analyzeMessage(message);

  if (prediction && prediction.topIntent !== 'None' && prediction.confidence >= MIN_CONFIDENCE) {
    try {
      const actionReply = await runAssistantAction(prediction.topIntent, ctx, prediction.entities, message);
      if (actionReply) return actionReply;
    } catch (err) {
      console.error(`[chat] action ${prediction.topIntent} failed:`, err.message);
      return ACTION_ERROR_REPLY;
    }
    const faqReply = getReplyForIntent(prediction.topIntent);
    if (faqReply) return faqReply;
  }

  return getBotReply(message);
};

export const sendMessage = async (
  repo: IChatRepository,
  ctx: AssistantContext,
  message: string,
): Promise<string> => {
  const reply = await buildReply(ctx, message);
  const exchange: ChatExchange = {
    id: uuidv4(),
    userMessage: message,
    botReply: reply,
    timestamp: Date.now(),
  };
  await repo.saveExchange(ctx.uid, exchange);
  return reply;
};
