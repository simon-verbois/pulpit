import unittest

from pulp_remote_check.probe import failure_detail, looks_like_repomd, probe_url


class HttpError(Exception):
    def __init__(self, status, message=""):
        super().__init__(message)
        self.status = status
        self.message = message


class ProbeTests(unittest.TestCase):
    def test_probe_url_targets_repomd(self):
        self.assertEqual(
            probe_url("https://example.com/repo/"),
            "https://example.com/repo/repodata/repomd.xml",
        )
        self.assertEqual(
            probe_url("uln://ol9_x86_64_baseos_latest"),
            "uln://ol9_x86_64_baseos_latest/repodata/repomd.xml",
        )

    def test_looks_like_repomd(self):
        self.assertTrue(looks_like_repomd(b'<?xml version="1.0"?>\n<repomd xmlns="x">'))
        self.assertFalse(looks_like_repomd(b"<html>login</html>"))

    def test_failure_detail(self):
        self.assertIn("Authentication", failure_detail(HttpError(401)))
        self.assertIn("404", failure_detail(HttpError(404)))
        self.assertEqual(failure_detail(HttpError(500, "boom")), "HTTP 500: boom")
        self.assertEqual(failure_detail(ValueError("bad")), "bad")
        self.assertEqual(failure_detail(TimeoutError()), "TimeoutError")

    def test_failure_detail_uln_login(self):
        class UlnCredentialsError(Exception):
            pass

        self.assertIn(
            "ULN login failed", failure_detail(UlnCredentialsError("ULN login failed after 4"))
        )


if __name__ == "__main__":
    unittest.main()
