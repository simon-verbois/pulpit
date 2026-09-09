import { Content } from "@patternfly/react-core";

interface DistributionBasePathConventionProps {
  prefix: string;
}

export function DistributionBasePathConvention({
  prefix,
}: DistributionBasePathConventionProps) {
  return (
    <Content component="p">
      Distribution paths in this area always start with the fixed <code>{prefix}/</code>{" "}
      namespace. Enter only the part after that prefix; the same rule is enforced for
      direct Pulp API requests.
    </Content>
  );
}
