"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { logout, isAuthenticated } from "@/lib/auth";

interface UseInactivityTimerOptions {
  /**
   * Total inactivity timeout in milliseconds (default: 30 minutes)
   */
  timeout?: number;
  /**
   * Show countdown when this many milliseconds remain (default: 10 minutes)
   */
  showCountdownAt?: number;
  /**
   * Maximum session duration in milliseconds (default: 8 hours)
   * If user loads page after this time, force relogin
   */
  maxSessionDuration?: number;
}

// Production values
const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const DEFAULT_SHOW_COUNTDOWN_AT = 10 * 60 * 1000; // 10 minutes
const DEFAULT_MAX_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export function useInactivityTimer(options: UseInactivityTimerOptions = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    showCountdownAt = DEFAULT_SHOW_COUNTDOWN_AT,
    maxSessionDuration = DEFAULT_MAX_SESSION_DURATION,
  } = options;

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxSessionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const loginTimestampRef = useRef<number | null>(null);

  // Check if user has been away for too long
  const checkSessionExpiry = useCallback(() => {
    if (typeof window === "undefined") return false;

    const loginTime = localStorage.getItem("loginTimestamp");
    if (!loginTime) {
      // No login timestamp, set it now
      localStorage.setItem("loginTimestamp", Date.now().toString());
      return false;
    }

    const loginTimestamp = parseInt(loginTime, 10);
    const now = Date.now();
    const timeSinceLogin = now - loginTimestamp;

    // If user has been away for more than maxSessionDuration, force relogin
    if (timeSinceLogin > maxSessionDuration) {
      logout();
      return true;
    }

    return false;
  }, [maxSessionDuration]);

  // Reset the timer on user activity
  const resetTimer = useCallback(() => {
    if (typeof window === "undefined") return;

    lastActivityRef.current = Date.now();
    setIsActive(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Check if countdown should be hidden immediately after reset
    const now = Date.now();
    let maxSessionRemaining = Infinity;
    if (loginTimestampRef.current) {
      const timeSinceLogin = now - loginTimestampRef.current;
      maxSessionRemaining = maxSessionDuration - timeSinceLogin;
    }
    
    // After reset, inactivity remaining is full timeout (30 min)
    const inactivityRemaining = timeout;
    const remaining = Math.min(inactivityRemaining, maxSessionRemaining);
    
    // Hide countdown if more than threshold remains
    if (remaining > showCountdownAt) {
      setTimeRemaining(null);
    }

    // Set new timeout for logout
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeout);

    // Start countdown interval if we're in the countdown window
    const startCountdown = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastActivityRef.current;
        const inactivityRemaining = timeout - elapsed;

        // Calculate max session remaining
        let maxSessionRemaining = Infinity;
        if (loginTimestampRef.current) {
          const timeSinceLogin = now - loginTimestampRef.current;
          maxSessionRemaining = maxSessionDuration - timeSinceLogin;
        }

        // Use whichever is closer (inactivity or max session)
        const remaining = Math.min(inactivityRemaining, maxSessionRemaining);

        if (remaining <= 0) {
          setTimeRemaining(0);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          logout();
        } else if (remaining <= showCountdownAt) {
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(null);
        }
      }, 1000); // Update every second
    };

    // Check if we should start countdown immediately
    if (timeout <= showCountdownAt) {
      startCountdown();
    } else {
      // Start countdown when we enter the countdown window
      const countdownStartDelay = timeout - showCountdownAt;
      setTimeout(startCountdown, countdownStartDelay);
    }
  }, [timeout, showCountdownAt, maxSessionDuration]);

  // Handle user activity events
  const handleActivity = useCallback(() => {
    if (!isActive) return;
    resetTimer();
  }, [isActive, resetTimer]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = useCallback((ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    // Only run timer if user is authenticated
    if (typeof window === "undefined" || !isAuthenticated()) {
      return;
    }

    // Check session expiry on mount
    if (checkSessionExpiry()) {
      return; // User will be logged out
    }

    // Set login timestamp if not set
    const loginTime = localStorage.getItem("loginTimestamp");
    if (!loginTime) {
      const now = Date.now();
      localStorage.setItem("loginTimestamp", now.toString());
      loginTimestampRef.current = now;
    } else {
      loginTimestampRef.current = parseInt(loginTime, 10);
    }

    // Initialize timer
    resetTimer();

    // Also check max session countdown periodically
    maxSessionIntervalRef.current = setInterval(() => {
      if (!loginTimestampRef.current) return;
      
      const now = Date.now();
      const timeSinceLogin = now - loginTimestampRef.current;
      const maxSessionRemaining = maxSessionDuration - timeSinceLogin;

      // If max session is about to expire (within countdown window), show it
      if (maxSessionRemaining <= showCountdownAt && maxSessionRemaining > 0) {
        // Check inactivity remaining too
        const elapsed = now - lastActivityRef.current;
        const inactivityRemaining = timeout - elapsed;
        
        // Show whichever is closer
        const remaining = Math.min(inactivityRemaining, maxSessionRemaining);
        if (remaining <= showCountdownAt) {
          setTimeRemaining(remaining);
        }
      }
    }, 1000);

    // Add event listeners for user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "keydown",
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (maxSessionIntervalRef.current) {
        clearInterval(maxSessionIntervalRef.current);
      }
    };
  }, [handleActivity, resetTimer, checkSessionExpiry]);

  return {
    timeRemaining,
    formattedTimeRemaining: timeRemaining !== null ? formatTimeRemaining(timeRemaining) : null,
    showCountdown: timeRemaining !== null && timeRemaining <= showCountdownAt,
  };
}

