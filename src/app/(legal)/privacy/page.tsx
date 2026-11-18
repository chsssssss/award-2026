import type { Metadata } from "next";

import { ContactLink, LegalPage, List, Section, Todo } from "../_components/LegalPage";

// 법률 검토 전 초안. [대괄호]는 확인이 필요한 부분.

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "올해의 나 시상식 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="개인정보처리방침"
      intro="올해의 나 시상식(이하 '서비스')이 어떤 정보를 모으고, 왜 쓰고, 언제 지우는지 알려 드려요. 서비스는 회원가입 없이 쓸 수 있어요."
    >
      <Section n={1} title="운영자와 문의처">
        <List
          items={[
            "운영자: 차희선",
            <>
              문의: <ContactLink />
            </>,
            <>
              개인정보 보호책임자: 차희선(<ContactLink />)
            </>,
          ]}
        />
      </Section>

      <Section n={2} title="모으는 정보">
        <List
          ordered
          items={[
            "시상식 주인공이 입력한 이름(닉네임)",
            "친구가 입력한 닉네임, 상 이름, 시상 사유",
            "접속 IP의 해시값(IP 원문은 저장하지 않아요)",
            "브라우저 쿠키 식별자(같은 시상식에 상을 두 번 주지 않도록 쓰는 무작위 값)",
            "서비스 이용 기록(분석 도구로 모으는 페이지 방문, 버튼 사용 기록)",
            "오류 기록",
          ]}
        />
      </Section>

      <Section n={3} title="모으는 목적">
        <List
          ordered
          items={["서비스 제공(시상식 만들기, 상 주고받기, 결과 공개)", "중복 제출과 악용 방지", "오류 수정과 서비스 개선"]}
        />
      </Section>

      <Section n={4} title="보관 기간">
        <p>모든 정보는 2027년 1월 31일에 한꺼번에 지워요.</p>
        <p>
          <Todo>[법령에 따라 따로 보관해야 하는 정보가 있는지 확인 필요]</Todo>
        </p>
      </Section>

      <Section n={5} title="처리 위탁과 국외 이전">
        <p>서비스를 운영하려고 아래 회사에 정보 처리를 맡겨요. 정보는 서비스를 쓰는 순간 인터넷(HTTPS 암호화)으로 전송돼요.</p>
        <List
          items={[
            <>
              <b>Google</b>(Firebase Firestore): 시상식과 트로피 정보 저장. 저장 위치는 대한민국(서울)이에요.
            </>,
            <>
              <b>Vercel</b>: 웹사이트 호스팅. 서버는 대한민국(서울)에서 실행되고, 회사는 미국에 있어요.{" "}
              <Todo>[호스팅 접속 기록(IP 등) 보관 여부·기간 확인 필요]</Todo>
            </>,
            <>
              <b>PostHog</b>: 서비스 이용 기록 분석(페이지 주소, 버튼 사용, 브라우저·기기 정보). 미국으로 전송되고, IP
              주소는 저장하지 않아요.
            </>,
            <>
              <b>Sentry</b>: 오류 기록(오류 내용, 페이지 주소, 브라우저·기기 정보). 미국으로 전송되고, IP 주소는 저장하지
              않아요.
            </>,
          ]}
        />
        <p>
          <Todo>[각 회사의 개인정보 문의처, 보관 기간, 국외 이전을 거부하는 방법과 그때의 불이익 확인 필요]</Todo>
        </p>
      </Section>

      <Section n={6} title="만 14세 미만">
        <p>만 14세 미만은 이 서비스를 이용하지 말아 주세요.</p>
      </Section>

      <Section n={7} title="이용자의 권리">
        <List
          items={[
            <>
              내 정보를 보거나 지워 달라고 이메일(<ContactLink />)로 요청할 수 있어요.
            </>,
            "시상식 주인공은 받은 메시지를 숨길 수 있어요.",
            "요청을 받은 날부터 10일 안에 처리해요.",
          ]}
        />
      </Section>

      <Section n={8} title="방침이 바뀌면">
        <p>
          이 방침이 바뀌면 서비스 화면에 공지해서 알려 드려요.
        </p>
      </Section>
    </LegalPage>
  );
}
