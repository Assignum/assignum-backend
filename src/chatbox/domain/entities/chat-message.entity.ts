export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: number;
}

export interface ChatExchange {
  id: string;
  userMessage: string;
  botReply: string;
  timestamp: number;
}
