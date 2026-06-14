import { notFound } from "next/navigation";
import { InsightWindow } from "../InsightWindow";
import { INSIGHTS, getInsightBySlug, type InsightSlug } from "../config";

export function generateStaticParams() {
  return INSIGHTS.map((insight) => ({ slug: insight.slug }));
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);

  if (!insight) notFound();

  return <InsightWindow slug={insight.slug as InsightSlug} mode="standalone" />;
}
