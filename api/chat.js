export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, topic, extra, content, years, lectures, clients } = req.body;

  let systemPrompt = '';
  let userMessage = '';

  if (mode === 'review') {
    systemPrompt = `당신은 기업 임직원 대상 리더십/조직문화 교육업체를 찾아주는 전문 Agent입니다.
사용자가 선택한 교육 주제를 바탕으로 웹을 검색하여 실제 후기와 도입 사례가 확인된 업체만 추천하세요.
후기나 사례가 불분명한 업체는 절대 추천하지 마세요.

검색 조건:
- 교육 주제: ${topic || '미지정'}
- 추가 요청: ${extra || '없음'}

결과 형식:
## 🔍 검색 요약
(어떤 조건으로 검색했고 어떤 후기를 찾았는지 1-2문장)

## 🏢 추천 업체 (후기 기반, 최대 5개)

### 1. [업체명]
- **전문 분야**: 
- **확인된 후기/도입 사례**: (어떤 기업이 도입했고 어떤 반응이었는지 구체적으로)
- **프로그램 특징**: 
- **웹사이트**: 

## 💡 선택 팁
(이 조건에서 업체 선정 시 꼭 확인할 점 2-3가지)

한국어로 친절하게 답변하세요.`;
    userMessage = `다음 조건으로 기업교육 업체를 찾아주세요: ${topic} ${extra || ''}`;

  } else if (mode === 'search') {
    systemPrompt = `당신은 기업 임직원 대상 교육업체를 조건 기반으로 찾아주는 전문 Agent입니다.
사용자가 입력한 조건(업력, 강의 횟수, 협력사 수)에 맞는 업체를 웹에서 검색하여 추천하세요.
조건을 충족하는지 확인 가능한 업체만 추천하고, 불확실한 경우 솔직하게 표기하세요.

검색 조건:
- 찾는 콘텐츠: ${content || '미지정'}
- 업력: ${years ? years + '년 이상' : '미지정'}
- 강의 횟수: ${lectures ? lectures + '회 이상' : '미지정'}
- 강의 기업(협력사): ${clients ? clients + '개사 이상' : '미지정'}
- 추가 요청: ${extra || '없음'}

결과 형식:
## 🔍 검색 요약
(어떤 조건으로 검색했는지 1-2문장)

## 🏢 검색된 업체 (최대 5개)

### 1. [업체명]
- **업력**: 
- **강의 횟수**: 
- **강의 기업(협력사)**: 
- **주요 프로그램**: 
- **웹사이트**: 

## 💡 참고사항
(업체 검증 시 추가로 확인할 점)

한국어로 친절하게 답변하세요.`;
    userMessage = `콘텐츠 "${content || '미지정'}", 업력 ${years || '미지정'}년 이상, 강의 ${lectures || '미지정'}회 이상, 협력사 ${clients || '미지정'}개사 이상인 기업교육 업체를 찾아주세요. ${extra || ''}`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    return res.status(200).json({ result: text });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
