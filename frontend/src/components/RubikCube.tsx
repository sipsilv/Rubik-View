"use client";

import { cn } from "@/lib/utils";

interface RubikCubeProps {
    size?: number;
    className?: string;
}

/**
 * 2x2x2 Transparent Glass Rubik's Cube
 * - Simple and working
 */
export const RubikCube = ({ size = 60, className }: RubikCubeProps) => {
    const p = size / 2.4;
    const g = 2;
    const half = p / 2;
    const radius = Math.max(2, p / 7);

    // 8 pieces with unique opacities
    const pieceOpacities = [0.08, 0.14, 0.11, 0.18, 0.06, 0.16, 0.10, 0.13];

    return (
        <div
            className={cn("cube-wrap", className)}
            style={{ width: size * 1.2, height: size * 1.2, perspective: size * 5 }}
        >
            <div className="cube">
                {pieceOpacities.map((opacity, i) => {
                    const x = i % 2;
                    const y = Math.floor(i / 2) % 2;
                    const z = Math.floor(i / 4);
                    const px = (x - 0.5) * (p + g);
                    const py = (y - 0.5) * (p + g);
                    const pz = (z - 0.5) * (p + g);
                    
                    return (
                        <div
                            key={i}
                            className="piece"
                            style={{
                                transform: `translate3d(${px}px, ${py}px, ${pz}px)`,
                            }}
                        >
                            <div className="face front" style={{ background: `rgba(255, 255, 255, ${opacity})`, borderColor: `rgba(255, 255, 255, ${opacity + 0.08})` }} />
                            <div className="face back" style={{ background: `rgba(255, 255, 255, ${opacity * 0.6})`, borderColor: `rgba(255, 255, 255, ${opacity})` }} />
                            <div className="face right" style={{ background: `rgba(255, 255, 255, ${opacity * 0.85})`, borderColor: `rgba(255, 255, 255, ${opacity + 0.04})` }} />
                            <div className="face left" style={{ background: `rgba(255, 255, 255, ${opacity * 0.7})`, borderColor: `rgba(255, 255, 255, ${opacity})` }} />
                            <div className="face top" style={{ background: `rgba(255, 255, 255, ${opacity * 1.1})`, borderColor: `rgba(255, 255, 255, ${opacity + 0.06})` }} />
                            <div className="face bottom" style={{ background: `rgba(255, 255, 255, ${opacity * 0.5})`, borderColor: `rgba(255, 255, 255, ${opacity})` }} />
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .cube-wrap {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .cube {
                    position: relative;
                    width: ${size}px;
                    height: ${size}px;
                    transform-style: preserve-3d;
                    animation: spin 20s linear infinite;
                }
                .piece {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: ${p}px;
                    height: ${p}px;
                    margin-left: -${p / 2}px;
                    margin-top: -${p / 2}px;
                    transform-style: preserve-3d;
                }
                .face {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: ${radius}px;
                    border: 1px solid;
                    backface-visibility: hidden;
                }
                .face.front  { transform: translateZ(${half}px); }
                .face.back   { transform: rotateY(180deg) translateZ(${half}px); }
                .face.right  { transform: rotateY(90deg) translateZ(${half}px); }
                .face.left   { transform: rotateY(-90deg) translateZ(${half}px); }
                .face.top    { transform: rotateX(90deg) translateZ(${half}px); }
                .face.bottom { transform: rotateX(-90deg) translateZ(${half}px); }

                @keyframes spin {
                    0% {
                        transform: rotateX(-18deg) rotateY(0deg);
                    }
                    100% {
                        transform: rotateX(-18deg) rotateY(360deg);
                    }
                }
            `}</style>
        </div>
    );
};

export default RubikCube;
