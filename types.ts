export interface Category {
  id: string;
  name: string;
  color: string;
  words: string[];
}

export type ParticipantType = 'TEAM' | 'INDIVIDUAL';

export interface Participant {
  id: string;
  name: string;
  score: number;
  avatar?: string;
}

export type NarratorStyle = 'DOCUMENTARY' | 'SPORTS' | 'GRANNY' | 'SARCASTIC' | 'ROBOT' | 'GEN_Z' | 'POET';

export interface GameSettings {
  mode: ParticipantType;
  participants: Participant[];
  winningScore: number;
  narratorStyle: NarratorStyle;
}

export type GamePhase = 'SETUP' | 'SPIN' | 'PLAY' | 'WINNER';

export interface TurnData {
  participantId: string;
  category: Category;
  word: string;
  duration: 30 | 60 | 90 | 120;
}

export interface GeneratedContent {
  text?: string;
  image?: string;
}