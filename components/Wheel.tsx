import React, { useEffect, useRef, useState } from 'react';
import { Category } from '../types';
import * as d3 from 'd3';
import { playWheelClick, playTone } from '../utils/audio';

interface WheelProps {
  categories: Category[];
  onSpinEnd: (category: Category) => void;
  isSpinning: boolean;
  onSpinClick: () => void;
  usedCategories?: string[];
}

const Wheel: React.FC<WheelProps> = ({ categories, onSpinEnd, isSpinning, onSpinClick, usedCategories }) => {
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
      }, 120);
    }
    return () => {
      clearInterval(interval);
      playTone(500, 'sine', 0.15, 0.4);
    };
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
      // Find available categories
      const availableIndices: number[] = [];
      categories.forEach((c, i) => {
          if (!usedCategories?.includes(c.id)) {
              availableIndices.push(i);
          }
      });
      
      const candidates = availableIndices.length > 0 ? availableIndices : categories.map((_, i) => i);
      const targetIndex = candidates[Math.floor(Math.random() * candidates.length)];
      
      const segmentSize = 360 / categories.length;
      // Add randomness within the segment (10% to 90% of the segment)
      const offset = (Math.random() * 0.8 + 0.1) * segmentSize; 
      const targetArrowAngle = (targetIndex * segmentSize + offset) % 360;
      
      // Calculate how much more rotation is needed to land on target
      const requiredMod = (360 - targetArrowAngle) % 360;
      
      // Base rotation: at least 5 complete spins (1800 degrees)
      const baseRotation = rotation + 1800;
      const currentMod = baseRotation % 360;
      
      let extraDeg = requiredMod - currentMod;
      if (extraDeg < 0) extraDeg += 360;
      
      const newRotation = baseRotation + extraDeg;
      setRotation(newRotation);
      
      setTimeout(() => {
        onSpinEnd(categories[targetIndex]);
      }, 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  return (
    <div className="relative flex justify-center items-center w-full h-full -mt-8">
      {/* Static Arrow Indicator - Right on the edge of wheel */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20">
        <svg width="36" height="44" viewBox="0 0 36 44" fill="none" className="drop-shadow-lg">
          <path d="M18 44L3 12C3 5 10.4 0 18 4C25.6 0 33 5 33 12L18 44Z" fill="#1e293b"/>
          <path d="M18 38L7 14C7 8 11.6 3 18 7C24.4 3 29 8 29 14L18 38Z" fill="#334155"/>
        </svg>
      </div>

      <div 
        className={`relative rounded-full transition-all duration-300 cursor-pointer hover:scale-[1.01] active:scale-95`}
        onClick={onSpinClick}
        title="¡Toca para girar!"
      >
        <svg 
          ref={ref} 
          viewBox="0 0 600 600"
          className="w-[550px] h-[550px] md:w-[680px] md:h-[680px]"
          style={{ 
            transition: 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)', 
            transform: `rotate(${rotation}deg)` 
          }}
        />
        {/* Center hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22%] h-[22%] bg-white rounded-full shadow-lg border-8 border-slate-100 flex items-center justify-center z-10">
            <div className="w-3/4 h-3/4 bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
              {!isSpinning && <span className="text-white text-sm md:text-base font-black tracking-widest">GIRAR</span>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Wheel;