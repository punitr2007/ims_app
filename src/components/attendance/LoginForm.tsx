'use client';

import React, { useState } from 'react';
import { AttendanceResponse } from '@/lib/ims/types';
import { Lock, User, KeyRound, Loader2, AlertTriangle, RefreshCw, Sparkles, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSuccess: (data: AttendanceResponse) => void;
}

type FlowStep = 'credentials' | 'captcha' | 'loading';

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaText, setCaptchaText] = useState('');
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [step, setStep] = useState<FlowStep>('credentials');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  /**
   * Step 1: User hits "Fetch Attendance" — sends credentials.
   * API returns a CAPTCHA image to display.
   */
  const handleFetchCaptcha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim() || !password) {
      setError('Please enter your Roll Number and Password.');
      return;
    }

    setError(null);
    setStep('loading');
    setLoadingMsg('Connecting to IMS portal...');

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: rollNumber.trim().toUpperCase(),
          password,
        }),
      });

      const data: AttendanceResponse = await res.json();

      if (data.status === 'NEED_MANUAL_CAPTCHA' && data.captchaBase64) {
        setCaptchaImage(data.captchaBase64);
        setSessionToken(data.sessionToken || null);
        setCaptchaText('');
        setStep('captcha');
        setError(null);
      } else if (data.status === 'RATE_LIMITED') {
        setError(data.error || 'Too many attempts. Please wait before trying again.');
        setStep('credentials');
      } else {
        setError(data.error || 'Failed to connect to IMS portal. Please try again.');
        setStep('credentials');
      }
    } catch {
      setError('Network error. Could not connect to IMS portal.');
      setStep('credentials');
    }
  };

  /**
   * Step 2: User enters CAPTCHA and submits — authenticates and fetches attendance.
   */
  const handleVerifyAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaText.trim() || captchaText.trim().length < 3) {
      setError('Please enter the code shown in the image (at least 3 characters).');
      return;
    }
    if (!sessionToken || !captchaImage) {
      setError('Session lost. Please go back and try again.');
      setStep('credentials');
      return;
    }

    setError(null);
    setStep('loading');
    setLoadingMsg('Verifying code and fetching attendance...');

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: rollNumber.trim().toUpperCase(),
          password,
          captchaText: captchaText.trim(),
          sessionToken,
        }),
      });

      const data: AttendanceResponse = await res.json();

      if (data.success) {
        onSuccess(data);
      } else if (data.status === 'NEED_MANUAL_CAPTCHA' && data.captchaBase64) {
        // Wrong CAPTCHA or wrong credentials → show fresh CAPTCHA
        setCaptchaImage(data.captchaBase64);
        setSessionToken(data.sessionToken || null);
        setCaptchaText('');
        setStep('captcha');
        setError(data.error || 'Please try again with the new image.');
      } else if (data.status === 'INVALID_CREDENTIALS') {
        // Wrong credentials → go back to credentials form
        setStep('credentials');
        setError(data.error || 'Invalid Roll Number or Password.');
        setCaptchaImage(null);
        setSessionToken(null);
      } else {
        setError(data.error || 'Login failed. Please try again.');
        setStep('captcha');
      }
    } catch {
      setError('Network error. Could not connect to IMS portal.');
      setStep('captcha');
    }
  };

  const handleReloadCaptcha = async () => {
    setError(null);
    setLoadingMsg('Fetching new security code...');
    setStep('loading');

    try {
      const res = await fetch('/api/captcha');
      const data = await res.json();
      if (data.success) {
        setCaptchaImage(data.captchaBase64);
        setSessionToken(data.sessionToken);
        setCaptchaText('');
        setStep('captcha');
      } else {
        setError(data.error || 'Failed to fetch a new CAPTCHA image.');
        setStep('captcha');
      }
    } catch {
      setError('Network error while fetching CAPTCHA.');
      setStep('captcha');
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setCaptchaImage(null);
    setSessionToken(null);
    setCaptchaText('');
    setError(null);
  };

  const isLoading = step === 'loading';

  return (
    <div className="w-full max-w-md mx-auto px-1 sm:px-0">
      <div className="glass-panel p-5 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/25">
            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Student Portal Login</h2>
          <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto">
            Direct ephemeral connection to IMS NSUT. Your credentials are never stored.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* --- Step 1: Credentials Form --- */}
        {(step === 'credentials' || (isLoading && !captchaImage)) && (
          <form onSubmit={handleFetchCaptcha} className="space-y-4">
            {/* Roll Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-400" />
                <span>Roll Number / User ID</span>
              </label>
              <input
                id="roll-number-input"
                type="text"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 2024UCO1521"
                autoComplete="username"
                disabled={isLoading}
                className="w-full px-4 py-3 sm:py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-base sm:text-sm disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-brand-400" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="IMS Portal Password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full px-4 py-3 sm:py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-base sm:text-sm pr-11 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="fetch-attendance-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{loadingMsg || 'Connecting...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span>Fetch Attendance</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* --- Step 2: CAPTCHA Form --- */}
        {(step === 'captcha' || (isLoading && captchaImage)) && captchaImage && (
          <form onSubmit={handleVerifyAndLogin} className="space-y-4">
            {/* Back button */}
            <button
              type="button"
              onClick={handleBackToCredentials}
              disabled={isLoading}
              className="text-[11px] text-slate-500 hover:text-brand-300 transition-colors flex items-center gap-1"
            >
              ← Back to credentials
            </button>

            {/* CAPTCHA Image */}
            <div className="p-4 rounded-2xl bg-slate-900/95 border border-brand-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Security Verification Code
                </span>
                <button
                  id="reload-captcha-btn"
                  type="button"
                  onClick={handleReloadCaptcha}
                  disabled={isLoading}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors py-1 px-2 rounded-lg hover:bg-slate-800/60 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>New Image</span>
                </button>
              </div>

              {/* CAPTCHA Image display */}
              <div className="flex items-center justify-center bg-white p-3 rounded-xl border border-white/20 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={captchaImage}
                  alt="IMS Security CAPTCHA"
                  className="h-14 object-contain"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                Type the characters shown above (numbers only)
              </p>

              <input
                id="captcha-text-input"
                type="text"
                autoFocus
                required
                value={captchaText}
                onChange={(e) => setCaptchaText(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                placeholder="Enter security code"
                disabled={isLoading}
                inputMode="numeric"
                className="w-full px-4 py-3 sm:py-2.5 bg-slate-950 border border-brand-500/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-center font-mono tracking-[0.35em] text-xl sm:text-lg font-bold uppercase disabled:opacity-50"
              />
            </div>

            <button
              id="verify-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{loadingMsg || 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Verify &amp; View Attendance</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-white/5">
          <p className="text-[11px] text-slate-500">
            🔒 End-to-End TLS Encrypted • Zero Data Retention Policy
          </p>
        </div>
      </div>
    </div>
  );
}
