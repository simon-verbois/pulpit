import { Content } from "@patternfly/react-core";

interface DistributionBasePathConventionProps {
  prefix: string;
}

export function DistributionBasePathConvention({
  prefix,
}: DistributionBasePathConventionProps) {
  return (
    <Content component="p">
      Download paths start with <code>{prefix}/</code>.
    </Content>
  );
}
