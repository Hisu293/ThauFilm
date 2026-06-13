import { useEffect, useRef, useState } from 'react';

/** Adds a fade-up reveal when the element scrolls into view (CSS-driven, no animation lib). */
export const useRevealOnScroll = ({ threshold = 0.15, rootMargin = '0px 0px -40px 0px' } = {}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, visible]);

  return { ref, visible };
};

export default useRevealOnScroll;
