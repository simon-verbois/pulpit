import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { LoginForm, LoginPage as PfLoginPage } from "@patternfly/react-core";
import ExclamationCircleIcon from "@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon";

import { PulpApiError } from "../../api/errors/PulpApiError";
import { useCurrentUserQuery } from "../../hooks/useCurrentUserQuery";
import { useLoginMutation } from "./useLoginMutation";

function errorMessageFor(error: unknown): string {
  if (error instanceof PulpApiError && error.kind === "unauthenticated") {
    return "Invalid username or password.";
  }
  if (error instanceof PulpApiError) {
    return error.message;
  }
  return "Could not sign in.";
}

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  // Already have a session (e.g. navigated back to /login manually) -
  // don't show the form again, just continue on.
  const currentUserQuery = useCurrentUserQuery();
  if (currentUserQuery.data) {
    return <Navigate to={searchParams.get("next") ?? "/"} replace />;
  }

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!username || !password) {
      return;
    }
    loginMutation.mutate(
      { username, password },
      {
        onSuccess: () => {
          navigate(searchParams.get("next") ?? "/", { replace: true });
        },
      },
    );
  };

  return (
    // pulpit-login-page: a plain CSS radial-gradient glow, see
    // src/styles/global.css - PatternFly's bundled login background art
    // (PF-Bkg-Generic-*.svg) has an opaque rect + blurred shapes baked into
    // the SVG that don't blend cleanly at small clamped sizes (visible hard
    // edge, visible banding in the blur), so we don't use it.
    <div className="pulpit-login-page">
      <PfLoginPage
        loginTitle="Log in to PulpIT"
        loginSubtitle="Use your Pulp account credentials."
        brandImgSrc="/pulpit-mark.svg"
        brandImgAlt="PulpIT"
        brandImgProps={{ alt: "PulpIT", style: { width: 56, height: 56 } }}
      >
        <LoginForm
          showHelperText={loginMutation.isError}
          helperText={errorMessageFor(loginMutation.error)}
          helperTextIcon={<ExclamationCircleIcon />}
          usernameLabel="Username"
          usernameValue={username}
          onChangeUsername={(_event, value) => setUsername(value)}
          isValidUsername={!loginMutation.isError}
          passwordLabel="Password"
          passwordValue={password}
          onChangePassword={(_event, value) => setPassword(value)}
          isValidPassword={!loginMutation.isError}
          isLoginButtonDisabled={loginMutation.isPending}
          loginButtonLabel={loginMutation.isPending ? "Logging in..." : "Log in"}
          onLoginButtonClick={handleSubmit}
        />
      </PfLoginPage>
    </div>
  );
}
