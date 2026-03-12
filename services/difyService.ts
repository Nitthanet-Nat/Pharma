
/// <reference types="vite/client" />

const DIFY_CHAT_ENDPOINT = import.meta.env.VITE_DIFY_BASE_URL || "/api/dify/chat";

export interface DifyResponse {
    event: string;
    message_id: string;
    conversation_id: string;
    mode: string;
    answer: string;
    metadata: any;
    created_at: number;
}

export const getDifyChatResponse = async (
    query: string,
    conversationId: string = "",
    inputs: Record<string, unknown> = {},
    user: string = "web-client-user"
) => {
    try {
        const payload: Record<string, unknown> = {
            inputs,
            query,
            response_mode: "blocking",
            user,
        };

        if (conversationId) {
            payload.conversation_id = conversationId;
        }

        const response = await fetch(DIFY_CHAT_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error("Dify API Error Status:", response.status, errorData);
            throw new Error(`Dify API call failed with status: ${response.status}`);
        }

        const data: DifyResponse = await response.json();
        return data;
    } catch (error) {
        console.error("Dify Service Error:", error);
        return null;
    }
};
