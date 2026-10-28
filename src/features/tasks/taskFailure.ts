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
  if (/\b(401|403)\b|permission denied|forbidden/i.test(evidence)) {
    const file = description.match(/\/([^/\s"'<>]+\.(?:src\.)?rpm)(?:[.\s,'"]|$)/)?.[1];
    if (/\.src\.rpm$/i.test(file ?? "") || /getPackageSource/i.test(evidence)) {
      return {
        title: "Source package download was refused",
        explanation:
          "The remote refused to serve a source package (.src.rpm). With Oracle ULN this usually means the subscription (CSI) is not entitled to download sources, even though the channel lists them.",
        nextStep:
          "If you do not need source packages, exclude them from the remote's content. Otherwise check that the ULN channel is attached to your CSI and that its support level includes sources, then retry.",
        file,
      };
    }
    if (/linux-update\.oracle\.com|\buln\b/i.test(evidence)) {
      return {
        title: "Oracle ULN refused access",
        explanation:
          "ULN rejected a request for a channel or package. The channel is probably not attached to the CSI used by this remote, or the subscription has expired.",
        nextStep:
          "Check in the ULN portal that this channel is linked to your CSI, then run the remote connection test and retry.",
        file,
      };
    }
    return {
      title: "Access was refused",
      explanation:
        "Pulp or the remote server refused access to a resource needed by this task.",
      nextStep:
        "Check the account's permissions, remote credentials and proxy allowlist, then retry.",
    };
  }
  if (/\b404\b|not found/i.test(evidence) && /https?:|uln:/i.test(evidence)) {
    const file = description.match(/\/([^/\s"'<>]+\.rpm)(?:[.\s,'"]|$)/)?.[1];
    return {
      title: "Remote resource not found",
      explanation:
        "The remote server answered 404: the repository metadata or a package no longer exists at that URL.",
      nextStep:
        "Check the remote URL. If the upstream repository was updated while syncing, retry; otherwise the package was removed upstream.",
      file,
    };
  }
  if (/\b50[0-4]\b|bad gateway|service unavailable|gateway time-?out/i.test(evidence)) {
    return {
      title: "Remote server error",
      explanation:
        "The upstream server or the proxy in between returned a server error (5xx). This is usually temporary.",
      nextStep: "Retry later. If it keeps happening, check the upstream service status.",
    };
  }
  if (
    /name or service not known|nodename nor servname|temporary failure in name resolution|getaddrinfo|cannot connect to host|connection refused|connection reset|network is unreachable/i.test(
      evidence,
    )
  ) {
    return {
      title: "Remote server unreachable",
      explanation:
        "Pulp could not connect to the remote server: DNS lookup failed, the connection was refused or it was reset.",
      nextStep:
        "Check the remote hostname, the network path and the proxy settings from the Pulp host, then retry.",
    };
  }
  if (/no space left on device|ENOSPC|disk quota/i.test(evidence)) {
    return {
      title: "Storage is full",
      explanation: "Pulp could not write to its storage because there is no space left.",
      nextStep: "Free up or extend the storage used by Pulp, then retry.",
    };
  }
  if (/digest|checksum|size does not match|invalidchecksum/i.test(evidence)) {
    const file = description.match(/\/([^/\s"'<>]+\.rpm)(?:[.\s,'"]|$)/)?.[1];
    return {
      title: "Downloaded file is corrupt",
      explanation:
        "A downloaded file does not match the checksum or size announced by the repository metadata.",
      nextStep:
        "Retry: this is often a mirror caught mid-update. If it persists, the upstream metadata is inconsistent.",
      file,
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
