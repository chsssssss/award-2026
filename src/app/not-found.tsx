import { Button } from "@/components/Button";
import { TrophyIcon } from "@/components/TrophyIcon";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
      <TrophyIcon variant="locked" size={72} />
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.4px]">
          페이지를 찾을 수 없어요
        </h1>
        <p className="mt-2 text-sm text-muted">주소를 다시 확인해 주세요</p>
      </div>
      <Button href="/" variant="outline" className="max-w-[200px]">
        처음으로
      </Button>
    </main>
  );
}
