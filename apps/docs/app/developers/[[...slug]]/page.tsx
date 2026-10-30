/**
 * /developers/[[...slug]] — renders every page of the Developers docs tree. The optional
 * catch-all also covers /developers itself (index.mdx); generateStaticParams lists
 * each page so the static export can pre-render it.
 */
import { devSource } from "@/lib/source";
import type { Metadata } from "next";
import { DocumentationPage, getDocumentationMetadata } from "@/components/documentation-page";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  return <DocumentationPage source={devSource} slug={slug} />;
}

export function generateStaticParams() {
  return devSource.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  return getDocumentationMetadata(devSource, slug);
}
