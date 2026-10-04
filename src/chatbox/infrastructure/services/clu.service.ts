import axios from 'axios';

const API_VERSION = '2023-04-01';
const TIMEOUT_MS = 5000;

export interface CluEntity {
  category: string;
  text: string;
  confidenceScore: number;
}

export interface CluPrediction {
  topIntent: string;
  confidence: number;
  entities: CluEntity[];
}

interface CluResponse {
  result: {
    prediction: {
      topIntent: string;
      intents: Array<{ category: string; confidenceScore: number }>;
      entities: CluEntity[];
    };
  };
}

/**
 * Sends the message to the deployed CLU model. Returns null when CLU is not
 * configured or the call fails, so the caller can fall back to keyword rules.
 */
export const analyzeMessage = async (text: string): Promise<CluPrediction | null> => {
  const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT;
  const key = process.env.AZURE_LANGUAGE_KEY;
  if (!endpoint || !key) return null;

  try {
    const res = await axios.post<CluResponse>(
      `${endpoint.replace(/\/+$/, '')}/language/:analyze-conversations?api-version=${API_VERSION}`,
      {
        kind: 'Conversation',
        analysisInput: { conversationItem: { id: '1', participantId: 'user', text } },
        parameters: {
          projectName: process.env.CLU_PROJECT_NAME ?? 'assignum-assistant',
          deploymentName: process.env.CLU_DEPLOYMENT_NAME ?? 'production',
          stringIndexType: 'TextElement_V8',
        },
      },
      { headers: { 'Ocp-Apim-Subscription-Key': key }, timeout: TIMEOUT_MS },
    );

    const { topIntent, intents, entities } = res.data.result.prediction;
    const confidence = intents.find((i) => i.category === topIntent)?.confidenceScore ?? 0;
    return { topIntent, confidence, entities };
  } catch (err) {
    console.error('[clu] analyze-conversations failed:', err.message);
    return null;
  }
};
