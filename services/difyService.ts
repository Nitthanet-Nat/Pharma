
/// <reference types="vite/client" />

const DIFY_CHAT_ENDPOINT = import.meta.env.VITE_DIFY_BASE_URL || "/api/dify/chat";
const DIFY_QUERY_INPUT_KEY = (import.meta.env.VITE_DIFY_QUERY_INPUT_KEY || "user_input").trim() || "user_input";
const DIFY_USER_ID = (import.meta.env.VITE_DIFY_USER_ID || "web-client-user").trim() || "web-client-user";

export interface DifyResponse {
    workflow_run_id?: string;
    task_id?: string;
    data?: {
        status?: string;
        outputs?: Record<string, unknown>;
        error?: string | null;
        elapsed_time?: number;
        total_tokens?: number;
        total_steps?: number;
    };
    answer: string;
}

export const getDifyChatResponse = async (query: string) => {
    try {
        const workflowInputs: Record<string, unknown> = { [DIFY_QUERY_INPUT_KEY]: query };
        const payload: Record<string, unknown> = {
            query,
            inputs: workflowInputs,
            response_mode: "blocking",
            user: DIFY_USER_ID,
        };

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
            const detailMessage =
                errorData && typeof errorData === "object" && "details" in errorData
                    ? JSON.stringify((errorData as { details?: unknown }).details)
                    : null;
            throw new Error(detailMessage || `Dify API call failed with status: ${response.status}`);
        }

        const data: DifyResponse = await response.json();
        return data;
    } catch (error) {
        console.error("Dify Service Error:", error);
        return null;
    }
};
