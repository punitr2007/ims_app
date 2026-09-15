'use client';

import React, { useState } from 'react';
import { AttendanceResponse } from '@/lib/ims/types';
import { Lock, User, KeyRound, Loader2, AlertTriangle, RefreshCw, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

interface LoginFormProps {
  onSuccess: (data: AttendanceResponse) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFetchFreshCaptcha = async () => {
    try {
      setLoading(true);
      setLoadingStep('Fetching security code...');
      const res = await fetch('/api/captcha');
      const data = await res.json();
      if (data.success) {
        setCaptchaImage(data.captchaBase64);
        setSessionToken(data.sessionToken);
        setCaptchaText('');
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch security code.');
      }
    } catch {
      setError('Network error while connecting to server.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber || !password) {
      setError('Please enter your Roll Number and Password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (captchaImage && sessionToken) {
        // Manual CAPTCHA flow
        if (!captchaText || captchaText.length < 3) {
          setError('Please enter the 4-5 digits shown in the security image.');
          setLoading(false);
          return;
        }

        setLoadingStep('Verifying security code & fetching attendance...');
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rollNumber: rollNumber.trim(),
            password,
            captchaText: captchaText.trim(),
            sessionToken,
          }),
        });

        const data: AttendanceResponse = await res.json();
        if (data.success) {
          onSuccess(data);
        } else {
          setError(data.error || 'Login failed.');
          if (data.captchaBase64) {
            setCaptchaImage(data.captchaBase64);
            setSessionToken(data.sessionToken || null);
            setCaptchaText('');
          }
        }
      } else {
        // One-shot auto-solve flow
        setLoadingStep('Connecting to IMS portal...');
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rollNumber: rollNumber.trim(),
            password,
          }),
        });

        const data: AttendanceResponse = await res.json();
        if (data.success) {
          onSuccess(data);
        } else {
          if (data.captchaBase64) {
            setCaptchaImage(data.captchaBase64);
            setSessionToken(data.sessionToken || null);
            setCaptchaText('');
            setError(data.error || 'Please enter the code shown in the image.');
          } else {
            setError(data.error || 'Login failed.');
          }
        }
      }
    } catch {
      setError('Network error. Could not connect to IMS portal.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/25">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Student Portal Login</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Direct ephemeral connection to IMS NSIT. Your credentials are never stored.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Roll Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-400" />
              <span>Roll Number / User ID</span>
            </label>
            <input
              type="text"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 2024UCO1521"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-sm"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-brand-400" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="IMS Portal Password"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-sm"
            />
          </div>

          {/* Manual Security Code Box */}
          {captchaImage && (
            <div className="p-4 rounded-2xl bg-slate-900/95 border border-brand-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-300">Security Verification Code</span>
                <button
                  type="button"
                  onClick={handleFetchFreshCaptcha}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reload Image</span>
                </button>
              </div>

              <div className="flex items-center justify-center bg-white p-2 rounded-xl border border-white/20 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={captchaImage}
                  alt="IMS Captcha"
                  className="h-11 object-contain filter contrast-125"
                />
              </div>

              <input
                type="text"
                autoFocus
                required
                value={captchaText}
                onChange={(e) => setCaptchaText(e.target.value)}
                placeholder="Enter characters from image"
                className="w-full px-4 py-2.5 bg-slate-950 border border-brand-500/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-center font-mono tracking-widest text-base font-bold uppercase"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingStep || 'Logging in...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span>{captchaImage ? 'Verify & View Attendance' : 'Fetch Attendance'}</span>
              </>
            )}
          </button>

          {!captchaImage && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleFetchFreshCaptcha}
                className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
              >
                Enter CAPTCHA manually instead
              </button>
            </div>
          )}
        </form>

        <div className="text-center pt-2 border-t border-white/5">
          <p className="text-[11px] text-slate-500">
            🔒 End-to-End TLS Encrypted • Zero Data Retention Policy
          </p>
        </div>
      </div>
    </div>
  );
}
