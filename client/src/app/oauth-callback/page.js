"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const [authStatus, setAuthStatus] = useState({
    loading: true,
    success: false,
    user: null,
    error: null
  });

  useEffect(() => {
    // Get parameters from URL
    const token = searchParams.get("token");
    const userParam = searchParams.get("user");
    const error = searchParams.get("error");

    if (error) {
      setAuthStatus({
        loading: false,
        success: false,
        user: null,
        error: decodeURIComponent(error)
      });
      return;
    }

    if (token && userParam) {
      try {
        // Parse user data
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Store token in localStorage
        localStorage.setItem("authToken", token);
        
        setAuthStatus({
          loading: false,
          success: true,
          user,
          error: null
        });
      } catch (err) {
        setAuthStatus({
          loading: false,
          success: false,
          user: null,
          error: "Failed to parse authentication data"
        });
      }
    } else {
      setAuthStatus({
        loading: false,
        success: false,
        user: null,
        error: "Missing authentication data"
      });
    }
  }, [searchParams]);

  if (authStatus.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (authStatus.error) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center">
        <h2 className="text-xl font-semibold text-destructive">Authentication Failed</h2>
        <p>{authStatus.error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center">
      <h2 className="text-xl font-semibold text-green-600">Authentication Successful!</h2>
      <div className="bg-card p-4 rounded-lg shadow">
        <p>Email: {authStatus.user?.email}</p>
        <p>User ID: {authStatus.user?._id}</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading authentication...</p>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
