// components/shared/OtpLoginForm.tsx
'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all fields are filled
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleSubmit();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move focus to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain').slice(0, 6);
    if (/^\d+$/.test(pasteData)) {
      const pasteArray = pasteData.split('');
      const newOtp = [...otp];
      pasteArray.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      
      // Focus the last input with pasted data
      const lastPastedIndex = Math.min(5, pasteArray.length - 1);
      inputRefs.current[lastPastedIndex]?.focus();
    }
  };

  const handleSubmit = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) return;

    setError('');
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      otp: otpString,
    });

    if (result?.error) {
      setError('Invalid OTP. Please try again.');
      setIsLoading(false);
      // Clear all inputs and focus first one on error
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } else {
      window.location.href = '/dashboard';
    }
  };

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Enter Verification Code</h2>
        <p className="text-sm text-gray-500">We've sent a 6-digit code to your device</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
        <div className="flex justify-center space-x-2">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isLoading}
              className="w-12 h-14 text-2xl text-center font-medium border-gray-300 focus:border-black focus-visible:ring-0"
              autoComplete="one-time-code"
            />
          ))}
        </div>

        {error && <p className="text-sm font-medium text-red-500 text-center">{error}</p>}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || otp.some(digit => digit === '')}
        >
          {isLoading ? 'Verifying...' : 'Continue'}
        </Button>
      </form>

      <div className="text-center text-sm text-gray-500">
        Didn't receive a code?{' '}
        <button 
          type="button" 
          className="font-medium text-black hover:underline"
          onClick={() => {
            setOtp(Array(6).fill(''));
            inputRefs.current[0]?.focus();
          }}
        >
          Resend
        </button>
      </div>
    </div>
  );
}