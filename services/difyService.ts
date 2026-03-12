
/// <reference types="vite/client" />

const DIFY_CHAT_ENDPOINT = import.meta.env.VITE_DIFY_BASE_URL || "/api/dify/chat";
const DIFY_APP_MODE = (import.meta.env.VITE_DIFY_APP_MODE || import.meta.env.DIFY_APP_MODE || "workflow").toLowerCase();
const DIFY_QUERY_INPUT_KEY = (import.meta.env.VITE_DIFY_QUERY_INPUT_KEY || "user_input").trim() || "user_input";
const IS_WORKFLOW_MODE = DIFY_APP_MODE.includes("workflow");

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
        const payload: Record<string, unknown> = IS_WORKFLOW_MODE
            ? {
                inputs: workflowInputs,
                response_mode: "blocking",
                user: "test-user-1",
            }
            : {
                query,
                inputs: workflowInputs,
                response_mode: "blocking",
                user: "test-user-1",
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
