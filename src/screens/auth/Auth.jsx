/* INH — Authentication screens */
import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Btn } from '../../components/primitives.jsx';

export function Logo({ height = 54 }) {
  return <img src="/assets/inh-logo.png" alt="INH Renovation & Design" style={{ height, width: 'auto', display: 'block' }} />;
}

export function AuthShell({ children }) {
  return (
    <div className="inh-app inh-auth" style={{ background: '#fff' }}>
      <div className="inh-scroll">
        <div className="inh-authwrap" style={{ padding: '48px 26px 30px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, icon, type = 'text', value, onChange, placeholder, error, password, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="inh-label">{label}</label>
      <div className={'inh-input' + (error ? ' error' : '')}>
        {icon && <span className="lead"><Icon name={icon} size={18} /></span>}
        <input
          type={password ? (show ? 'text' : 'password') : type}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoFocus={autoFocus}
        />
        {password && (
          <button className="trail" onClick={() => setShow(s => !s)} aria-label="Toggle password">
            <Icon name={show ? 'eye-off' : 'eye'} size={18} />
          </button>
        )}
      </div>
      {error && <div className="inh-fielderr"><Icon name="alert-triangle" size={13} /> {error}</div>}
    </div>
  );
}

/* ---------- Login ---------- */
export function Login({ onSignIn, onForgot, live }) {
  const [email, setEmail] = useState(live ? '' : 'boss@inh.com.my');
  const [pw, setPw] = useState(live ? '' : 'renovate2026');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !pw) { setErr('Enter your email and password'); return; }
    setErr(null);
    setBusy(true);
    try {
      await onSignIn(email, pw);
    } catch (e) {
      setErr(e?.message || 'Email or password is incorrect');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 34 }}><Logo height={56} /></div>
      <h1 className="h1" style={{ fontSize: 26, marginBottom: 6 }}>Welcome back</h1>
      <p className="body-2" style={{ marginBottom: 24 }}>Sign in to your INH account.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email or phone" icon="mail" value={email} onChange={setEmail} placeholder="you@email.com" />
        <Field label="Password" icon="lock" password value={pw} onChange={setPw} placeholder="Enter password"
          error={err} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 22px' }}>
        <button onClick={() => setRemember(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 9, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
          <span className={'inh-toggle' + (remember ? ' on' : '')} style={{
            width: 42, height: 25, borderRadius: 999, position: 'relative', flexShrink: 0,
            background: remember ? 'var(--inh-lime)' : 'var(--surface-2)',
            border: remember ? 'none' : '1px solid var(--border-strong)', transition: 'background .15s',
          }}>
            <span style={{
              position: 'absolute', top: 3, left: remember ? 20 : 3, width: 19, height: 19, borderRadius: '50%',
              background: remember ? 'var(--inh-charcoal)' : '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left .15s',
            }} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>Remember me</span>
        </button>
        <button className="inh-link" onClick={onForgot}>Forgot password?</button>
      </div>

      <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Btn>

      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <p className="body-2" style={{ marginBottom: 8 }}>Need access? Contact INH Design &amp; Build</p>
      </div>
    </AuthShell>
  );
}

/* ---------- Forgot password flow ---------- */
export function ForgotFlow({ onBack, onDone }) {
  const [step, setStep] = useState(1);
  const [contact, setContact] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const strength = Math.min(4, (pw.length >= 6 ? 1 : 0) + (/[A-Z]/.test(pw) ? 1 : 0) + (/[0-9]/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0));
  const strengthLabel = ['Too short', 'Weak', 'Fair', 'Good', 'Strong password'][strength];
  const strengthColor = ['var(--error)', 'var(--error)', 'var(--warning)', 'var(--success)', 'var(--success)'][strength];

  const setDigit = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code]; next[i] = v; setCode(next);
  };

  if (step === 1) return (
    <AuthShell>
      <button className="inh-iconbtn" onClick={onBack} style={{ marginBottom: 24 }}><Icon name="arrow-left" size={20} /></button>
      <h1 className="h1" style={{ marginBottom: 6 }}>Reset your password</h1>
      <p className="body-2" style={{ marginBottom: 24 }}>Enter the email or phone linked to your account and we'll send a reset code.</p>
      <Field label="Email or phone" icon="mail" value={contact} onChange={setContact} placeholder="you@email.com" autoFocus />
      <div style={{ height: 24 }} />
      <Btn variant="primary" onClick={() => setStep(2)}>Send reset code</Btn>
      <p className="meta" style={{ textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
        If that account exists, a reset code is on its way.
      </p>
      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'center' }}><button className="inh-link" onClick={onBack}>Back to sign in</button></div>
    </AuthShell>
  );

  if (step === 2) return (
    <AuthShell>
      <button className="inh-iconbtn" onClick={() => setStep(1)} style={{ marginBottom: 24 }}><Icon name="arrow-left" size={20} /></button>
      <h1 className="h1" style={{ marginBottom: 6 }}>Enter reset code</h1>
      <p className="body-2" style={{ marginBottom: 22 }}>We sent a 6-digit code to your account. Enter it below, then set a new password.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {code.map((d, i) => (
          <input key={i} value={d} onChange={e => setDigit(i, e.target.value)} maxLength={1} inputMode="numeric"
            style={{
              flex: 1, height: 52, textAlign: 'center', borderRadius: 10,
              border: '1.5px solid ' + (d ? 'var(--inh-lime)' : 'var(--border-strong)'),
              boxShadow: d ? '0 0 0 3px var(--inh-lime-tint)' : 'none',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--fg-1)', outline: 'none',
            }} />
        ))}
      </div>
      <p className="meta" style={{ marginBottom: 24 }}>Resend code in 0:42</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Field label="New password" icon="lock" password value={pw} onChange={setPw} placeholder="At least 8 characters" />
          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < strength ? strengthColor : 'var(--surface-2)' }} />
            ))}
          </div>
          {pw && <p style={{ fontSize: 11, color: strengthColor, fontWeight: 600, marginTop: 6 }}>{strengthLabel}</p>}
        </div>
        <Field label="Confirm password" icon="lock" password value={pw2} onChange={setPw2} placeholder="Re-enter password"
          error={pw2 && pw2 !== pw ? "Passwords don't match" : null} />
      </div>
      <div style={{ height: 24 }} />
      <Btn variant="primary" disabled={!(pw.length >= 8 && pw === pw2)} onClick={() => setStep(3)}>Save new password</Btn>
    </AuthShell>
  );

  return (
    <AuthShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--success-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Icon name="check-circle" size={42} color="var(--success)" stroke={2.2} />
        </div>
        <h1 className="h1" style={{ marginBottom: 8 }}>Password updated</h1>
        <p className="body-2" style={{ maxWidth: 250 }}>Your password has been changed. You can now sign in with your new password.</p>
      </div>
      <Btn variant="primary" onClick={onDone}>Back to sign in</Btn>
    </AuthShell>
  );
}
