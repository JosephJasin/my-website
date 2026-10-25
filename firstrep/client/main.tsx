import { createRoot } from 'react-dom/client';
import GymApp from './gym-app';
import './globals.css';
import './workouts.css';

createRoot(document.getElementById('root')!).render(<GymApp />);
