import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView } from 'motion/react';
import './AnimatedList.css';

const AnimatedItem = ({ children, delay = 0, index, onMouseEnter, onClick }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.3, triggerOnce: false });
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.92, opacity: 0, y: 6 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.92, opacity: 0, y: 6 }}
      transition={{ duration: 0.22, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

const AnimatedList = ({
  items = [],
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  itemClassName = '',
  displayScrollbar = true,
  initialSelectedIndex = -1,
  renderItem,
}) => {
  const listRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(items.length > 5 ? 1 : 0);

  const handleItemMouseEnter = useCallback(index => setSelectedIndex(index), []);

  const handleItemClick = useCallback((item, index) => {
    setSelectedIndex(index);
    if (onItemSelect) onItemSelect(item, index);
  }, [onItemSelect]);

  const handleScroll = useCallback(e => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
  }, []);

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = e => {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < items.length) {
        e.preventDefault();
        if (onItemSelect) onItemSelect(items[selectedIndex], selectedIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedItem) {
      const extraMargin = 50;
      const { scrollTop, clientHeight } = container;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      if (itemTop < scrollTop + extraMargin) container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' });
      else if (itemBottom > scrollTop + clientHeight - extraMargin) container.scrollTo({ top: itemBottom - clientHeight + extraMargin, behavior: 'smooth' });
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  return (
    <div className={`scroll-list-container ${className}`}>
      <div ref={listRef} className={`scroll-list ${!displayScrollbar ? 'no-scrollbar' : ''}`} onScroll={handleScroll}>
        {items.map((item, index) => (
          <AnimatedItem key={index} delay={index * 0.04} index={index} onMouseEnter={() => handleItemMouseEnter(index)} onClick={() => handleItemClick(item, index)}>
            {renderItem ? (
              renderItem(item, index, selectedIndex === index)
            ) : (
              <div className={`animated-list-item ${selectedIndex === index ? 'selected' : ''} ${itemClassName}`}>
                {typeof item === 'string' ? <p className="animated-list-item-text">{item}</p> : item}
              </div>
            )}
          </AnimatedItem>
        ))}
      </div>
      {showGradients && (
        <>
          <div className="top-gradient" style={{ opacity: topGradientOpacity }} />
          <div className="bottom-gradient" style={{ opacity: bottomGradientOpacity }} />
        </>
      )}
    </div>
  );
};

export default AnimatedList;
