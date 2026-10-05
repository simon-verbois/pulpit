import { Button } from "@patternfly/react-core";

import { useTheme } from "../theme/ThemeContext";
import { UiIcon } from "../../components/icons/UiIcon";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      className="pulpit-theme-toggle"
      variant="plain"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
      icon={<UiIcon name={isDark ? "sun" : "moon"} />}
    />
  );
}
