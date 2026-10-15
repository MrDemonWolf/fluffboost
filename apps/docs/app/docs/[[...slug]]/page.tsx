/**
 * /docs/[[...slug]] — renders every page of the Guide docs tree. The optional
 * catch-all also covers /docs itself (index.mdx); generateStaticParams lists
 * each page so the static export can pre-render it.
 */
import { userSource } from "@/lib/source";
import type { Metadata } from "next";
import { DocumentationPage, getDocumentationMetadata } from "@/components/documentation-page";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  return <DocumentationPage source={userSource} slug={slug} />;
}

export function generateStaticParams() {
  return userSource.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  return getDocumentationMetadata(userSource, slug);
}
