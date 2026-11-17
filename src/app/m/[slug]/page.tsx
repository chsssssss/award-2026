import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { isValidSlug } from "@/lib/slug";

import { OwnerClient } from "./_components/OwnerClient";

export const metadata: Metadata = {
  title: "내 시상식",
  robots: { index: false, follow: false },
};

export default function OwnerPage({ params }: PageProps<"/m/[slug]">) {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <OwnerSlug params={params} />
    </Suspense>
  );
}

async function OwnerSlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // 형식이 틀린 slug는 API를 부르지 않고 404
  if (!isValidSlug(slug)) notFound();
  return <OwnerClient slug={slug} />;
}
