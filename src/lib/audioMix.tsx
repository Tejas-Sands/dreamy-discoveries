import React, {createContext, useContext} from 'react';
import {Audio} from 'remotion';

const MixGain = createContext(1);

/** Mastered episodes leave headroom before Remotion sums into its PCM16 intermediate. */
export const MixGainProvider: React.FC<React.PropsWithChildren<{presentationVersion?: number}>> = ({presentationVersion = 0, children}) => (
  <MixGain.Provider value={presentationVersion >= 4 ? .25 : 1}>{children}</MixGain.Provider>
);

export const MixAudio: React.FC<React.ComponentProps<typeof Audio>> = ({volume = 1, ...props}) => {
  const gain = useContext(MixGain);
  return <Audio {...props} volume={typeof volume === 'function' ? frame => volume(frame) * gain : volume * gain} />;
};
