import React from 'react';
import EmptyState from '../components/Shared/EmptyState';
import { User } from 'lucide-react';

export default function CharacterView() {
  return (
    <EmptyState 
      icon={User} 
      title="Character Lab" 
      description="Consistent character generation is coming soon. Stay tuned!" 
    />
  );
}
