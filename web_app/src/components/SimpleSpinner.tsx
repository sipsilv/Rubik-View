"use client";

interface SimpleSpinnerProps {
    size?: number;
    className?: string;
}

/**
 * Simple flat circle spinner - no angle, just flat rotation
 */
export function SimpleSpinner({ size = 24, className = "" }: SimpleSpinnerProps) {
    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                border: `${Math.max(2, size / 8)}px solid rgba(100, 116, 139, 0.3)`,
                borderTopColor: 'rgb(56, 189, 248)',
                borderRadius: '50%',
                animation: 'spinner-rotate 0.8s linear infinite',
            }}
        >
            <style jsx>{`
                @keyframes spinner-rotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default SimpleSpinner;
