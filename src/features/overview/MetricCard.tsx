import type { ReactNode } from "react";
import { Card, CardBody, Flex, FlexItem, Progress } from "@patternfly/react-core";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: ReactNode;
  indicator?: "success" | "danger" | "neutral";
  progress?: { value: number; valueText: string };
  isStorage?: boolean;
}

/** A single, responsive dashboard metric with a deliberately quiet visual weight. */
export function MetricCard({
  label,
  value,
  detail,
  icon,
  indicator,
  progress,
  isStorage,
}: MetricCardProps) {
  return (
    <Card
      isCompact
      className={`pulpit-metric-card${isStorage ? " pulpit-metric-card--storage" : ""}`}
    >
      <CardBody>
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
          flexWrap={{ default: "nowrap" }}
          className="pulpit-metric-card__header"
        >
          <FlexItem className="pulpit-metric-card__heading">
            <span className="pulpit-metric-card__icon" aria-hidden="true">
              {icon}
            </span>
            <div className="pulpit-metric-card__label">{label}</div>
          </FlexItem>
          {indicator ? (
            <FlexItem>
              <span
                className={`pulpit-metric-card__indicator pulpit-metric-card__indicator--${indicator}`}
                aria-hidden="true"
              />
            </FlexItem>
          ) : null}
        </Flex>
        <div className="pulpit-metric-card__content">
          <div className="pulpit-metric-card__value">{value}</div>
          {detail ? <div className="pulpit-metric-card__detail">{detail}</div> : null}
          {progress ? (
            <Progress
              className="pulpit-metric-card__progress"
              value={progress.value}
              valueText={progress.valueText}
              aria-label="Storage used"
              measureLocation="none"
              size="sm"
            />
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
