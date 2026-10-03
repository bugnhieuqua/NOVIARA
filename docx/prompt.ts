/**
 * ============================================================================
 * NOVIARA AI ENGINE - CENTRALIZED PROMPT REPOSITORY
 * ============================================================================
 * Tập trung toàn bộ System Instructions, Prompts, JSON Schemas và Template Builders
 * cho các tác vụ AI trong hệ thống NOVIARA:
 * 1. Phân tích & Giải thích nhóm sinh viên (Explain Group AI) - CHƯA KÍCH HOẠT
 * 2. Bóc tách & Chuẩn hóa danh sách Giảng viên từ tài liệu thô (AI Lecturer Agent)
 * 3. Hướng dẫn & Chỉ thị mặc định cho AI Agent
 *
 * GIAI ĐOẠN HIỆN TẠI:
 * - Genetic Algorithm (GA) là CORE ENGINE thực hiện phân nhóm.
 * - Gemini CHỈ đảm nhiệm AI Lecturer Agent: bóc tách/chuẩn hóa dữ liệu và hỗ trợ
 *   tạo tài khoản theo workflow của hệ thống.
 * - Gemini KHÔNG được phép tự chia nhóm, thay đổi chromosome, fitness,
 *   constraint hoặc kết quả GA.
 * - Explain Group AI được giữ nguyên cấu trúc export để không phá vỡ các import
 *   hiện tại, nhưng chỉ là module dự phòng cho giai đoạn sau.
 * ============================================================================
 */

import { Student, GroupExplanation, GroupMetrics } from '../src/types';

/**
 * Interface cấu trúc của một Mẫu Prompt
 */
export interface PromptTemplate<TParams = any> {
    id: string;
    name: string;
    description: string;
    model: string;
    temperature?: number;
    systemInstruction?: string;
    buildPrompt: (params: TParams) => string;
    expectedSchema?: Record<string, any>;
}

// ============================================================================
// 1. PROMPT GIẢI THÍCH & PHÂN TÍCH NHÓM SINH VIÊN (EXPLAIN GROUP AI)
// ============================================================================
// GIỮ NGUYÊN MODULE/EXPORT ĐỂ KHÔNG PHÁ CẤU TRÚC PROJECT.
// GIAI ĐOẠN HIỆN TẠI: KHÔNG DÙNG MODULE NÀY TRONG WORKFLOW GA.
// Khi kích hoạt ở giai đoạn sau, AI chỉ được giải thích kết quả GA đã tính toán.

export interface GroupAnalysisPromptParams {
    groupName: string;
    topic?: string;
    members: Array<{
        id: string;
        name: string;
        gpa: number;
        primarySkill: string;
        secondarySkill?: string;
        disc: {
            dominant: string;
            scores: Record<string, number>;
        };
        isLeaderCandidate?: boolean;
        gender?: string;
    }>;
    metrics: {
        compatibilityScore: number;
        skillBalanceScore: number;
        discDiversityScore: number;
        genderRatio?: { male: number; female: number };
        avgGpa?: number;
    };
}

/**
 * System Instruction cho chuyên gia phân tích nhóm AI.
 *
 * QUAN TRỌNG:
 * Module này không phải bộ máy phân nhóm.
 * GA mới là nguồn sự thật (source of truth) cho kết quả phân nhóm.
 */
export const EXPLAIN_GROUP_SYSTEM_INSTRUCTION = `
Bạn là NOVIARA Explanation Assistant.

Trong giai đoạn hiện tại, thuật toán di truyền (Genetic Algorithm - GA) là bộ máy
thực hiện phân nhóm sinh viên. Bạn KHÔNG được tự tạo, thay đổi, tối ưu hoặc đề xuất
một chromosome mới thay cho kết quả GA.

Nếu module này được gọi, hãy coi toàn bộ GA metrics, constraints và group assignment
được cung cấp là dữ liệu đã được hệ thống tính toán. Chỉ giải thích và diễn giải các
kết quả đó bằng ngôn ngữ tự nhiên.

Không được:
- Tự chia lại sinh viên.
- Tự thay đổi Fitness Function.
- Tự thay đổi trọng số GA.
- Tự bỏ qua hard constraint.
- Khẳng định DISC là đánh giá tuyệt đối về con người.
- Suy diễn thông tin không có trong dữ liệu đầu vào.

DISC chỉ là hồ sơ khảo sát hỗ trợ mô hình phân nhóm, không phải kết luận tâm lý học.
`.trim();

/**
 * JSON Schema đầu ra mong đợi từ Gemini LLM.
 * Giữ nguyên các field hiện có để không phá cấu trúc frontend/backend.
 */
export const EXPLAIN_GROUP_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        summary: {
            type: 'string',
            description: 'Tóm tắt ngắn gọn 2-3 câu về kết quả nhóm dựa trên dữ liệu GA đã cung cấp'
        },
        synergyHighlights: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách 2-4 điểm mạnh dựa trên metrics và dữ liệu đầu vào'
        },
        potentialRisks: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách 1-3 điểm cần lưu ý được suy ra từ dữ liệu đã cung cấp'
        },
        recommendations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Khuyến nghị mang tính hỗ trợ, không được tự thay đổi kết quả GA'
        },
        leadershipAnalysis: {
            type: 'string',
            description: 'Phân tích dựa trên isLeaderCandidate nếu dữ liệu này được cung cấp; không tự suy đoán'
        },
        discSynergy: {
            type: 'string',
            description: 'Diễn giải phân bố D/I/S/C từ dữ liệu khảo sát, không coi đây là kết luận tuyệt đối'
        },
        skillCoverageSummary: {
            type: 'string',
            description: 'Tóm tắt độ phủ kỹ năng dựa trên dữ liệu đầu vào; không giới hạn vào CNTT'
        }
    },
    required: [
        'summary',
        'synergyHighlights',
        'potentialRisks',
        'recommendations',
        'leadershipAnalysis',
        'discSynergy',
        'skillCoverageSummary'
    ]
};

/**
 * Hàm dựng prompt phân tích nhóm sinh viên.
 *
 * Module được giữ lại để tương thích kiến trúc hiện tại.
 * Không dùng module này để quyết định group assignment trong giai đoạn GA core.
 */
export function buildExplainGroupPrompt(params: GroupAnalysisPromptParams): string {
    const { groupName, topic, members, metrics } = params;

    const memberSummaryJson = JSON.stringify(
        members.map(m => ({
            mssv: m.id,
            ho_ten: m.name,
            gpa: m.gpa,
            chuyen_mon: m.primarySkill,
            ky_nang_phu: m.secondarySkill || 'Chưa khai báo',
            disc_chinh: m.disc.dominant,
            disc_diem: m.disc.scores,
            ung_vien_leader: Boolean(m.isLeaderCandidate),
            gioi_tinh: m.gender || 'Không xác định'
        })),
        null,
        2
    );

    return `
Bạn là NOVIARA Explanation Assistant.

QUY TẮC QUAN TRỌNG:
1. GA là bộ máy quyết định group assignment.
2. Bạn chỉ được giải thích dữ liệu GA đã cung cấp.
3. Không được tự chia lại nhóm hoặc thay đổi thành viên.
4. Không được tự tính lại hoặc sửa Fitness Function.
5. Không được tự thêm dữ liệu không có trong đầu vào.
6. DISC là dữ liệu khảo sát hỗ trợ phân nhóm, không phải kết luận tuyệt đối.
7. Nếu dữ liệu không đủ để kết luận, phải nói rõ "không đủ dữ liệu" thay vì suy đoán.

THÔNG TIN NHÓM:
- Tên nhóm: ${groupName}
- Đề tài dự án: ${topic || 'Chưa xác định'}
- Số lượng thành viên: ${members.length} sinh viên

DANH SÁCH THÀNH VIÊN:
${memberSummaryJson}

CHỈ SỐ ĐÃ ĐƯỢC HỆ THỐNG/GA TÍNH TOÁN:
- Điểm tương thích nhóm: ${metrics.compatibilityScore}%
- Điểm cân bằng kỹ năng: ${metrics.skillBalanceScore}/100
- Điểm đa dạng DISC: ${metrics.discDiversityScore}/100
- Điểm GPA trung bình: ${metrics.avgGpa !== undefined ? metrics.avgGpa.toFixed(2) : 'Không có dữ liệu'}
- Tỷ lệ giới tính: Nam ${metrics.genderRatio?.male ?? 'Không có dữ liệu'} / Nữ ${metrics.genderRatio?.female ?? 'Không có dữ liệu'}

YÊU CẦU ĐẦU RA:
Trả về đúng JSON Schema đã cấu hình, không thêm markdown.
`.trim();
}

// ============================================================================
// 2. PROMPT AI AGENT BÓC TÁCH & CHUẨN HÓA GIẢNG VIÊN (AI LECTURER AGENT)
// ============================================================================
// Đây là module Gemini ACTIVE trong giai đoạn hiện tại.
// Không đưa logic GA vào Agent này.

export interface LecturerAgentPromptParams {
    rawContent: string;
    fileName?: string;
    defaultDomain?: string;
}

export const DEFAULT_AI_LECTURER_AGENT_INSTRUCTION =
    'AI hãy đọc danh sách giảng viên, tự động phân tích khoa/bộ môn từ dữ liệu hoặc tên file, chuẩn hóa họ tên thành email @NOVIARA.edu.vn và sinh dữ liệu tài khoản khởi tạo hoàn chỉnh. Sau khi đăng nhập lần đầu, giảng viên phải đổi mật khẩu.';

export function buildLecturerAgentExtractionPrompt(params: LecturerAgentPromptParams): string {
    const { rawContent, fileName, defaultDomain = 'noviara.edu.vn' } = params;

    return `
Bạn là AI Agent xử lý dữ liệu nhân sự giảng viên đại học trực thuộc Hệ thống NOVIARA.

NHIỆM VỤ HIỆN TẠI:
Trích xuất và chuẩn hóa danh sách giảng viên từ văn bản hoặc tệp dữ liệu thô để hỗ trợ
backend tạo tài khoản giảng viên.

PHẠM VI:
- Chỉ xử lý việc bóc tách, chuẩn hóa và cấu trúc dữ liệu giảng viên.
- Không phân nhóm sinh viên.
- Không chạy hoặc mô phỏng Genetic Algorithm.
- Không tạo chromosome.
- Không tính Fitness.
- Không thay đổi kết quả GA.

${fileName ? `Tên tệp đính kèm: "${fileName}" (Nếu tên tệp có chứa tên Khoa/Bộ môn, hãy ưu tiên nhận diện nhưng phải đối chiếu với nội dung).` : ''}

NỘI DUNG VĂN BẢN THÔ:
"""
${rawContent}
"""

QUY TẮC CHUẨN HÓA:
1. Nhận diện chính xác Khoa / Bộ môn của giảng viên.
2. Quy định hệ thống: "Có khoa mới có giảng viên". Nếu không xác định được khoa/bộ môn,
   không tự bịa; ghi nhận để hệ thống xử lý theo chính sách lỗi.
3. Bỏ qua số điện thoại và trạng thái đổi mật khẩu nếu các trường này không cần cho bước
   bóc tách dữ liệu.
4. Email hệ thống được chuẩn hóa theo tên và domain "${defaultDomain}" khi workflow của
   backend yêu cầu. Không tự khẳng định email cá nhân nếu dữ liệu nguồn không cung cấp.
5. Mật khẩu khởi tạo mặc định của hệ thống là "Noviara@123". Đây là mật khẩu tạm thời;
   giảng viên phải đổi mật khẩu ở lần đăng nhập đầu tiên.
6. Không suy đoán học vị, chuyên môn, khoa hoặc thông tin cá nhân nếu không có căn cứ trong
   dữ liệu nguồn.
7. Nếu có bản ghi trùng, giữ thông tin đầy đủ nhất và không tự tạo thêm người.

YÊU CẦU ĐẦU RA:
Trả về duy nhất một mảng JSON các object theo định dạng sau.
KHÔNG có markdown code block và KHÔNG thêm giải thích ngoài JSON:
[
  {
    "name": "PGS. TS. Nguyễn Văn A",
    "department": "Khoa Công Nghệ Thông Tin",
    "personalEmail": "nguyenvana@gmail.com",
    "notes": "Chuyên môn Hệ thống thông tin & AI"
  }
]

Nếu một trường không có trong dữ liệu nguồn, dùng chuỗi rỗng hoặc giá trị phù hợp theo
schema của backend; tuyệt đối không bịa dữ liệu.
`.trim();
}

// ============================================================================
// 3. DANH MỤC TẬP TRUNG TẤT CẢ CÁC PROMPT TEMPLATE (PROMPT REGISTRY)
// ============================================================================

export const NOVIARA_PROMPT_REGISTRY = {
    explainGroup: {
        id: 'explain_group_ai_v2',
        name: 'Giải thích & Phân tích Nhóm Sinh viên',
        description: 'Chỉ diễn giải kết quả đã được GA tính toán; không tự phân nhóm',
        model: 'gemini-3.6-flash',
        temperature: 0.2,
        systemInstruction: EXPLAIN_GROUP_SYSTEM_INSTRUCTION,
        buildPrompt: buildExplainGroupPrompt,
        expectedSchema: EXPLAIN_GROUP_RESPONSE_SCHEMA,
    },

    lecturerAgent: {
        id: 'lecturer_agent_extractor_v2',
        name: 'Bóc tách & Chuẩn hóa Tài khoản Giảng viên',
        description: 'Trích xuất danh sách giảng viên từ file thô và hỗ trợ chuẩn hóa dữ liệu tài khoản',
        model: 'gemini-3.6-flash',
        temperature: 0.2,
        defaultInstruction: DEFAULT_AI_LECTURER_AGENT_INSTRUCTION,
        buildPrompt: buildLecturerAgentExtractionPrompt,
    },
} as const;

// ============================================================================
// 4. QUY ƯỚC TÍCH HỢP GA - KHÔNG PHẢI PROMPT
// ============================================================================
// Chỉ ghi rõ contract để frontend/Gemini không nhầm vai trò.
// GA implementation thực tế nằm trong Python/GA service riêng.

export const NOVIARA_GA_CONTRACT = {
    sourceOfTruth: 'GA_ENGINE',
    responsibilities: [
        'Khởi tạo chromosome và population hợp lệ',
        'Đánh giá Fitness',
        'Kiểm tra hard/soft constraints',
        'Selection',
        'Crossover',
        'Mutation',
        'Repair hoặc penalty khi nghiệm vi phạm quy tắc',
        'Trả về group assignment và các metrics',
        'Thực hiện evaluation với baseline như Random/Greedy khi được cấu hình'
    ],
    geminiMustNot: [
        'Tự chia nhóm sinh viên',
        'Tự sửa chromosome',
        'Tự thay đổi Fitness Function',
        'Tự thay đổi trọng số GA',
        'Tự bỏ qua hard constraint',
        'Tự khẳng định một nhóm là tối ưu nếu không có metric GA chứng minh'
    ]
} as const;