import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { CreateTrainerModal } from './CreateTrainerModal';
import { 
  hasLocalTrainerProfile, 
  getLocalTrainerProfile, 
  saveLocalTrainerProfile,
  LocalTrainerProfile 
} from '../services/trainerProfileService';

export const WelcomeModalHandler: React.FC = () => {
  const { manager, updateTrainerProfile } = useGame();
  const [needsProfileCreation, setNeedsProfileCreation] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if trainer profile already exists locally
    if (hasLocalTrainerProfile()) {
      setNeedsProfileCreation(false);
      setIsReady(true);
      return;
    }

    // 2. Check if player has an existing save / manager with a name
    try {
      const localSave = localStorage.getItem('anta_el_modareb_save_v1');
      if (localSave) {
        const parsed = JSON.parse(localSave);
        if (parsed?.manager?.name && parsed.manager.name !== 'المدرب الجديد') {
          // Auto-migrate existing manager to trainer profile so player continues seamlessly
          saveLocalTrainerProfile({
            name: parsed.manager.name,
            age: parsed.manager.age || 35,
            nationality: parsed.manager.nationality || 'مصري',
          });
          setNeedsProfileCreation(false);
          setIsReady(true);
          return;
        }
      }
    } catch {
      // ignore
    }

    // 3. First time launch without any profile
    setNeedsProfileCreation(true);
    setIsReady(true);
  }, []);

  if (!isReady || !needsProfileCreation) {
    return null;
  }

  const handleProfileCreated = (profile: LocalTrainerProfile) => {
    if (updateTrainerProfile) {
      updateTrainerProfile(profile.name, profile.age, profile.nationality);
    }
    setNeedsProfileCreation(false);
  };

  return <CreateTrainerModal onProfileCreated={handleProfileCreated} />;
};
