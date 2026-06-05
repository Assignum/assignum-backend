import { IChatRepository } from '../../domain/repositories/chat.repository';

export const deleteHistory = async (
  repo: IChatRepository,
  uid: string,
): Promise<void> => {
  await repo.deleteHistory(uid);
};
