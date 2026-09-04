import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

export const WelcomeModalHandler: React.FC = () => {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return null;
  }

  // Show auth prompt if not logged in and hasn't explicitly chosen guest mode
  if (!user && !isGuest) {
    return <AuthModal isMandatory={false} />;
  }

  return null;
};
