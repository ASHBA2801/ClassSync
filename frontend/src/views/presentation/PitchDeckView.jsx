import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, MessageSquare, Presentation } from 'lucide-react';
import SlideCard from './SlideCard';
import { fetchPitchData } from '../../services/api';

export default function PitchDeckView() {
  const [pitchData, setPitchData] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadPitchData();
  }, []);

  useEffect(() => {
    let timer = null;
    if (isPlaying && pitchData) {
      timer = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % pitchData.slides.length);
      }, 4000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, pitchData]);

  const loadPitchData = async () => {
    try {
      const res = await fetchPitchData();
      setPitchData(res);
    } catch (err) {
      console.error(err);
    }
  };

  if (!pitchData) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading EduSync Pitch Presentation Deck...</div>;
  }

  const slides = pitchData.slides;
  const currentSlide = slides[currentSlideIndex];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Slide Navigation Control Bar */}
      <div className="glass-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Left: Previous / Next & Index */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrev}
            disabled={currentSlideIndex === 0}
            className="btn-outline"
            style={{ padding: '8px 12px', opacity: currentSlideIndex === 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={18} /> Prev Slide
          </button>
          
          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>
            Slide {currentSlideIndex + 1} of {slides.length}
          </span>

          <button
            onClick={handleNext}
            disabled={currentSlideIndex === slides.length - 1}
            className="btn-outline"
            style={{ padding: '8px 12px', opacity: currentSlideIndex === slides.length - 1 ? 0.4 : 1 }}
          >
            Next Slide <ChevronRight size={18} />
          </button>
        </div>

        {/* Middle: Jump to slide selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                background: currentSlideIndex === idx ? '#2E5090' : '#f1f5f9',
                color: currentSlideIndex === idx ? '#fff' : '#475569',
                border: 'none'
              }}
            >
              {s.slideNumber}
            </button>
          ))}
        </div>

        {/* Right: Speaker notes & Autoplay toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="btn-outline"
            style={{ fontSize: '0.82rem', padding: '6px 12px', background: showNotes ? '#FEF3C7' : 'transparent' }}
          >
            <MessageSquare size={14} /> Notes: {showNotes ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'Pause' : 'Autoplay'}
          </button>
        </div>

      </div>

      {/* Render Current Slide */}
      <SlideCard slide={currentSlide} showSpeakerNotes={showNotes} />

    </div>
  );
}
