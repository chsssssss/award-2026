import type { Metadata } from "next";
import Link from "next/link";

import { ContactLink, LegalPage, List, Section } from "../_components/LegalPage";

// 서비스의 실제 동작에 맞춘 약관(법률 전문가 검토 전).

export const metadata: Metadata = {
  title: "이용약관",
  description: "올해의 나 시상식 이용약관",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="이용약관"
      intro="올해의 나 시상식(이하 '서비스')을 쓸 때 지켜야 할 약속이에요."
    >
      <Section n={1} title="서비스 소개">
        <List
          items={[
            "친구들이 링크로 들어와 시상식 주인공에게 상을 하나 골라 주는 서비스예요.",
            "결과는 2026년 12월 31일 21시(한국 시간)에 주인공에게만 공개돼요.",
            "2026년 시즌용 서비스이고 무료예요.",
          ]}
        />
      </Section>

      <Section n={2} title="이용 조건">
        <List
          items={[
            "만 14세 미만은 이용하지 말아 주세요.",
            "회원가입 없이 쓸 수 있어요. 주인공은 시상식을 만들 때 받은 관리 링크로 결과를 봐요. 관리 링크를 잃어버리면 다시 찾을 수 없으니 잘 보관해 주세요.",
          ]}
        />
      </Section>

      <Section n={3} title="하면 안 되는 일">
        <List
          items={[
            "다른 사람을 비방하거나 괴롭히는 내용을 쓰는 일",
            "다른 사람의 연락처, 주소 같은 개인정보를 쓰는 일",
            "다른 사람인 척하는 일",
            "음란하거나 법을 어기는 내용을 쓰는 일",
            "서비스를 망가뜨리거나 자동화 도구로 요청을 한꺼번에 많이 보내는 일",
          ]}
        />
      </Section>

      <Section n={4} title="운영자의 조치">
        <List
          items={[
            "하면 안 되는 일에 해당하는 시상식이나 메시지는 미리 알리지 않고 숨길 수 있어요.",
            <>
              부적절한 내용을 보면 시상식 화면 아래 &lsquo;신고하기&rsquo;나 이메일(<ContactLink />)로 알려 주세요.
            </>,
          ]}
        />
      </Section>

      <Section n={5} title="이용자가 쓴 글">
        <List
          items={[
            "친구가 쓴 상 이름, 시상 사유, 닉네임은 시상식 주인공에게 보여 주는 데에만 써요.",
            "글에 대한 책임은 쓴 사람에게 있어요.",
          ]}
        />
      </Section>

      <Section n={6} title="서비스 기간과 정보 삭제">
        <List
          items={[
            "결과가 공개된 뒤에는 새 트로피를 받지 않아요.",
            <>
              모든 정보는 2027년 1월 31일에 한꺼번에 지워요. 자세한 내용은{" "}
              <Link href="/privacy" className="text-gold underline underline-offset-4">
                개인정보처리방침
              </Link>
              을 봐 주세요.
            </>,
          ]}
        />
      </Section>

      <Section n={7} title="책임의 한계">
        <List
          items={[
            "무료로 제공하는 서비스예요. 운영자의 고의나 중대한 과실이 없으면 서비스 중단, 정보 손실, 이용자끼리의 다툼에 대해 책임지지 않아요.",
            "천재지변이나 외부 서비스(호스팅·데이터베이스 등)의 장애로 서비스가 멈출 수 있어요.",
            "다만 법률에 따라 운영자가 책임져야 하는 경우는 예외예요.",
          ]}
        />
      </Section>

      <Section n={8} title="약관이 바뀌면">
        <p>이 약관이 바뀌면 서비스 화면에 공지해서 알려 드려요.</p>
      </Section>

      <Section n={9} title="적용 법과 분쟁 해결">
        <p>이 약관은 대한민국 법을 따르고, 분쟁이 생기면 민사소송법에 따른 관할 법원에서 해결해요.</p>
      </Section>

      <Section n={10} title="문의">
        <p>
          운영자: 차희선 · 문의: <ContactLink />
        </p>
      </Section>
    </LegalPage>
  );
}
