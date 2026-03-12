import { getDifyChatResponse } from './difyService';

export const getCustomChatResponse = async (question: string) => {
    try {
        const data = await getDifyChatResponse(question, '', {});
        return data?.answer || 'Sorry, chat service is unavailable right now.';
    } catch (error) {
        console.error('Custom API Error:', error);
        return 'Sorry, chat service is unavailable right now.';
    }
};
