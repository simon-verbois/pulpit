import type { ReactNode } from "react";
import { Content, Flex, FlexItem, PageSection } from "@patternfly/react-core";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <PageSection hasBodyWrapper={false}>
      <Flex
        justifyContent={{ default: "justifyContentSpaceBetween" }}
        alignItems={{ default: "alignItemsFlexStart" }}
        // Without this, a long enough description (e.g. Administration's)
        // wraps the actions FlexItem below the title instead of keeping it
        // pinned top-right - VERIFIED live. The title/description FlexItem
        // still shrinks and wraps its own text normally within whatever
        // width remains; only the two FlexItems themselves stay side by
        // side.
        flexWrap={{ default: "nowrap" }}
      >
        <FlexItem>
          <Content component="h1">{title}</Content>
          {description ? <Content component="p">{description}</Content> : null}
        </FlexItem>
        {actions ? <FlexItem>{actions}</FlexItem> : null}
      </Flex>
    </PageSection>
  );
}
