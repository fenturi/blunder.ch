import { useMemo, useState } from "react";
import { apiUrl, getDeviceId } from "../lib/api.js";

const PLAN_ALLOWANCES = {
  free: 1,
  pro: 5,
};
const PREMIUM_DISABLED_FOR_BETA = true;

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function fieldStyle(extra = {}) {
  return {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    fontSize: "17px",
    fontWeight: 200,
    padding: "12px 0",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    ...extra,
  };
}

function labelStyle() {
  return {
    display: "block",
    fontSize: "12px",
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.28)",
    fontWeight: 200,
    marginBottom: "10px",
  };
}

function textButtonStyle(disabled = false) {
  return {
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.15)",
    color: disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)",
    cursor: disabled ? "default" : "pointer",
    fontSize: "15px",
    fontWeight: 200,
    fontFamily: "inherit",
    letterSpacing: ".06em",
    padding: "4px 0",
  };
}

function PlanCard({ plan, selected, onSelect, disabled = false }) {
  const isPro = plan === "pro";
  const rows = isPro
    ? [["Daily games", "5"], ["Replenish", "24:00 hours"], ["Status", "Beta waitlist"]]
    : [["Daily games", "1"], ["Replenish", "24:00 hours"], ["Price", "$0"]];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onSelect}
      className={selected ? "signup-plan-card is-selected" : "signup-plan-card"}
      style={{
        width: "100%",
        background: selected ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.025)",
        border: selected ? "1px solid rgba(255,255,255,0.58)" : "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        color: "#fff",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
        padding: "18px",
        textAlign: "left",
        fontFamily: "inherit",
        display: "grid",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "baseline" }}>
        <span style={{ fontSize: "21px", fontWeight: 250 }}>{isPro ? "Pro" : "Regular"}</span>
        {selected ? (
          <span style={{ fontSize: "11px", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,0.66)" }}>
            Selected
          </span>
        ) : null}
      </div>
      <div style={{ display: "grid", gap: "9px" }}>
        {rows.map(([name, value]) => (
          <div key={name} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "14px", fontSize: "13px" }}>
            <span style={{ color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: ".08em" }}>{name}</span>
            <span style={{ color: "rgba(255,255,255,0.62)" }}>{value}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function Summary({ state }) {
  const gamesToday = PLAN_ALLOWANCES[state.plan];

  return (
    <div
      className="signup-summary-card"
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        padding: "18px",
        display: "grid",
        gap: "10px",
        color: "rgba(255,255,255,0.62)",
        fontSize: "14px",
      }}
    >
      <strong style={{ color: "#fff", fontWeight: 250 }}>Confirm analysis</strong>
      <span>{state.provider} / {state.username}</span>
      <span>{gamesToday} game{gamesToday === 1 ? "" : "s"} today</span>
      <span>{state.plan === "pro" ? "Pro, beta waitlist" : "Regular, $0/month"}</span>
    </div>
  );
}

export default function SignupWizard({ onImported, onRegistered }) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    provider: "chess.com",
    username: "",
    plan: "free",
  });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const accountValid = isEmail(state.email)
    && state.password.length >= 8
    && state.password === state.confirmPassword;
  const platformValid = state.username.trim().length > 0;
  const cost = state.plan === "pro" ? "$4/month" : "$0/month";

  const stepTitle = useMemo(() => [
    "Account credentials",
    "Chess platform & account",
    "Choose daily allowance",
    "Payment & confirm",
  ][step - 1], [step]);

  function update(patch) {
    setState((current) => ({ ...current, ...patch }));
    setMessage("");
  }

  async function validateUsername() {
    setStatus("loading");
    setMessage("");

    try {
      const params = new URLSearchParams({
        provider: state.provider,
        username: state.username.trim(),
      });
      const response = await fetch(apiUrl(`/api/validate-username?${params.toString()}`));
      const payload = await response.json();

      if (!response.ok || !payload.valid) {
        throw new Error(payload.message || "Account not found");
      }

      setStatus("idle");
      setStep(3);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to validate username");
    }
  }

  function handleWizardSubmit(event) {
    event.preventDefault();

    if (step === 2) {
      if (platformValid && status !== "loading") validateUsername();
      return;
    }

    if (step === 4) {
      submit(event);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (state.plan === "pro" && PREMIUM_DISABLED_FOR_BETA) {
      setStatus("success");
      setMessage("premium is not available for the beta version");
      return;
    }

    setStatus("loading");
    setMessage(state.plan === "pro" ? "creating account" : "queueing import");
    const deviceId = getDeviceId();

    try {
      if (state.plan === "pro") {
        const registerResponse = await fetch(apiUrl("/api/users/register"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: state.provider,
            username: state.username.trim(),
            email: state.email.trim(),
            password: state.password,
            deviceId,
          }),
        });
        const user = await registerResponse.json();

        if (!registerResponse.ok) {
          throw new Error(user.error || "unable to create account");
        }

        onRegistered?.(user);
        setMessage("opening secure checkout");

        const checkoutResponse = await fetch(apiUrl("/api/billing/checkout-session"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: user.provider,
            username: user.username,
          }),
        });
        const checkout = await checkoutResponse.json();

        if (!checkoutResponse.ok) {
          throw new Error(checkout.error || "unable to start checkout");
        }

        if (checkout.alreadyPremium) {
          onRegistered?.(checkout.user);
          setStatus("success");
          setMessage("premium active");
          return;
        }

        if (!checkout.url) {
          throw new Error("Stripe did not return a checkout URL");
        }

        window.location.assign(checkout.url);
        return;
      }

      const response = await fetch(apiUrl("/api/imports"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: state.provider,
          username: state.username.trim(),
          email: state.email.trim(),
          password: state.password,
          deviceId,
          gameTypes: ["rapid", "blitz", "bullet", "classical", "correspondence"],
          gameCount: PLAN_ALLOWANCES[state.plan],
          dateRange: "all",
          plan: state.plan,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "unable to start import");
      }

      onImported({
        email: state.email.trim(),
        username: state.username.trim(),
        platform: state.provider,
        importRecord: payload,
      });
    } catch (error) {
      setStatus("error");
      setMessage(error.message || (state.plan === "pro" ? "unable to start checkout" : "unable to start import"));
    }
  }

  return (
    <form className="signup-wizard" onSubmit={handleWizardSubmit} style={{ maxWidth: "1040px", width: "100%" }}>
      <div className="signup-wizard-header" style={{ maxWidth: "720px", marginBottom: "34px" }}>
        <div className="signup-progress" style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
          {[1, 2, 3, 4].map((item) => (
            <span
              key={item}
              style={{
                height: "3px",
                flex: 1,
                background: item <= step ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.1)",
                transition: "background 180ms ease",
              }}
            />
          ))}
        </div>
        <p style={{ margin: 0, fontSize: "13px", letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,0.34)" }}>
          Step {step} of 4
        </p>
        <h1 style={{ margin: "10px 0 0", fontSize: "34px", fontWeight: 200, color: "#fff" }}>{stepTitle}</h1>
      </div>

      <div className="signup-wizard-body" style={{ transition: "opacity 180ms ease, transform 180ms ease", opacity: 1, transform: "translateX(0)" }}>
        {step === 1 ? (
          <div style={{ maxWidth: "460px", display: "grid", gap: "28px" }}>
            <label>
              <span style={labelStyle()}>Email</span>
              <input type="email" autoComplete="email" value={state.email} onChange={(event) => update({ email: event.target.value })} style={fieldStyle()} />
            </label>
            <label>
              <span style={labelStyle()}>Password</span>
              <span style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "end" }}>
                <input type={state.showPassword ? "text" : "password"} autoComplete="new-password" value={state.password} onChange={(event) => update({ password: event.target.value })} style={fieldStyle()} />
                <button type="button" onClick={() => update({ showPassword: !state.showPassword })} style={textButtonStyle(false)}>
                  {state.showPassword ? "hide" : "show"}
                </button>
              </span>
            </label>
            <label>
              <span style={labelStyle()}>Confirm password</span>
              <input type={state.showPassword ? "text" : "password"} autoComplete="new-password" value={state.confirmPassword} onChange={(event) => update({ confirmPassword: event.target.value })} style={fieldStyle()} />
            </label>
            <button type="button" disabled={!accountValid} onClick={() => setStep(2)} style={textButtonStyle(!accountValid)}>Next</button>
          </div>
        ) : null}

        {step === 2 ? (
          <div style={{ maxWidth: "520px", display: "grid", gap: "30px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              {["chess.com", "lichess"].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => update({ provider })}
                  className={state.provider === provider ? "signup-provider-button is-selected" : "signup-provider-button"}
                  aria-pressed={state.provider === provider}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "6px",
                    border: state.provider === provider ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.1)",
                    background: state.provider === provider ? "rgba(255,255,255,0.08)" : "transparent",
                    color: "#fff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {provider === "chess.com" ? "Chess.com" : "Lichess"}
                </button>
              ))}
            </div>
            <label>
              <span style={labelStyle()}>Chess username</span>
              <input type="text" autoComplete="username" value={state.username} onChange={(event) => update({ username: event.target.value })} style={fieldStyle()} />
            </label>
            <div style={{ display: "flex", gap: "24px", alignItems: "baseline" }}>
              <button type="button" onClick={() => setStep(1)} style={textButtonStyle(false)}>Back</button>
              <button
                type="submit"
                className="signup-next-button"
                disabled={!platformValid || status === "loading"}
                style={textButtonStyle(!platformValid || status === "loading")}
              >
                {status === "loading" ? "checking..." : "Next"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ display: "grid", gap: "24px", maxWidth: "760px" }}>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
              <PlanCard plan="free" selected={state.plan === "free"} onSelect={() => update({ plan: "free" })} />
              <PlanCard
                plan="pro"
                selected={state.plan === "pro"}
                disabled={PREMIUM_DISABLED_FOR_BETA}
                onSelect={() => update({ plan: "pro" })}
              />
            </section>
            <div style={{ color: "rgba(255,255,255,0.48)", fontSize: "15px" }}>
              {state.plan === "pro"
                ? "Premium is not available for the beta version."
                : "1 game will be analysed now. Your allowance refills to full after a 24:00 hour clock."}
            </div>
            <div style={{ color: "rgba(255,255,255,0.48)", fontSize: "15px" }}>Estimated: {cost}</div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "24px", alignItems: "baseline" }}>
              <button type="button" onClick={() => setStep(2)} style={textButtonStyle(false)}>Back</button>
              <button type="button" onClick={() => setStep(4)} style={textButtonStyle(false)}>Next</button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div style={{ maxWidth: "760px", display: "grid", gap: "24px" }}>
            {state.plan === "pro" ? (
              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "18px", display: "grid", gap: "18px" }}>
                <div style={{ color: "rgba(255,255,255,0.42)", fontSize: "13px", letterSpacing: ".12em", textTransform: "uppercase" }}>
                  Premium beta waitlist
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.55 }}>
                  Premium is not available for the beta version. Stripe checkout is paused for now.
                </div>
              </div>
            ) : null}
            <Summary state={state} />
            <div style={{ display: "flex", gap: "24px", alignItems: "baseline" }}>
              <button type="button" onClick={() => setStep(3)} style={textButtonStyle(false)}>Back</button>
              <button type="submit" disabled={status === "loading"} style={textButtonStyle(status === "loading")}>
                {state.plan === "pro" ? "Notify me" : "Start analysing"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {message ? (
        <p style={{ marginTop: "18px", color: status === "error" ? "#c8a2a2" : "rgba(255,255,255,0.42)", fontSize: "13px", letterSpacing: ".08em", textTransform: "uppercase" }}>
          {message}
        </p>
      ) : null}

    </form>
  );
}
