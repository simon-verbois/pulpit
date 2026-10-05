import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Login,
  LoginForm,
  LoginMainBody,
  LoginMainFooter,
  LoginMainHeader,
  Title,
} from "@patternfly/react-core";

import { AppFooter } from "../../app/layout/AppFooter";
import { PulpApiError } from "../../api/errors/PulpApiError";
import { useCurrentUserQuery } from "../../hooks/useCurrentUserQuery";
import { UiIcon } from "../../components/icons/UiIcon";
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
    <Login className="pulpit-login-page">
      <LoginMainHeader>
        <div className="pulpit-brand-lockup">
          <img src="/pulpit-mark.svg" alt="" width={36} height={36} />
          <Title headingLevel="h1" size="xl" className="pulpit-brand-text">
            PulpIT
          </Title>
        </div>
      </LoginMainHeader>
      <LoginMainBody>
        <LoginForm
          showHelperText={loginMutation.isError}
          helperText={errorMessageFor(loginMutation.error)}
          helperTextIcon={<UiIcon name="warning" />}
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
      </LoginMainBody>
      <LoginMainFooter className="pulpit-login-footer">
        <AppFooter />
      </LoginMainFooter>
    </Login>
  );
}
