import type { ReactNode } from "react";
import { PageSection, type PageSectionProps } from "@patternfly/react-core";

import { PageHeader, type PageHeaderProps } from "./PageHeader";

interface PageLayoutProps extends Omit<PageHeaderProps, "className"> {
  children: ReactNode;
  type?: PageSectionProps["type"];
  notice?: ReactNode;
}

/** One stable title/action row and working surface for routed pages.
 * Notices stay visible without changing which element receives panel styling. */
export function PageLayout({
  title,
  description,
  actions,
  reserveActions,
  type,
  notice,
  children,
}: PageLayoutProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        reserveActions={reserveActions}
      />
      {notice}
      <PageSection hasBodyWrapper={false} type={type} className="pulpit-page-panel">
        {children}
      </PageSection>
    </>
  );
}
