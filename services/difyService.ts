
/// <reference types="vite/client" />

const DIFY_CHAT_ENDPOINT = import.meta.env.VITE_DIFY_BASE_URL || "/api/dify/chat";

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

export const getDifyChatResponse = async (
    query: string,
    inputs: Record<string, unknown> = {},
    user: string = "web-client-user"
) => {
    try {
        const workflowInputs: Record<string, unknown> = { ...inputs };
        if (workflowInputs.user_input === undefined) {
            workflowInputs.user_input = query;
        }

        const payload: Record<string, unknown> = {
            inputs: workflowInputs,
            response_mode: "blocking",
            user,
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
            throw new Error(`Dify API call failed with status: ${response.status}`);
        }

        const data: DifyResponse = await response.json();
        return data;
    } catch (error) {
        console.error("Dify Service Error:", error);
        return null;
    }
};
