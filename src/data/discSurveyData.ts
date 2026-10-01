import { DiscProfile, DiscQuestion, DiscType } from '../types';

export const DISC_SURVEY_QUESTIONS: DiscQuestion[] = [
  {
    id: 1,
    title: "Khi được giao một đề tài đồ án mới, phản xạ đầu tiên của bạn là:",
    options: [
      {
        type: 'D',
        text: 'Nhanh chóng xác định mục tiêu cốt lõi và vạch ra kết quả cần đạt được.',
        description: 'Chủ động, hướng tới kết quả và mục tiêu.'
      },
      {
        type: 'I',
        text: 'Hào hứng thảo luận với mọi người để tìm ra những ý tưởng sáng tạo độc đáo.',
        description: 'Nhiệt huyết, thích chia sẻ và kết nối ý tưởng.'
      },
      {
        type: 'S',
        text: 'Lắng nghe kỹ yêu cầu của giảng viên và tìm kiếm cách phân công hợp lý để mọi người cùng thoải mái.',
        description: 'Điềm tĩnh, chú trọng sự hòa hợp và ổn định.'
      },
      {
        type: 'C',
        text: 'Nghiên cứu kỹ tài liệu, tiêu chí chấm điểm và quy chuẩn kỹ thuật trước khi làm.',
        description: 'Cẩn trọng, chu đáo và tư duy phân tích sâu.'
      }
    ]
  },
  {
    id: 2,
    title: "Trong các buổi thảo luận nhóm, vai trò quen thuộc nhất của bạn là:",
    options: [
      {
        type: 'D',
        text: 'Chủ trì cuộc họp, ra quyết định dứt khoát khi nhóm có nhiều ý kiến trái chiều.',
        description: 'Quyết đoán, thúc đẩy tiến độ.'
      },
      {
        type: 'I',
        text: 'Khuấy động không khí, tạo động lực và truyền cảm hứng làm việc cho đồng đội.',
        description: 'Gắn kết tinh thần, cởi mở giao tiếp.'
      },
      {
        type: 'S',
        text: 'Lắng nghe ý kiến của từng người, hỗ trợ giải quyết bất đồng và duy trì hòa khí.',
        description: 'Lắng nghe, kiên nhẫn và thấu hiểu.'
      },
      {
        type: 'C',
        text: 'Ghi chép chi tiết, kiểm tra tính khả thi logic và cảnh báo các rủi ro kỹ thuật.',
        description: 'Chi tiết, tuân thủ nguyên tắc và tiêu chuẩn.'
      }
    ]
  },
  {
    id: 3,
    title: "Khi nhóm gặp áp lực cận kề hạn chót (Deadline), bạn thường:",
    options: [
      {
        type: 'D',
        text: 'Thúc giục nhóm tăng tốc, tập trung giải quyết việc quan trọng nhất để kịp hạn.',
        description: 'Hành động nhanh, chấp nhận rủi ro vì mục tiêu.'
      },
      {
        type: 'I',
        text: 'Khích lệ tinh thần cả nhóm, giảm bớt căng thẳng và tìm kiếm sự trợ giúp linh hoạt.',
        description: 'Tích cực, ứng biến và động viên.'
      },
      {
        type: 'S',
        text: 'Kiên trì cày cuốc hoàn thành phần việc được giao, sẵn sàng nhận thêm việc giúp đồng đội.',
        description: 'Đáng tin cậy, tận tụy và bền bỉ.'
      },
      {
        type: 'C',
        text: 'Rà soát cẩn thận từng yêu cầu, kiểm tra bug/lỗi để đảm bảo chất lượng nộp bài tốt nhất.',
        description: 'Kỹ lưỡng, chú trọng độ chính xác cao.'
      }
    ]
  },
  {
    id: 4,
    title: "Phong cách làm việc yêu thích nhất của bạn là:",
    options: [
      {
        type: 'D',
        text: 'Được trao quyền chủ động, thử thách với các bài toán khó và đánh giá bằng kết quả cuối cùng.',
        description: 'Thích tự chủ, khám phá thử thách.'
      },
      {
        type: 'I',
        text: 'Môi trường làm việc vui vẻ, năng động, có nhiều cơ hội giao lưu và thuyết trình ý tưởng.',
        description: 'Thích tương tác, biểu đạt và sáng tạo.'
      },
      {
        type: 'S',
        text: 'Quy trình ổn định, các thành viên hỗ trợ lẫn nhau với tinh thần trách nhiệm cao.',
        description: 'Thích sự bình yên, gắn bó và tin cậy.'
      },
      {
        type: 'C',
        text: 'Có kế hoạch chi tiết, tiêu chuẩn rõ ràng và thời gian để làm mọi thứ thật chỉn chu.',
        description: 'Thích sự bài bản, logic và chất lượng.'
      }
    ]
  },
  {
    id: 5,
    title: "Khi phát sinh bất đồng quan điểm giữa các thành viên, phản ứng của bạn là:",
    options: [
      {
        type: 'D',
        text: 'Thẳng thắn tranh luận trực diện để chọn ra phương án hiệu quả nhất ngay tức thì.',
        description: 'Thẳng thắn, không ngại va chạm.'
      },
      {
        type: 'I',
        text: 'Dùng sự khéo léo và khiếu hài hước để giảm bớt không khí căng thẳng rồi thương lượng.',
        description: 'Mềm mỏng, giải tỏa cảm xúc.'
      },
      {
        type: 'S',
        text: 'Chủ động nhường nhịn hoặc tìm giải pháp trung gian để giữ gìn tình cảm bạn bè trong nhóm.',
        description: 'Đặt hòa khí và con người lên trên.'
      },
      {
        type: 'C',
        text: 'Dựa vào dữ liệu thực tế, yêu cầu đề bài và lập luận logic để chứng minh đúng/sai.',
        description: 'Dựa vào dữ liệu và nguyên tắc khách quan.'
      }
    ]
  },
  {
    id: 6,
    title: "Điểm mạnh nổi bật nhất mà bạn bè hay nhận xét về bạn là:",
    options: [
      {
        type: 'D',
        text: 'Mạnh mẽ, quyết đoán, dám nghĩ dám làm và có tố chất lãnh đạo.',
        description: 'Thống lĩnh và dẫn dắt.'
      },
      {
        type: 'I',
        text: 'Vui vẻ, hòa đồng, hoạt ngôn và có khả năng thuyết phục người khác rất tốt.',
        description: 'Ảnh hưởng và lôi cuốn.'
      },
      {
        type: 'S',
        text: 'Điềm đạm, chân thành, biết lắng nghe và luôn là chỗ dựa tin cậy cho nhóm.',
        description: 'Kiên định và đồng hành.'
      },
      {
        type: 'C',
        text: 'Cẩn thận, tỉ mỉ, có tư duy logic sắc bén và làm việc cực kỳ chuẩn xác.',
        description: 'Chuẩn mực và chất lượng.'
      }
    ]
  },
  {
    id: 7,
    title: "Khi được yêu cầu thuyết trình báo cáo đồ án trước hội đồng:",
    options: [
      {
        type: 'D',
        text: 'Tự tin trình bày ngắn gọn, đi thẳng vào các tính năng nổi bật và kết quả đạt được.',
        description: 'Súc tích, trọng tâm.'
      },
      {
        type: 'I',
        text: 'Hào hứng, diễn đạt lôi cuốn, tạo sự thu hút và tương tác sinh động với ban giám khảo.',
        description: 'Thu hút người nghe, làm chủ sân khấu.'
      },
      {
        type: 'S',
        text: 'Chuẩn bị kỹ lưỡng cùng đồng đội, phối hợp nhịp nhàng và sẵn sàng hỗ trợ bạn trả lời.',
        description: 'Tinh thần đồng đội cao.'
      },
      {
        type: 'C',
        text: 'Trình bày theo cấu trúc slide mạch lạc, trả lời các câu hỏi kỹ thuật bằng luận cứ chính xác.',
        description: 'Chặt chẽ, giàu dữ liệu chuyên sâu.'
      }
    ]
  },
  {
    id: 8,
    title: "Điều gì khiến bạn cảm thấy khó chịu nhất khi làm việc nhóm?",
    options: [
      {
        type: 'D',
        text: 'Làm việc chậm chạp, thiếu dứt khoát và hay do dự làm lỡ cơ hội.',
        description: 'Ghét sự chậm trễ và thiếu quyết đoán.'
      },
      {
        type: 'I',
        text: 'Không khí làm việc tẻ nhạt, mọi người im lặng và bác bỏ các ý tưởng mới lạ.',
        description: 'Ghét sự cứng nhắc và thiếu cởi mở.'
      },
      {
        type: 'S',
        text: 'Thành viên cá nhân ích kỷ, to tiếng cãi vã làm rạn nứt tình cảm nhóm.',
        description: 'Ghét sự xung đột và thiếu tôn trọng.'
      },
      {
        type: 'C',
        text: 'Làm việc cẩu thả, code không chuẩn, thiếu trách nhiệm với chất lượng sản phẩm.',
        description: 'Ghét sự thiếu chính xác và tùy tiện.'
      }
    ]
  },
  {
    id: 9,
    title: "Khi thực hiện phần việc cá nhân trong dự án:",
    options: [
      {
        type: 'D',
        text: 'Bạn tập trung xử lý nhanh nhất có thể để chuyển sang nhiệm vụ tiếp theo.',
        description: 'Tối ưu tốc độ và năng suất.'
      },
      {
        type: 'I',
        text: 'Bạn vừa làm vừa tìm kiếm thêm các hiệu ứng hoặc ý tưởng thú vị để làm nổi bật sản phẩm.',
        description: 'Sáng tạo và thẩm mỹ.'
      },
      {
        type: 'S',
        text: 'Bạn làm đều đặn, tuần tự từng bước và kiểm tra xem có ai cần trợ giúp không.',
        description: 'Nhất quán và chu đáo.'
      },
      {
        type: 'C',
        text: 'Bạn tự đặt ra tiêu chuẩn cao, kiểm tra từng dòng mã nguồn và tài liệu kỹ thuật thật hoàn hảo.',
        description: 'Cầu toàn và chuẩn chỉ.'
      }
    ]
  },
  {
    id: 10,
    title: "Khi nhận được phản hồi (feedback) góp ý sửa đổi từ giảng viên hướng dẫn:",
    options: [
      {
        type: 'D',
        text: 'Lập tức xác định việc cần chỉnh và yêu cầu nhóm bắt tay vào sửa ngay.',
        description: 'Hành động tức thời.'
      },
      {
        type: 'I',
        text: 'Cảm ơn giảng viên nhiệt tình, thảo luận thêm để hiểu góc nhìn mới một cách cởi mở.',
        description: 'Tích cực đón nhận và mở rộng.'
      },
      {
        type: 'S',
        text: 'Lắng nghe cẩn thận, ghi nhận và cùng cả nhóm san sẻ công việc sửa đổi.',
        description: 'Bình tĩnh và kiên trì tiếp thu.'
      },
      {
        type: 'C',
        text: 'Phân tích kỹ lưỡng nguyên nhân sai sót, tìm giải pháp tối ưu tận gốc để không lặp lại.',
        description: 'Phân tích nguyên nhân và giải pháp triệt để.'
      }
    ]
  },
  {
    id: 11,
    title: "Trong một dự án phần mềm, phân đoạn bạn cảm thấy hứng thú nhất là:",
    options: [
      {
        type: 'D',
        text: 'Giai đoạn chốt phạm vi dự án, phân bổ nguồn lực và quản lý tiến độ cán đích.',
        description: 'Quản trị dự án & Quyết định then chốt.'
      },
      {
        type: 'I',
        text: 'Giai đoạn thiết kế giao diện UI/UX, demo sản phẩm và làm việc với người dùng.',
        description: 'Giao diện, trải nghiệm & tương tác người dùng.'
      },
      {
        type: 'S',
        text: 'Giai đoạn xây dựng tính năng thực tế, hỗ trợ đồng đội fix lỗi và viết tài liệu hướng dẫn.',
        description: 'Thực thi nền tảng & Hỗ trợ kỹ thuật.'
      },
      {
        type: 'C',
        text: 'Giai đoạn thiết kế kiến trúc hệ thống, kiểm thử chất lượng (Testing) và tối ưu thuật toán.',
        description: 'Kiến trúc hệ thống, Logic & Kiểm thử.'
      }
    ]
  },
  {
    id: 12,
    title: "Nếu được tự chọn vai trò lý tưởng nhất cho mình trong nhóm đồ án, bạn sẽ chọn:",
    options: [
      {
        type: 'D',
        text: 'Project Manager / Team Leader (Định hướng chiến lược, phân công và kiểm soát tiến độ).',
        description: 'Thủ lĩnh dự án.'
      },
      {
        type: 'I',
        text: 'Product Designer & Presenter (Thiết kế sáng tạo, pitching và truyền thông sản phẩm).',
        description: 'Thiết kế & Thuyết trình.'
      },
      {
        type: 'S',
        text: 'Scrum Master & Core Developer (Điều phối nhịp nhàng, gắn kết nhóm và phát triển ổn định).',
        description: 'Điều phối & Lập trình cốt lõi.'
      },
      {
        type: 'C',
        text: 'System Architect & QA Specialist (Thiết kế chuẩn kỹ thuật, bảo mật và kiểm soát chất lượng).',
        description: 'Kiến trúc sư & Kiểm định chất lượng.'
      }
    ]
  }
];

/**
 * Tính toán điểm số DISC từ danh sách các câu trả lời
 */
export function calculateDiscProfile(answers: Record<number, DiscType>): DiscProfile {
  const counts: Record<DiscType, number> = { D: 0, I: 0, S: 0, C: 0 };
  const totalQuestions = Object.keys(answers).length || 1;

  Object.values(answers).forEach((type) => {
    if (counts[type] !== undefined) {
      counts[type]++;
    }
  });

  // Quy đổi điểm sang thang 100%
  const scores = {
    D: Math.round((counts.D / totalQuestions) * 100),
    I: Math.round((counts.I / totalQuestions) * 100),
    S: Math.round((counts.S / totalQuestions) * 100),
    C: Math.round((counts.C / totalQuestions) * 100),
  };

  // Đảm bảo tổng tròn 100
  const sum = scores.D + scores.I + scores.S + scores.C;
  if (sum !== 100 && sum > 0) {
    const diff = 100 - sum;
    // Bù vào nét tính cách cao nhất
    const maxType = (Object.keys(scores) as DiscType[]).reduce((a, b) => 
      scores[a] >= scores[b] ? a : b
    );
    scores[maxType] += diff;
  }

  // Sắp xếp tìm Dominant và Secondary
  const sorted = (Object.keys(scores) as DiscType[]).sort((a, b) => scores[b] - scores[a]);
  const dominant = sorted[0];
  const secondary = sorted[1];

  return {
    dominant,
    secondary,
    scores,
  };
}

export const DISC_ROLE_DESCRIPTIONS: Record<DiscType, {
  title: string;
  tagline: string;
  strengths: string[];
  idealRole: string;
  advice: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  D: {
    title: 'Thống Lĩnh (Dominance)',
    tagline: 'Quyết đoán, hướng kết quả, dám chấp nhận thử thách',
    strengths: [
      'Khả năng ra quyết định nhanh trong tình huống then chốt',
      'Định hướng mục tiêu rõ ràng và giữ vững tiến độ',
      'Không ngại đối mặt với các khó khăn, thách thức kỹ thuật'
    ],
    idealRole: 'Nhóm trưởng (Project Lead), Kiến trúc sư giải pháp',
    advice: 'Nên kiên nhẫn lắng nghe ý kiến đồng đội hơn để tránh tạo áp lực vô hình cho nhóm.',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  I: {
    title: 'Ảnh Hưởng (Influence)',
    tagline: 'Nhiệt huyết, sáng tạo, truyền cảm hứng và kết nối',
    strengths: [
      'Giao tiếp tự tin, thuyết trình lôi cuốn trước hội đồng',
      'Tạo bầu không khí tích cực, vui vẻ cho nhóm',
      'Nhiều ý tưởng thiết kế giao diện và trải nghiệm đột phá'
    ],
    idealRole: 'Thiết kế UI/UX, Báo cáo & Thuyết trình, Đại diện nhóm',
    advice: 'Cần chú ý theo dõi chi tiết và thời hạn cụ thể để không bị dàn trải ý tưởng.',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a'
  },
  S: {
    title: 'Kiên Định (Steadiness)',
    tagline: 'Điềm tĩnh, kiên nhẫn, đáng tin cậy và gắn kết',
    strengths: [
      'Tinh thần trách nhiệm cao, luôn hoàn thành cam kết',
      'Khéo léo dung hòa các xung đột nội bộ trong nhóm',
      'Thực thi công việc kiên trì, hỗ trợ đồng đội tận tình'
    ],
    idealRole: 'Lập trình viên cốt lõi (Core Dev), Điều phối tiến độ (Scrum Master)',
    advice: 'Hãy mạnh dạn chia sẻ các ý kiến cá nhân và không ngại thay đổi khi cần thiết.',
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0'
  },
  C: {
    title: 'Tuân Thủ (Conscientiousness)',
    tagline: 'Chính xác, tư duy logic sâu, chú trọng quy chuẩn',
    strengths: [
      'Phát hiện lỗi logic, rủi ro bảo mật và bug tiềm ẩn rất tốt',
      'Xây dựng mã nguồn sạch (Clean code) và tài liệu chuẩn mực',
      'Lập kế hoạch chi tiết, có cơ sở dữ liệu và căn cứ rõ ràng'
    ],
    idealRole: 'Kiểm thử chất lượng (QA/Tester), Kỹ sư dữ liệu, Backend Architect',
    advice: 'Tránh quá cầu toàn chi tiết nhỏ làm ảnh hưởng đến thời hạn bàn giao tổng thể.',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe'
  }
};
