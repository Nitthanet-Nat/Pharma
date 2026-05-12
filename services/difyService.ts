
/// <reference types="vite/client" />

const DIFY_CHAT_ENDPOINT = "/api/dify/chat";
const DIFY_QUERY_INPUT_KEY = "user_input";
const DIFY_USER_ID = "demo-user";

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

const getDemoResponse = (query: string): DifyResponse => ({
    answer: [
        `รับทราบคำถาม: "${query}"`,
        "",
        "ตอนนี้แอปอยู่ในโหมดทดลองแชทแบบไม่ใช้ระบบ login และไม่บันทึกฐานข้อมูลจริง",
        "",
        "คำแนะนำเบื้องต้น:",
        "- ระบุอาการหลัก อายุ น้ำหนัก โรคประจำตัว ยาที่ใช้อยู่ และประวัติแพ้ยา",
        "- หากมีอาการรุนแรง เช่น หายใจลำบาก เจ็บหน้าอก หน้ามืดมาก หรือแพ้ยารุนแรง ควรไปพบแพทย์ทันที",
        "- ข้อมูลนี้ใช้สำหรับทดลองระบบเท่านั้น ไม่แทนการวินิจฉัยหรือคำสั่งแพทย์",
    ].join("\n"),
});

export const getDifyChatResponse = async (query: string) => {
    if (!DIFY_CHAT_ENDPOINT) {
        return getDemoResponse(query);
    }

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
        return getDemoResponse(query);
    }
};
