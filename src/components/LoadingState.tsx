import { Bullseye, Skeleton, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { TableProps } from "@patternfly/react-table";

export function LoadingState({
  label = "Loading...",
  columns,
  gridBreakPoint,
}: {
  label?: string;
  columns?: readonly string[];
  gridBreakPoint?: TableProps["gridBreakPoint"];
}) {
  if (columns?.length) {
    return (
      <div>
        <span role="status" className="pf-v6-screen-reader">
          {label}
        </span>
        <Table
          aria-label={label}
          aria-busy="true"
          variant="compact"
          gridBreakPoint={gridBreakPoint}
        >
          <Thead>
            <Tr>
              {columns.map((column, index) => (
                <Th key={index}>{column}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {Array.from({ length: 5 }, (_, row) => (
              <Tr key={row} aria-hidden="true">
                {columns.map((column, index) => (
                  <Td key={index} dataLabel={column}>
                    <Skeleton width={index === 0 ? "75%" : "60%"} />
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    );
  }
  return (
    <Bullseye>
      <Spinner aria-label={label} />
    </Bullseye>
  );
}
