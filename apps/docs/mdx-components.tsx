import defaultMdxComponents from "fumadocs-ui/mdx";
import { Card, Cards } from "fumadocs-ui/components/card";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Callout } from "fumadocs-ui/components/callout";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { ComponentProps } from "react";
import type { MDXComponents } from "mdx/types";

/**
 * Fumadocs wraps tables in an overflow container that keyboard users cannot
 * scroll (axe: scrollable-region-focusable). Make the wrapper a focusable,
 * labelled region so narrow screens can scroll wide tables with the keyboard.
 */
function Table(props: ComponentProps<"table">) {
  return (
    <div
      role="region"
      aria-label="Scrollable table"
      tabIndex={0}
      className="relative overflow-auto prose-no-margin my-6 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring"
    >
      <table {...props} />
    </div>
  );
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    table: Table,
    Card,
    Cards,
    Step,
    Steps,
    Callout,
    Tab,
    Tabs,
    ...components,
  };
}
