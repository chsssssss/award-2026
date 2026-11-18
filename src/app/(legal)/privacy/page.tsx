import type { Metadata } from "next";

import { ContactLink, LegalPage, List, Section } from "../_components/LegalPage";

// 개인정보 보호법 제30조·시행령 제31조의 기재 항목을 서비스의 실제 동작에 맞춰 채운 것(법률 전문가 검토 전).

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "올해의 나 시상식 개인정보처리방침",
};

const linkClass = "text-gold underline underline-offset-4";

function Ext({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

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
        <p>회원가입이 없어서 이메일, 전화번호 같은 연락처는 모으지 않아요.</p>
      </Section>

      <Section n={3} title="모으는 목적">
        <List
          ordered
          items={["서비스 제공(시상식 만들기, 상 주고받기, 결과 공개)", "중복 제출과 악용 방지", "오류 수정과 서비스 개선"]}
        />
      </Section>

      <Section n={4} title="보관 기간과 파기">
        <List
          items={[
            "모든 정보는 2027년 1월 31일에 한꺼번에 지워요. 아래 5번의 회사들에 남은 기록도 이때까지 지워요.",
            "데이터베이스와 각 서비스의 기록을 되살릴 수 없게 삭제하는 방법으로 지워요.",
            "관련 법령에서 따로 보관하도록 정한 정보가 있으면 그 법령이 정한 기간 동안만 보관해요.",
          ]}
        />
      </Section>

      <Section n={5} title="처리 위탁과 국외 이전">
        <p>
          서비스를 운영하려고 아래 회사에 정보 처리를 맡겨요. 정보는 서비스를 쓰는 순간 인터넷(HTTPS 암호화)으로
          전송되고, 2027년 1월 31일까지 보관돼요.
        </p>
        <List
          items={[
            <>
              <b>Google</b>(Firebase Firestore): 시상식과 트로피 정보 저장(2번의 1~4). 저장 위치는 대한민국(서울)이에요.
              문의: <Ext href="https://policies.google.com/privacy">Google 개인정보처리방침</Ext>
            </>,
            <>
              <b>Vercel</b>: 웹사이트 호스팅. 서버는 대한민국(서울)에서 실행되고, 회사는 미국에 있어요. 화면을 보여 주는
              과정에서 접속 기록(IP 주소, 브라우저 정보)이 처리되며, 운영자는 이 기록을 따로 저장하지 않아요. 문의:{" "}
              <Ext href="https://vercel.com/legal/privacy-notice">Vercel 개인정보처리방침</Ext>
            </>,
            <>
              <b>PostHog</b>: 서비스 이용 기록 분석(페이지 주소, 버튼 사용, 브라우저·기기 정보, 무작위 식별자). 미국으로
              전송되고, IP 주소는 저장하지 않아요. 문의: <Ext href="https://posthog.com/privacy">PostHog 개인정보처리방침</Ext>
            </>,
            <>
              <b>Sentry</b>: 오류 기록(오류 내용, 페이지 주소, 브라우저·기기 정보). 미국으로 전송되고, IP 주소는 저장하지
              않아요. 문의: <Ext href="https://sentry.io/privacy/">Sentry 개인정보처리방침</Ext>
            </>,
          ]}
        />
        <p>
          국외 이전을 원하지 않으면 서비스를 이용하지 않으면 돼요. 서비스는 이 회사들 없이 제공할 수 없어서, 거부하면
          서비스를 쓸 수 없어요.
        </p>
      </Section>

      <Section n={6} title="다른 사람에게 주는 경우">
        <p>모은 정보를 다른 사람이나 회사에 주지 않아요. 법령에 따라 수사기관 등이 요청하는 경우만 예외예요.</p>
      </Section>

      <Section n={7} title="쿠키와 브라우저 저장소">
        <List
          items={[
            "쿠키: 같은 시상식에 상을 두 번 주지 않도록 무작위 식별자를 1년 동안 저장해요.",
            "브라우저 저장소: 분석 도구의 무작위 식별자와 '링크를 저장했어요', '이미 상을 줬어요' 같은 표시를 저장해요.",
            "브라우저 설정에서 쿠키와 사이트 데이터를 지우거나 막을 수 있어요. 막으면 상을 준 기록을 기억하지 못해요.",
          ]}
        />
      </Section>

      <Section n={8} title="정보를 지키는 방법">
        <List
          items={[
            "IP 주소는 원문 대신 되돌릴 수 없는 해시값으로만 저장해요.",
            "관리 링크의 비밀 값도 해시값으로만 저장해요.",
            "데이터베이스는 서버에서만 접근하고, 모든 통신은 HTTPS로 암호화해요.",
            "오류 기록과 이용 기록에는 이름, 메시지, 관리 링크가 들어가지 않게 걸러서 보내요.",
          ]}
        />
      </Section>

      <Section n={9} title="만 14세 미만">
        <p>만 14세 미만은 이 서비스를 이용하지 말아 주세요.</p>
      </Section>

      <Section n={10} title="이용자의 권리">
        <List
          items={[
            <>
              내 정보를 보거나, 고치거나, 지우거나, 처리를 멈춰 달라고 이메일(<ContactLink />)로 요청할 수 있어요.
            </>,
            "요청을 받은 날부터 10일 안에 처리해요.",
            "시상식 주인공은 받은 메시지를 숨길 수 있어요.",
          ]}
        />
      </Section>

      <Section n={11} title="도움을 받을 수 있는 곳">
        <p>개인정보 침해로 도움이 필요하면 아래 기관에 문의할 수 있어요.</p>
        <List
          items={[
            <>
              개인정보침해신고센터: 118, <Ext href="https://privacy.kisa.or.kr">privacy.kisa.or.kr</Ext>
            </>,
            <>
              개인정보분쟁조정위원회: 1833-6972, <Ext href="https://www.kopico.go.kr">www.kopico.go.kr</Ext>
            </>,
            <>
              대검찰청: 1301, <Ext href="https://www.spo.go.kr">www.spo.go.kr</Ext>
            </>,
            <>
              경찰청: 182, <Ext href="https://ecrm.police.go.kr">ecrm.police.go.kr</Ext>
            </>,
          ]}
        />
      </Section>

      <Section n={12} title="방침이 바뀌면">
        <p>이 방침이 바뀌면 서비스 화면에 공지해서 알려 드려요.</p>
      </Section>
    </LegalPage>
  );
}
