import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function TriangleBackground() {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    if (!init) return null;

    return (
        <Particles
            id="tsparticles"
            className="fixed inset-0 z-0 h-full w-full"
            options={{
                fpsLimit: 60,
                particles: {
                    number: {
                        value: 80,
                        density: {
                            enable: true,
                            value_area: 800
                        }
                    },
                    color: {
                        value: "#ff0000",
                        animation: {
                            enable: true,
                            speed: 20,
                            sync: true
                        }
                    },
                    shape: {
                        type: "circle",
                        stroke: {
                            width: 0,
                            color: "#000000"
                        },
                        polygon: {
                            nb_sides: 5
                        },
                    },
                    opacity: {
                        value: 0.5,
                        random: false,
                        anim: {
                            enable: false,
                            speed: 3,
                            opacity_min: 0.1,
                            sync: false
                        }
                    },
                    size: {
                        value: 3,
                        random: true,
                        anim: {
                            enable: false,
                            speed: 20,
                            size_min: 0.1,
                            sync: false
                        }
                    },
                    links: {
                        enable: true,
                        distance: 100,
                        color: "random",
                        opacity: 0.4,
                        width: 1,
                        triangles: {
                            enable: true,
                            color: "#ffffff",
                            opacity: 0.1
                        }
                    },
                    move: {
                        enable: true,
                        speed: 6,
                        direction: "none",
                        random: false,
                        straight: false,
                        outMode: "out",
                        attract: {
                            enable: false,
                            rotateX: 600,
                            rotateY: 1200
                        }
                    }
                },
                interactivity: {
                    detectsOn: "canvas",
                    events: {
                        onHover: {
                            enable: true,
                            mode: "repulse"
                        },
                        onClick: {
                            enable: true,
                            mode: "push"
                        },
                        resize: true
                    },
                    modes: {
                        grab: {
                            distance: 400,
                            links: {
                                opacity: 1
                            }
                        },
                        bubble: {
                            distance: 400,
                            size: 40,
                            duration: 2,
                            opacity: 0.8,
                            speed: 3
                        },
                        repulse: {
                            distance: 200
                        },
                        push: {
                            quantity: 4
                        },
                        remove: {
                            quantity: 2
                        }
                    }
                },
                detectRetina: true,
                background: {
                    color: "#000000"
                }
            }}
        />
    );
}
