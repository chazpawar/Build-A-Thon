"use client";

import { Button } from "@/components/ui/button";

export default function Home() {
  const handleGoogleLogin = () => {
    // Use environment variable for API URL
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'https://lecturelite-api.vercel.app/auth';
    window.location.href = `${authUrl}/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col gap-4 items-center justify-center p-8 border rounded-lg shadow-md">
        <h1 className="text-2xl font-bold">LectureLite OAuth</h1>
        <p className="text-sm text-gray-500">Environment: {process.env.NODE_ENV}</p>
        <Button onClick={handleGoogleLogin} className="flex gap-2 items-center">
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
          </svg>
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
