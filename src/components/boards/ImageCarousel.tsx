import { useState } from 'react';

/**
 * ImageCarousel — displays 1-4 images in a horizontal swipeable carousel.
 *
 * Single image: displayed full-width, no carousel chrome.
 * Multiple images: dot indicators below, swipe or tap arrows to navigate.
 *
 * Touch swipe support: tracks touchstart/touchend X positions
 * and advances/reverses on a 50px threshold.
 */

interface ImageCarouselProps {
  imageUrls: string[];
}

export function ImageCarousel({ imageUrls }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (imageUrls.length === 0) return null;

  // Single image — no carousel, just display it
  if (imageUrls.length === 1) {
    return (
      <div className="image-carousel-single">
        <img
          src={imageUrls[0]}
          alt=""
          className="image-carousel-img"
          loading="lazy"
        />
      </div>
    );
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const threshold = 50;

    if (deltaX < -threshold && activeIndex < imageUrls.length - 1) {
      setActiveIndex((i) => i + 1);
    } else if (deltaX > threshold && activeIndex > 0) {
      setActiveIndex((i) => i - 1);
    }

    setTouchStartX(null);
  }

  return (
    <div
      className="image-carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="image-carousel-track"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {imageUrls.map((url, i) => (
          <img
            key={url}
            src={url}
            alt=""
            className="image-carousel-img"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>

      {/* Dot indicators */}
      <div className="image-carousel-dots">
        {imageUrls.map((_, i) => (
          <button
            key={i}
            className={`image-carousel-dot${i === activeIndex ? ' active' : ''}`}
            onClick={() => setActiveIndex(i)}
            aria-label={`Image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
