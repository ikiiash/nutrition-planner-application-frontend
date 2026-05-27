export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export interface ChatSessionSummary {
  id: number;
  title: string;
  createdAt: string;
  messageCount: number;
}

export interface ChatSessionDetail {
  id: number;
  title: string;
  createdAt: string;
  messages: ChatMessageItem[];
}

export interface ChatMessageItem {
  id: number;
  role: string;
  content: string;
  createdAt: string;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  content: string;
}

export interface AiAutofillResponse {
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrates?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  magnesiumMg?: number;
  ironMg?: number;
  calciumMg?: number;
  zincMg?: number;
  vitaminAMcg?: number;
  vitaminCMg?: number;
  vitaminDMcg?: number;
  vitaminEMg?: number;
  vitaminKMcg?: number;
  vitaminB1Mg?: number;
  vitaminB2Mg?: number;
  vitaminB6Mg?: number;
  vitaminB9Mcg?: number;
  vitaminB12Mcg?: number;
}
