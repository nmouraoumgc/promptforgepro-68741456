import type { LessonSector, LessonTrack } from '@/data/learnDb';

export const TRACK_LABEL: Record<LessonTrack, { pt: string; en: string; descPt: string; descEn: string }> = {
  fundamentos: { pt: 'Fundamentos', en: 'Fundamentals', descPt: 'O essencial para escrever prompts que dão resultados. Grátis.', descEn: 'The essentials for prompts that get results. Free.' },
  setor: { pt: 'Por setor', en: 'By industry', descPt: 'Casos práticos para o teu tipo de negócio.', descEn: 'Practical cases for your kind of business.' },
  avancado: { pt: 'Avançado', en: 'Advanced', descPt: 'Técnicas para ir mais longe: exemplos, templates e imagens.', descEn: 'Techniques to go further: examples, templates and images.' },
};

export const SECTOR_LABEL: Record<LessonSector, { pt: string; en: string }> = {
  marketing: { pt: 'Marketing e redes sociais', en: 'Marketing and social media' },
  pme: { pt: 'PME e comércio local', en: 'Small business' },
  freelancers: { pt: 'Freelancers', en: 'Freelancers' },
  imobiliario: { pt: 'Imobiliário', en: 'Real estate' },
  hotelaria: { pt: 'Restauração e Alojamento Local', en: 'Hospitality and holiday rentals' },
};

export const LEVEL_LABEL = {
  basico: { pt: 'Básico', en: 'Beginner' },
  intermedio: { pt: 'Intermédio', en: 'Intermediate' },
  avancado: { pt: 'Avançado', en: 'Advanced' },
} as const;
