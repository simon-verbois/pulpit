import type { ReactNode } from "react";
import { Content, Flex, FlexItem, PageSection } from "@patternfly/react-core";

interface PageHeaderProps {
  title: string;
  /** Accepted for caller compatibility but intentionally not rendered: the
   * navigation and title already provide page-level context. */
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <PageSection hasBodyWrapper={false}>
      <Flex
        justifyContent={{ default: "justifyContentSpaceBetween" }}
        alignItems={{ default: "alignItemsFlexStart" }}
        // Keep a long title from pushing the actions below the header. The
        // title still shrinks and wraps within the remaining width.
        flexWrap={{ default: "nowrap" }}
      >
        <FlexItem>
          <Content component="h1">{title}</Content>
        </FlexItem>
        {actions ? <FlexItem>{actions}</FlexItem> : null}
      </Flex>
    </PageSection>
  );
}
