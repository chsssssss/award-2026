// slug 형식 검사. 클라이언트와 서버가 함께 쓴다.

/** generateSlug()가 쓰는 글자: 영문 소문자+숫자 중 헷갈리는 0 o 1 l i 제외. */
export const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const SLUG_LENGTH = 8;

const NORMAL_SLUG = /^[a-z0-9]{8}$/;
// 수동으로 만드는 테스트용 시상식: test-로 시작, 전체 40자 이하.
const TEST_SLUG = /^test-[a-z0-9-]{1,35}$/;

/** 8자 영문 소문자·숫자, 또는 'test-'로 시작하는 40자 이하. 아니면 Firestore를 읽지 않고 404. */
export function isValidSlug(slug: string): boolean {
  return NORMAL_SLUG.test(slug) || TEST_SLUG.test(slug);
}
