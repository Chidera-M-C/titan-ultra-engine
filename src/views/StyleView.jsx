import React from 'react';
import EmptyState from '../components/Shared/EmptyState';
import { Sparkles } from 'lucide-react';

export default function StyleView() {
  return (
    <EmptyState 
      icon={Sparkles} 
      title="Style Library" 
      description="Fine-tune your artistic direction with custom styles. Coming soon." 
    />
  );
}
