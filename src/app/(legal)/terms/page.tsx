import type { Metadata } from "next";
import Link from "next/link";

import { ContactLink, LegalPage, List, Section, Todo } from "../_components/LegalPage";

// 법률 검토 전 초안. [대괄호]는 확인이 필요한 부분.

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
            "다른 사람을 비방하거나 괴롭히는 내용을 쓰면 안 돼요.",
            <>
              <Todo>[그 밖의 금지 행위 확인 필요]</Todo>
            </>,
          ]}
        />
      </Section>

      <Section n={4} title="운영자의 조치">
        <List
          items={[
            "운영자는 부적절한 시상식이나 메시지를 숨길 수 있어요.",
            <>
              부적절한 내용을 보면 시상식 화면 아래 &lsquo;신고하기&rsquo;나 이메일(<ContactLink />)로 알려 주세요.
            </>,
          ]}
        />
      </Section>

      <Section n={5} title="서비스 기간과 정보 삭제">
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

      <Section n={6} title="책임의 한계">
        <p>
          <Todo>[서비스 중단·데이터 손실 등에 대한 책임 범위 확인 필요]</Todo>
        </p>
      </Section>

      <Section n={7} title="약관이 바뀌면">
        <p>
          이 약관이 바뀌면 서비스 화면에 공지해서 알려 드려요.
        </p>
      </Section>

      <Section n={8} title="문의">
        <p>
          운영자: 차희선 · 문의: <ContactLink />
        </p>
      </Section>
    </LegalPage>
  );
}
