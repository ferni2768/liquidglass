'use client';

import { useEffect, useState } from 'react';

export default function FloatingShapes() {
    const [shapes, setShapes] = useState([]);
    const [lastAspectRatio, setLastAspectRatio] = useState(null);

    let _uidCounter = 1;
    const uid = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return `lg-${Date.now()}-${Math.random().toString(36).slice(2)}-${_uidCounter++}`;
    };

    useEffect(() => {
        // Pre-populate screen with shapes to avoid empty start
        const prePopulateShapes = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const vmax = Math.max(screenWidth, screenHeight);
            const initialShapes = [];

            const numInitialShapes = Math.max(200, Math.floor((screenWidth * screenHeight) / (vmax * 4)));

            for (let i = 0; i < numInitialShapes; i++) {
                const shapeSize = (Math.random() * 12 + 5) * (vmax / 100); // 5-17vmax converted to pixels
                const shapeTypes = ['square', 'circle', 'triangle'];
                const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];

                const initialShape = {
                    id: uid(),
                    type: shapeType,
                    x: Math.random() * screenWidth, // Allow shapes to spawn across full width, even if partially off-screen
                    y: Math.random() * (screenHeight + 6 * vmax) - 3 * vmax,
                    size: shapeSize,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 1,
                    baseSpeedFactor: Math.max(0.3, 2.3 - (shapeSize / (screenHeight * 0.12))), // Store base speed factor using dvh for real-time calculation
                };

                initialShapes.push(initialShape);
            }

            setShapes(initialShapes);
        };

        // Pre-populate on mount
        prePopulateShapes();
        const initialAspectRatio = window.innerWidth / window.innerHeight;
        setLastAspectRatio(initialAspectRatio);

        // Re-populate only when aspect ratio changes significantly
        const handleResize = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const currentAspectRatio = screenWidth / screenHeight;

            // Only trigger repopulation if aspect ratio changed by more than 5%
            if (Math.abs(currentAspectRatio - lastAspectRatio) > lastAspectRatio * 0.05) {
                setLastAspectRatio(currentAspectRatio);

                const vmax = Math.max(screenWidth, screenHeight);
                const targetShapeCount = Math.max(200, Math.floor((screenWidth * screenHeight) / (vmax * 4))); // High initial density 

                setShapes(prev => {
                    // Filter out shapes that are now outside the new screen bounds and update speeds
                    let adjustedShapes = prev
                        .map(shape => ({
                            ...shape,
                            // Adjust X position if shape is now outside screen width (but allow some overhang)
                            x: shape.x > screenWidth + shape.size ? Math.random() * screenWidth : shape.x,
                            // Update base speed factor based on new dvh (for consistent relative speed)
                            baseSpeedFactor: Math.max(0.3, 2.3 - (shape.size / (screenHeight * 0.12)))
                        }))
                        .filter(shape => shape.x > -shape.size && shape.x < screenWidth + shape.size); // Allow shapes to be partially off-screen

                    // Add more shapes if we need them, distributed across entire visible area
                    while (adjustedShapes.length < targetShapeCount) {
                        const shapeSize = (Math.random() * 12 + 5) * (vmax / 100);
                        const shapeTypes = ['square', 'circle', 'triangle'];
                        const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];

                        const newShape = {
                            id: uid(),
                            type: shapeType,
                            x: Math.random() * screenWidth, // Allow shapes to spawn across full width
                            y: Math.random() * (screenHeight + 6 * vmax) - 3 * vmax,
                            size: shapeSize,
                            rotation: Math.random() * 360,
                            rotationSpeed: (Math.random() - 0.5) * 1,
                            baseSpeedFactor: Math.max(0.3, 2.3 - (shapeSize / (screenHeight * 0.12))), // Store base speed factor using dvh for real-time calculation
                        };

                        adjustedShapes.push(newShape);
                    }

                    // Remove excess shapes if we have too many (remove from the top of screen first)
                    if (adjustedShapes.length > targetShapeCount) {
                        adjustedShapes.sort((a, b) => a.y - b.y); // Sort by Y position
                        adjustedShapes = adjustedShapes.slice(0, targetShapeCount);
                    }

                    return adjustedShapes;
                });
            }
        };

        window.addEventListener('resize', handleResize);

        const generateShape = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const vmax = Math.max(screenWidth, screenHeight);
            const shapeSize = (Math.random() * 12 + 5) * (vmax / 100); // 5-17vmax converted to pixels

            // Randomly choose shape type
            const shapeTypes = ['square', 'circle', 'triangle'];
            const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];

            // Simple random positioning across full width
            const xPosition = Math.random() * screenWidth;

            const newShape = {
                id: uid(),
                type: shapeType,
                x: xPosition,
                y: screenHeight + shapeSize, // Start below screen
                size: shapeSize,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 1,
                baseSpeedFactor: Math.max(0.3, 2.3 - (shapeSize / (screenHeight * 0.12))), // Store base speed factor using dvh for real-time calculation
            };

            setShapes(prev => [...prev, newShape]);
        };

        let lastFrameTime = performance.now();

        const animateShapes = (currentTime) => {
            const deltaTime = currentTime - lastFrameTime;
            lastFrameTime = currentTime;

            // Convert deltaTime to seconds for consistent speed calculation
            const deltaSeconds = deltaTime / 1000;

            const currentDvh = window.innerHeight; // Dynamic viewport height
            const currentDvw = window.innerWidth; // Dynamic viewport width
            const maxAllowedSizeH = currentDvh * 0.5; // 50dvh
            const maxAllowedSizeW = currentDvw * 0.5; // 50dvw
            const minAllowedSize = currentDvh * 0.01; // 1dvh
            const maxShapeCount = 200; // Maximum number of shapes allowed

            setShapes(prev => {
                let updatedShapes = prev
                    .map(shape => {
                        // Recalculate base speed factor in real-time based on current dvh
                        const realTimeSpeedFactor = Math.max(0.3, 2.3 - (shape.size / (currentDvh * 0.12)));
                        const pixelsPerSecond = realTimeSpeedFactor * (currentDvh / 500) * 60; // Convert to pixels per second (assuming 60fps base)
                        const currentSpeed = pixelsPerSecond * deltaSeconds;

                        // Check if shape size is outside allowed bounds (either dimension)
                        const shouldFadeOut = shape.size > maxAllowedSizeH || shape.size > maxAllowedSizeW || shape.size < minAllowedSize;

                        return {
                            ...shape,
                            y: shape.y - currentSpeed,
                            rotation: shape.rotation + (shape.rotationSpeed * deltaSeconds * 60), // Convert rotation to time-based
                            fadeOut: shouldFadeOut, // Mark for fade out
                        };
                    })
                    .filter(shape => {
                        // Remove shapes that have completely exited the top of the screen
                        // OR shapes that are marked for fade out (size violations)
                        return shape.y + shape.size > 0 && !shape.fadeOut;
                    });

                // If we have too many shapes, mark the oldest ones for fade out
                if (updatedShapes.length > maxShapeCount) {
                    // Sort by creation time (oldest first) - using id as proxy since it contains timestamp
                    const sortedShapes = [...updatedShapes].sort((a, b) => a.id - b.id);
                    const excessCount = updatedShapes.length - maxShapeCount;

                    // Mark excess shapes for fade out
                    for (let i = 0; i < excessCount; i++) {
                        const oldestShape = sortedShapes[i];
                        const shapeIndex = updatedShapes.findIndex(s => s.id === oldestShape.id);
                        if (shapeIndex !== -1) {
                            updatedShapes[shapeIndex] = { ...updatedShapes[shapeIndex], fadeOut: true };
                        }
                    }

                    // Filter out the faded shapes
                    updatedShapes = updatedShapes.filter(shape => !shape.fadeOut);
                }

                return updatedShapes;
            });
        };

        // Dynamic shape generation based on dvw (dynamic viewport width)
        let generateInterval;

        const updateGenerationRate = () => {
            if (generateInterval) {
                clearInterval(generateInterval);
            }

            const currentDvw = window.innerWidth;
            const spawnRate = Math.max(200, 800 - (currentDvw / 3)); // 200ms to 800ms based on width

            generateInterval = setInterval(() => {
                generateShape();
            }, spawnRate);
        };

        // Initial generation rate setup
        updateGenerationRate();

        // Update generation rate on resize
        const handleGenerationRateResize = () => {
            updateGenerationRate();
        };

        window.addEventListener('resize', handleGenerationRateResize);

        // Animation loop using requestAnimationFrame for smooth
        let animationFrameId;

        const animate = (currentTime) => {
            animateShapes(currentTime);
            animationFrameId = requestAnimationFrame(animate);
        };

        // Start the animation loop
        animationFrameId = requestAnimationFrame(animate);

        return () => {
            if (generateInterval) {
                clearInterval(generateInterval);
            }
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('resize', handleGenerationRateResize);
        };
    }, []); // Empty dependency array to prevent recreation

    const getShapeStyle = (shape) => {
        const vmax = Math.max(window.innerWidth, window.innerHeight);
        const currentDvh = window.innerHeight; // Dynamic viewport height for real-time size checking
        const currentDvw = window.innerWidth; // Dynamic viewport width for real-time size checking
        const maxAllowedSizeH = currentDvh * 0.5; // 50dvh
        const maxAllowedSizeW = currentDvw * 0.5; // 50dvw
        const minAllowedSize = currentDvh * 0.01; // 1dvh

        // Calculate opacity based on shape size (larger shapes = more opacity)
        let sizeOpacity = Math.max(0.1, Math.min(0.5, (shape.size - 5 * vmax / 100) / (12 * vmax / 100) * 0.4 + 0.1));

        // Apply fade out effect if shape exceeds size limits (either dimension) OR is marked for fade out
        if (shape.size > maxAllowedSizeH || shape.size > maxAllowedSizeW || shape.size < minAllowedSize || shape.fadeOut) {
            sizeOpacity *= 0.1; // Fade to 10% opacity when marked for removal
        }

        // Calculate blur based on shape size (smaller shapes = more blur, big shapes get very little blur)
        const blurAmount = Math.max(0, (vmax * 0.01) - Math.pow((shape.size - 5 * vmax / 100) / (12 * vmax / 100), 0.7) * (vmax * 0.01)); // Blur based on vmax

        const baseStyle = {
            left: `${shape.x}px`,
            top: `${shape.y}px`,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            transform: `rotate(${shape.rotation}deg)`,
            transition: 'none',
            opacity: sizeOpacity,
            filter: `blur(${blurAmount}px)`,
        };

        switch (shape.type) {
            case 'circle':
                return {
                    ...baseStyle,
                    borderRadius: '50%',
                    backgroundColor: 'black',
                };
            case 'triangle':
                return {
                    ...baseStyle,
                    width: '0',
                    height: '0',
                    backgroundColor: 'transparent',
                    borderLeft: `${shape.size / 2}px solid transparent`,
                    borderRight: `${shape.size / 2}px solid transparent`,
                    borderBottom: `${shape.size}px solid rgba(0, 0, 0, ${sizeOpacity})`,
                    opacity: 1, // Triangle opacity is handled by border color
                };
            default: // square
                return {
                    ...baseStyle,
                    backgroundColor: 'black',
                };
        }
    };

    const getShapeClasses = (shape) => {
        const baseClasses = 'absolute floating-square';
        if (shape.type === 'triangle') {
            return baseClasses; // Triangle uses border styling with dynamic opacity
        }
        return baseClasses;
    };

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {shapes.map(shape => (
                <div
                    key={shape.id}
                    className={getShapeClasses(shape)}
                    style={getShapeStyle(shape)}
                />
            ))}
        </div>
    );
}
