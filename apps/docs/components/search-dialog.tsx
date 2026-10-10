"use client";

import { lazy, useRef, useState } from "react";
import type { SharedProps } from "fumadocs-ui/components/dialog/search";
import { withBasePath } from "@/lib/site";

// Static export can't use a live /api/search handler, so we query the
// pre-built Orama index emitted by app/api/search/route.ts.
const INDEX_URL = withBasePath("/api/search");

// The dialog UI (Radix, markdown result renderer) and search client load only
// when search is first opened; app/layout.tsx disables Fumadocs' preload so
// nothing here runs during page hydration.
const StaticSearchDialog = lazy(async () => {
  const [{ useDocsSearch }, ui] = await Promise.all([
    import("fumadocs-core/search/client"),
    import("fumadocs-ui/components/dialog/search"),
  ]);

  function Dialog(props: SharedProps) {
    // Fumadocs caches the index fetch per URL, including a failed one, so each
    // retry asks for a distinct URL. Static hosts ignore the query string.
    const [attempt, setAttempt] = useState(0);
    const { search, setSearch, query } = useDocsSearch({
      type: "static",
      from: attempt === 0 ? INDEX_URL : `${INDEX_URL}?attempt=${attempt}`,
    });
    // Fumadocs opens the dialog from context rather than a Radix trigger, so
    // Radix has nothing to return focus to on close; remember the opener.
    const opener = useRef<HTMLElement | null>(null);
    const failed = query.error !== undefined && !query.isLoading;

    return (
      <ui.SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
        <ui.SearchDialogOverlay />
        <ui.SearchDialogContent
          onOpenAutoFocus={() => {
            opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            // After choosing a result the page navigates and the opener may be gone.
            if (opener.current?.isConnected) opener.current.focus();
            opener.current = null;
          }}
        >
          <ui.SearchDialogHeader>
            <ui.SearchDialogIcon />
            <ui.SearchDialogInput />
            <ui.SearchDialogClose />
          </ui.SearchDialogHeader>
          <ui.SearchDialogList items={!failed && query.data !== "empty" ? query.data : null} />
          {failed && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 text-sm">
              {/* role="alert" so the message is announced when it is inserted. */}
              <p role="alert" className="text-fd-muted-foreground">Search is unavailable right now.</p>
              <button
                type="button"
                className="font-semibold text-fd-foreground underline underline-offset-4"
                onClick={() => setAttempt((n) => n + 1)}
              >
                Try again
              </button>
            </div>
          )}
        </ui.SearchDialogContent>
      </ui.SearchDialog>
    );
  }

  return { default: Dialog };
});

export default StaticSearchDialog;
