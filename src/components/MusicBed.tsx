import React, {useMemo} from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import type {KidsScript} from '../lib/types';
import type {Schedule} from '../lib/timing';
import {scoreSections, scoreVolume} from '../lib/score';

export const MusicBed: React.FC<{script: KidsScript; schedule: Schedule}> = ({script, schedule}) => {
  const sections = useMemo(() => scoreSections(script, schedule), [script, schedule]);
  return <>{sections.map((section, index) => <Sequence key={`${section.music.file}-${section.from}`} from={section.from} durationInFrames={section.to - section.from} name={`Score ${index + 1}: ${section.music.mood}`}>
    <Audio loop loopVolumeCurveBehavior="extend" src={staticFile(`music/${section.music.file}`)} volume={frame => scoreVolume(section.from + frame, section, script, schedule)} />
  </Sequence>)}</>;
};
