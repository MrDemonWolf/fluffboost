import { DocsPage, DocsBody, DocsDescription, DocsTitle } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { userSource } from "@/lib/source";
import { getDoc } from "@/lib/load-doc";
import { getMDXComponents } from "@/mdx-components";
import { DocsMain } from "@/app/(home)/_components/layout-a11y";

type DocumentationSource = typeof userSource;

function resolvePage(source: DocumentationSource, slug?: string[]) {
  const page = source.getPage(slug);
  if (!page) notFound();
  return page;
}

export function DocumentationPage({ source, slug }: {
  source: DocumentationSource;
  slug?: string[];
}) {
  const page = resolvePage(source, slug);
  const { body: MDX, toc } = getDoc(page.data);

  return (
    // DocsMain swaps the stock <article> container for a <main> landmark.
    <DocsPage toc={toc} slots={{ container: DocsMain }}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function getDocumentationMetadata(source: DocumentationSource, slug?: string[]): Metadata {
  const page = resolvePage(source, slug);
  return { title: page.data.title, description: page.data.description };
}
