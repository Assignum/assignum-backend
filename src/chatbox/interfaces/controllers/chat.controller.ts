import { Request, Response } from 'express';

import { validate } from '@src/shared/validation/validate';

import { deleteHistory } from '../../application/use-cases/delete-history.use-case';
import { getHistory } from '../../application/use-cases/get-history.use-case';
import { sendMessage } from '../../application/use-cases/send-message.use-case';
import { FirestoreChatRepository } from '../../infrastructure/repositories/firestore-chat.repository';
import { sendMessageSchema } from '../schemas/chat.schema';

const repo = new FirestoreChatRepository();

export const sendMessageHandler = async (req: Request, res: Response): Promise<void> => {
  const { message } = validate(sendMessageSchema, req.body);
  const reply = await sendMessage(repo, req.uid, message);
  res.json({ reply });
};

export const getHistoryHandler = async (req: Request, res: Response): Promise<void> => {
  const history = await getHistory(repo, req.uid);
  res.json(history);
};

export const deleteHistoryHandler = async (req: Request, res: Response): Promise<void> => {
  await deleteHistory(repo, req.uid);
  res.json({ message: 'Chat history deleted' });
};
