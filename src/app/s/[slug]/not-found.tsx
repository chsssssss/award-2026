import { Button } from "@/components/Button";
import { TrophyIcon } from "@/components/TrophyIcon";

export default function CeremonyNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center py-8 text-center">
      <TrophyIcon variant="locked" size={72} />
      <h1 className="mt-6 font-display text-2xl font-extrabold tracking-[-0.4px]">
        시상식을 찾을 수 없어요
      </h1>
      <p className="mt-2 text-sm text-muted">링크가 맞는지 한 번 더 확인해 주세요</p>
      <Button href="/?ref=notfound" className="mt-8">
        내 시상식 열기
      </Button>
    </main>
  );
}
