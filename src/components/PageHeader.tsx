import type { ReactNode } from "react";
import { Content, Flex, FlexItem, PageSection } from "@patternfly/react-core";

interface PageHeaderProps {
  title: string;
  /** Accepted for caller compatibility but intentionally not rendered: the
   * navigation and title already provide page-level context. */
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, actions, className }: PageHeaderProps) {
  const headerClassName = ["pulpit-page-header", className].filter(Boolean).join(" ");

  return (
    <PageSection hasBodyWrapper={false} className={headerClassName}>
      <Flex
        justifyContent={{ default: "justifyContentSpaceBetween" }}
        alignItems={{ default: "alignItemsFlexStart" }}
        // Keep a long title from pushing the actions below the header. The
        // title still shrinks and wraps within the remaining width.
        flexWrap={{ default: "wrap", md: "nowrap" }}
      >
        <FlexItem>
          <Content component="h1">{title}</Content>
        </FlexItem>
        {actions ? <FlexItem>{actions}</FlexItem> : null}
      </Flex>
    </PageSection>
  );
}
