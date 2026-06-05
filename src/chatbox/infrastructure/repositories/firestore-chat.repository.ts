import { db } from '@src/shared/infrastructure/firebase/firebase-admin';

import { ChatExchange } from '../../domain/entities/chat-message.entity';
import { IChatRepository } from '../../domain/repositories/chat.repository';

export class FirestoreChatRepository implements IChatRepository {
  private historyCollection(uid: string) {
    return db.collection('users').doc(uid).collection('chatHistory');
  }

  async saveExchange(uid: string, exchange: ChatExchange): Promise<void> {
    await this.historyCollection(uid).doc(exchange.id).set(exchange);
  }

  async getHistory(uid: string): Promise<ChatExchange[]> {
    const snap = await this.historyCollection(uid).orderBy('timestamp', 'asc').get();
    return snap.docs.map((d) => d.data() as ChatExchange);
  }

  async deleteHistory(uid: string): Promise<void> {
    const snap = await this.historyCollection(uid).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
