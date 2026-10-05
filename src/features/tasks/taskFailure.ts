export interface TaskFailure {
  title: string;
  explanation: string;
  nextStep: string;
  file?: string;
}

/** Pulp also reports worker failures with `reason`, without `description`.
 * Classification explains the reported evidence; signal 9 alone cannot prove OOM. */
export function explainTaskFailure(error: unknown): TaskFailure {
  const record = error && typeof error === "object" ? error : {};
  const text = (key: string): string => {
    const value = key in record ? Reflect.get(record, key) : undefined;
    return typeof value === "string" ? value : "";
  };
  const description = text("description");
  const reason = text("reason");
  const evidence = `${reason} ${description} ${text("error_code")}`;

  if (/worker has gone missing/i.test(evidence)) {
    return {
      title: "Pulp worker stopped responding",
      explanation:
        "Pulp lost contact with the worker running this task. The operation did not finish.",
      nextStep:
        "Check whether Pulp was restarted or the worker crashed. Once Pulp is healthy, retry the operation.",
    };
  }
  if (/out of memory|MemoryError|OOMKilled/i.test(evidence)) {
    return {
      title: "Not enough memory to finish the task",
      explanation: "Pulp reported that the task ran out of memory.",
      nextStep:
        "Ask your administrator to increase Pulp's available memory or reduce concurrent work, then retry.",
    };
  }
  if (/killed by signal 9|SIGKILL/i.test(evidence)) {
    return {
      title: "Pulp worker was forcibly stopped",
      explanation:
        "The operating system or another process terminated the worker. This can happen when memory runs out, but this task alone does not confirm the cause.",
      nextStep:
        "Ask your administrator to check Pulp and operating-system logs for memory limits or a forced stop before retrying.",
    };
  }
  if (/timed? out|timeout|PLP0005/i.test(evidence)) {
    const file = description.match(/\/([^/\s"'<>]+\.rpm)(?:[.\s]|$)/)?.[1];
    return {
      title: "Download or connection timed out",
      explanation:
        "An upstream request did not finish within the allowed time. The task stopped before completing the operation.",
      nextStep:
        "Check the remote server and proxy. For a repository sync, increase the remote's download timeout or reduce its download concurrency, then retry.",
      file,
    };
  }
  if (/UlnCredentialsError|ULN login failed/i.test(evidence)) {
    return {
      title: "ULN login failed",
      explanation:
        "Pulp could not obtain an Oracle ULN session. This can be caused by credentials or by a connection, proxy, or certificate error during login.",
      nextStep:
        "Check the ULN credentials, server URL and proxy settings. Run the remote connection test and inspect the Pulp logs if login still fails.",
    };
  }
  if (/\b407\b|proxy authentication/i.test(evidence)) {
    return {
      title: "Proxy authentication failed",
      explanation:
        "The proxy refused the connection because authentication was required or rejected.",
      nextStep: "Check the proxy username and password saved on the remote, then retry.",
    };
  }
  if (/certificate|CERTIFICATE_VERIFY_FAILED|SSLError/i.test(evidence)) {
    return {
      title: "Secure connection could not be verified",
      explanation:
        "Pulp could not establish a trusted TLS connection to the remote server or proxy.",
      nextStep:
        "Check the remote hostname, certificate chain and trusted CA configuration, including any HTTPS inspection by the proxy.",
    };
  }
  if (/\b401\b|\b403\b|permission denied|forbidden/i.test(evidence)) {
    return {
      title: "Access was refused",
      explanation:
        "Pulp or the remote server refused access to a resource needed by this task.",
      nextStep:
        "Check the account's permissions, remote credentials and proxy allowlist, then retry.",
    };
  }
  return {
    title: "Task failed",
    explanation:
      description ||
      reason ||
      "Pulp marked this task as failed without providing an error message.",
    nextStep:
      "Review the technical details below. If the cause is unclear, give your administrator the task href and correlation ID so they can locate the Pulp logs.",
  };
}
