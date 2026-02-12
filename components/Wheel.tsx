import React, { useEffect, useRef, useState } from 'react';
import { Category } from '../types';
import * as d3 from 'd3';
import { playWheelClick } from '../utils/audio';

interface WheelProps {
  categories: Category[];
  onSpinEnd: (category: Category) => void;
  isSpinning: boolean;
  onSpinClick: () => void;
}

const Wheel: React.FC<WheelProps> = ({ categories, onSpinEnd, isSpinning, onSpinClick }) => {
  const ref = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(0);

  const colorPalette = [
    "#FFD166", // Yellow
    "#06D6A0", // Teal/Green
    "#EF476F", // Pink/Red
    "#118AB2", // Blue
    "#9D4EDD", // Purple
    "#FF9F1C", // Orange
  ];

  useEffect(() => {
    let interval: number;
    if (isSpinning) {
      interval = window.setInterval(() => {
        playWheelClick();
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isSpinning]);

  useEffect(() => {
    if (!ref.current || categories.length === 0) return;

    const width = 600;
    const height = 600;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3.pie<Category>()
      .value(1)
      .sort(null);

    // CHANGED: innerRadius set to 0 to prevent "white line" artifacts near center.
    // The HTML center hub covers the middle anyway.
    const arc = d3.arc<d3.PieArcDatum<Category>>()
      .innerRadius(0) 
      .outerRadius(radius - 10);

    // Filters
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "wheel-shadow")
      .attr("height", "130%");
    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 4)
      .attr("result", "blur");
    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 0)
      .attr("dy", 4)
      .attr("result", "offsetBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const arcs = g.selectAll("arc")
      .data(pie(categories))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => {
        return d.data.color || colorPalette[i % colorPalette.length];
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", "4px")
      .style("filter", "url(#wheel-shadow)");

    // Text labels
    arcs.append("text")
      .attr("transform", function(d) {
        const angle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
        
        // Fixed text distance from center
        const textRadius = radius * 0.75;
        const rads = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
        const x = Math.cos(rads) * textRadius;
        const y = Math.sin(rads) * textRadius;

        return `translate(${x},${y}) rotate(${angle + 90})`;
      })
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .text(d => {
          const name = d.data.name;
          return name.length > 18 ? name.substring(0, 16) + '..' : name;
      })
      .style("fill", "#000000") // Black text
      .style("font-weight", "800")
      .style("font-family", "Fredoka, sans-serif")
      .style("font-size", "14px")
      .style("pointer-events", "none");

  }, [categories]);

  useEffect(() => {
    if (isSpinning) {
      const newRotation = rotation + 1800 + Math.random() * 360; 
      setRotation(newRotation);
      
      setTimeout(() => {
        const normalizedRotation = newRotation % 360;
        const arrowAngle = (360 - normalizedRotation) % 360;
        const segmentSize = 360 / categories.length;
        const winningIndex = Math.floor(arrowAngle / segmentSize);
        const actualIndex = winningIndex >= categories.length ? 0 : winningIndex;
        
        onSpinEnd(categories[actualIndex]);
      }, 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  return (
    <div className="relative flex justify-center items-center py-12 w-full overflow-visible">
      {/* Static Arrow Indicator */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 filter drop-shadow-lg">
        <div className="w-16 h-20 bg-slate-800" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}></div>
      </div>

      <div 
        className={`relative rounded-full transition-all duration-300 ${isSpinning ? '' : 'cursor-pointer hover:scale-[1.01] active:scale-95'}`}
        onClick={onSpinClick}
        title="¡Toca para girar!"
      >
        <svg 
          ref={ref} 
          viewBox="0 0 600 600"
          className="w-[90vw] h-[90vw] max-w-[600px] max-h-[600px]"
          style={{ 
            transition: 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)', 
            transform: `rotate(${rotation}deg)` 
          }}
        />
        {/* Center hub - Slightly larger to ensure coverage of inner join */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24%] h-[24%] bg-white rounded-full shadow-lg border-8 border-slate-100 flex items-center justify-center z-10">
            <div className="w-3/4 h-3/4 bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
              {!isSpinning && <span className="text-white text-sm md:text-base font-black tracking-widest">GIRAR</span>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Wheel;