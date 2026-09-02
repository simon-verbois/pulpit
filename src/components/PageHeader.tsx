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
