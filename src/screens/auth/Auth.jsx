/* INH — Authentication screens */
import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Btn } from '../../components/primitives.jsx';
import { setRemember, normalizeLogin, supabase, IS_LIVE } from '../../lib/supabase.js';

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
export function Login({ onSignIn, onForgot, onRegister, live }) {
  const [email, setEmail] = useState(live ? '' : 'boss@inh.com.my');
  const [pw, setPw] = useState(live ? '' : 'renovate2026');
  const [remember, setRememberOn] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !pw) { setErr('Enter your email or username and password'); return; }
    setErr(null);
    setBusy(true);
    try {
      setRemember(remember);
      await onSignIn(normalizeLogin(email), pw);
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
        <Field label="Email or username" icon="mail" value={email} onChange={setEmail} placeholder="you@email.com or username" />
        <Field label="Password" icon="lock" password value={pw} onChange={setPw} placeholder="Enter password"
          error={err} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 22px' }}>
        <button onClick={() => setRememberOn(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 9, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
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
        <p className="body-2" style={{ marginBottom: 8 }}>
          New to INH? <button className="inh-link" onClick={onRegister}>Create an account</button>
        </p>
      </div>
    </AuthShell>
  );
}

/* ---------- Sign up ---------- */
export function Register({ onSignUp, onBack }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(null);       // { field, msg } — field: 'email' | 'pw' | null
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);    // email-confirmation sent

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const submit = async () => {
    if (!name.trim()) { setErr({ field: null, msg: 'Enter your name' }); return; }
    if (!EMAIL_RE.test(email.trim())) { setErr({ field: 'email', msg: 'Enter a valid email, e.g. you@gmail.com' }); return; }
    if (pw.length < 8) { setErr({ field: 'pw', msg: 'Password must be at least 8 characters' }); return; }
    setErr(null); setBusy(true);
    try {
      const res = await onSignUp(email.trim(), pw, name.trim());
      // If email confirmation is on, no session is returned — show the
      // "check your inbox" state. Otherwise the app enters straight away.
      if (res?.needsConfirm) setDone(true);
    } catch (e) {
      // Route Supabase's message to the field it's about so it shows in the
      // right place (its email check says "invalid format" / "already registered").
      const msg = e?.message || 'Could not create your account';
      const field = /email/i.test(msg) ? 'email' : /password/i.test(msg) ? 'pw' : null;
      setErr({ field, msg });
    } finally {
      setBusy(false);
    }
  };

  if (done) return (
    <AuthShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--inh-lime-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Icon name="mail" size={40} color="var(--inh-charcoal)" stroke={2} />
        </div>
        <h1 className="h1" style={{ marginBottom: 8 }}>Check your email</h1>
        <p className="body-2" style={{ maxWidth: 280 }}>
          We sent a confirmation link to <b style={{ color: 'var(--fg-1)' }}>{email}</b>. Click it to activate your account, then sign in.
        </p>
      </div>
      <Btn variant="primary" onClick={onBack}>Back to sign in</Btn>
    </AuthShell>
  );

  return (
    <AuthShell>
      <button className="inh-iconbtn" onClick={onBack} style={{ marginBottom: 24 }}><Icon name="arrow-left" size={20} /></button>
      <h1 className="h1" style={{ fontSize: 26, marginBottom: 6 }}>Create your account</h1>
      <p className="body-2" style={{ marginBottom: 24 }}>Sign up with your email and a password to get started.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Full name" icon="user" value={name} onChange={setName} placeholder="Your name" autoFocus />
        <Field label="Email" icon="mail" type="email" value={email} onChange={setEmail} placeholder="you@gmail.com"
          error={err?.field === 'email' ? err.msg : null} />
        <Field label="Password" icon="lock" password value={pw} onChange={setPw} placeholder="At least 8 characters"
          error={err?.field === 'pw' ? err.msg : null} />
      </div>

      {err && !err.field && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 12 }}>{err.msg}</p>}

      <div style={{ height: 24 }} />
      <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Btn>

      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <p className="body-2">Already have an account? <button className="inh-link" onClick={onBack}>Sign in</button></p>
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const codeStr = code.join('');

  // Step 1 — email the 6-digit recovery code (Supabase OTP recovery).
  const sendCode = async () => {
    if (!EMAIL_RE.test(contact.trim())) { setErr({ msg: 'Enter the email on your account' }); return; }
    setErr(null); setBusy(true);
    try {
      if (IS_LIVE) await supabase.auth.resetPasswordForEmail(contact.trim().toLowerCase());
      setStep(2);
    } catch (e) { setErr({ msg: e?.message || 'Could not send the code' }); }
    finally { setBusy(false); }
  };

  // Step 2 — verify the code, then set the new password.
  const saveNew = async () => {
    if (!(pw.length >= 8 && pw === pw2 && codeStr.length === 6)) return;
    setErr(null); setBusy(true);
    try {
      if (IS_LIVE) {
        const { error } = await supabase.auth.verifyOtp({ email: contact.trim().toLowerCase(), token: codeStr, type: 'recovery' });
        if (error) throw error;
        const { error: e2 } = await supabase.auth.updateUser({ password: pw });
        if (e2) throw e2;
      }
      setStep(3);
    } catch (e) { setErr({ msg: e?.message || 'Invalid or expired code' }); }
    finally { setBusy(false); }
  };

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
      <p className="body-2" style={{ marginBottom: 24 }}>Enter the email on your account and we'll send a 6-digit reset code.</p>
      <Field label="Email" icon="mail" type="email" value={contact} onChange={setContact} placeholder="you@email.com" error={err?.msg} autoFocus />
      <div style={{ height: 24 }} />
      <Btn variant="primary" onClick={sendCode} disabled={busy}>{busy ? 'Sending…' : 'Send reset code'}</Btn>
      <p className="meta" style={{ textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
        If that account exists, a reset code is on its way. (Username-only accounts have no email to reset.)
      </p>
      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'center' }}><button className="inh-link" onClick={onBack}>Back to sign in</button></div>
    </AuthShell>
  );

  if (step === 2) return (
    <AuthShell>
      <button className="inh-iconbtn" onClick={() => setStep(1)} style={{ marginBottom: 24 }}><Icon name="arrow-left" size={20} /></button>
      <h1 className="h1" style={{ marginBottom: 6 }}>Enter reset code</h1>
      <p className="body-2" style={{ marginBottom: 22 }}>We sent a 6-digit code to <b style={{ color: 'var(--fg-1)' }}>{contact}</b>. Enter it below, then set a new password.</p>
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
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 12 }}>{err.msg}</p>}
      <div style={{ height: 24 }} />
      <Btn variant="primary" disabled={busy || !(pw.length >= 8 && pw === pw2 && codeStr.length === 6)} onClick={saveNew}>{busy ? 'Saving…' : 'Save new password'}</Btn>
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
