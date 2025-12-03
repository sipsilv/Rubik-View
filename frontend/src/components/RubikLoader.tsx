"use client";

import { cn } from "@/lib/utils";
import SimpleSpinner from "@/components/SimpleSpinner";

type RubikLoaderProps = {
    label?: string;
    className?: string;
    size?: "sm" | "md" | "lg";
    fullPage?: boolean;
};

/**
 * Default loading indicator - simple 2D spinner
 */
export function RubikLoader({ 
    label = "Loading...", 
    className, 
    size = "md",
    fullPage = false 
}: RubikLoaderProps) {
    const sizeConfig = { sm: 16, md: 24, lg: 32 };
    const spinnerSize = sizeConfig[size];

    if (fullPage) {
        return (
            <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4">
                    <SimpleSpinner size={spinnerSize * 1.2} />
                    {label && (
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-medium">
                            {label}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col items-center justify-center gap-3 py-8", className)}>
            <SimpleSpinner size={spinnerSize} />
            {label && (
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-medium">
                    {label}
                </p>
            )}
        </div>
    );
}

export default RubikLoader;
