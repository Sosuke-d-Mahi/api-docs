import { useEffect, useRef } from 'react';
import RaindropFX from 'raindrop-fx';

export default function RainBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let raindrop;
        try {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            raindrop = new RaindropFX({
                canvas: canvas,
                background: "/wp14910801-shanks-4k-pc-wallpapers.webp",
                blur: 10,
            });

            raindrop.start();
        } catch (e) {
            console.warn("RaindropFX failed to start (likely harmless in dev):", e);
        }

        const handleResize = () => {
            if (raindrop) {
                const { width, height } = canvas.getBoundingClientRect();
                raindrop.resize(width, height);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            if (raindrop) raindrop.stop();
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-[-1]"
            style={{ objectFit: 'cover' }}
        />
    );
}
