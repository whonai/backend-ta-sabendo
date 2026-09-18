import {
  AppEvent,
  ModerationFlag,
  StreetSegment,
  UrbanReport,
  Venue,
} from './types';
import { dayLabelForEvent, shiftCatalogDate } from './utils/eventSchedule';

/** Cenários Feira de Santana — datas-âncora; use buildSeedEvents() para “hoje”. */
const curatedEventTemplates: AppEvent[] = [
  {
    id: 'evt_varandinha_show',
    title: 'Show no Varandinha: Samba dos Amigos',
    description:
      'Roda de samba tradicional de quinta-feira com Sambadores do Sertão e convidados especiais. Clima agradável e cerveja gelada.',
    category: 'shows',
    venueName: 'Varandinha Music Bar',
    address: 'Av. Fraga Maia, 1420',
    neighborhood: 'Fraga Maia',
    coordinates: { lat: -12.2384, lng: -38.9556 },
    date: '2026-09-04',
    dayLabel: 'Hoje',
    startTime: '21:00',
    endTime: '02:00',
    price: 'R$ 25 - R$ 35',
    imageUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    interestedCount: 215,
    goingCount: 143,
    currentAttendees: 58,
    status: 'high_confidence',
    origin: 'verified_venue',
    venueId: 'venue_varandinha',
    confirmationsCount: 47,
    disputesCount: 1,
    evidenceCount: 12,
    reliabilityScore: 98,
    createdBy: {
      id: 'venue_varandinha',
      name: 'Varandinha Oficial',
      reputationLevel: 'Muito Confiável',
      trustworthinessScore: 99,
    },
    createdAt: '2026-09-03T10:00:00Z',
    updatedAt: '2026-09-04T18:30:00Z',
  },
  {
    id: 'evt_futebol_bar',
    title: 'Transmissão Ao Vivo: Bahia x Vitória no Bar do Zé',
    description:
      'Clássico Ba-Vi no telão 4K com chopp duplo durante o primeiro tempo. Casa lotando cedo!',
    category: 'futebol',
    venueName: 'Bar & Choperia do Zé',
    address: 'Rua São Domingos, 180',
    neighborhood: 'Santa Mônica',
    coordinates: { lat: -12.2518, lng: -38.9598 },
    date: '2026-09-04',
    dayLabel: 'Hoje',
    startTime: '19:30',
    endTime: '22:30',
    price: 'Entrada Franca',
    imageUrl:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    interestedCount: 112,
    goingCount: 87,
    currentAttendees: 44,
    status: 'confirmed',
    origin: 'user',
    confirmationsCount: 28,
    disputesCount: 0,
    evidenceCount: 5,
    reliabilityScore: 92,
    createdBy: {
      id: 'usr_carlos',
      name: 'Carlos Santana',
      reputationLevel: 'Confiável',
      trustworthinessScore: 91,
    },
    createdAt: '2026-09-04T12:00:00Z',
    updatedAt: '2026-09-04T19:00:00Z',
  },
  {
    id: 'evt_dj_container',
    title: 'Sexta Eletrônica & Deep House no Container',
    description:
      'Set exclusivo de DJs locais e iluminação imersiva na vila gastronômica da Santa Mônica.',
    category: 'dj',
    venueName: 'Vila Container Kalilândia',
    address: 'Rua São Domingos, 450',
    neighborhood: 'Santa Mônica',
    coordinates: { lat: -12.2532, lng: -38.9612 },
    date: '2026-09-05',
    dayLabel: 'Amanhã',
    startTime: '22:00',
    endTime: '04:00',
    price: 'R$ 20',
    imageUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    interestedCount: 184,
    goingCount: 110,
    currentAttendees: 0,
    status: 'confirmed',
    origin: 'verified_venue',
    venueId: 'venue_vilacontainer',
    confirmationsCount: 19,
    disputesCount: 0,
    evidenceCount: 3,
    reliabilityScore: 95,
    createdBy: {
      id: 'venue_vilacontainer',
      name: 'Vila Container',
      reputationLevel: 'Muito Confiável',
      trustworthinessScore: 96,
    },
    createdAt: '2026-09-02T15:00:00Z',
    updatedAt: '2026-09-04T08:00:00Z',
  },
  {
    id: 'evt_feira_tomba',
    title: 'Feira Livre e Cultural do Tomba',
    description:
      'Frutas da região, tapioca, pastéis na hora e apresentações espontâneas de violeiros.',
    category: 'feiras',
    venueName: 'Praça do Tomba',
    address: 'Praça Macário Barreto',
    neighborhood: 'Tomba',
    coordinates: { lat: -12.2798, lng: -38.9644 },
    date: '2026-09-06',
    dayLabel: 'Domingo',
    startTime: '06:30',
    endTime: '13:00',
    price: 'Gratuito',
    imageUrl:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80',
    interestedCount: 290,
    goingCount: 198,
    currentAttendees: 0,
    status: 'high_confidence',
    origin: 'platform',
    confirmationsCount: 52,
    disputesCount: 0,
    evidenceCount: 14,
    reliabilityScore: 99,
    createdBy: {
      id: 'admin_platform',
      name: 'Equipe Tá Rolando',
      reputationLevel: 'Muito Confiável',
      trustworthinessScore: 100,
    },
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-04T10:00:00Z',
  },
  {
    id: 'evt_uefs_cultural',
    title: 'Sarau Universitário & Feira de Ideias UEFS',
    description:
      'Música independente, poesia marginal, exposições e palco aberto para talentos da universidade.',
    category: 'universitario',
    venueName: 'Campus Universitário UEFS - Bosque Central',
    address: 'Av. Transnordestina, s/n',
    neighborhood: 'Novo Horizonte',
    coordinates: { lat: -12.2012, lng: -38.9721 },
    date: '2026-09-05',
    dayLabel: 'Amanhã',
    startTime: '17:00',
    endTime: '22:00',
    price: 'Gratuito',
    imageUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    interestedCount: 340,
    goingCount: 210,
    currentAttendees: 0,
    status: 'confirmed',
    origin: 'user',
    confirmationsCount: 34,
    disputesCount: 1,
    evidenceCount: 8,
    reliabilityScore: 91,
    createdBy: {
      id: 'usr_mariana',
      name: 'Mariana Dantas (DCE)',
      reputationLevel: 'Confiável',
      trustworthinessScore: 93,
    },
    createdAt: '2026-09-03T11:00:00Z',
    updatedAt: '2026-09-04T14:00:00Z',
  },
  {
    id: 'evt_rodadesamba_map',
    title: 'Samba de Roda Tradicional no Mercado de Arte',
    description:
      'Ancestralidade e alegria no coração da cidade com mestres do samba do recôncavo baiano.',
    category: 'cultural',
    venueName: 'Mercado de Arte Popular (MAP)',
    address: 'Praça da Bandeira, Centro',
    neighborhood: 'Centro',
    coordinates: { lat: -12.2601, lng: -38.9682 },
    date: '2026-09-06',
    dayLabel: 'Domingo',
    startTime: '11:00',
    endTime: '15:30',
    price: 'Gratuito',
    imageUrl:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
    interestedCount: 180,
    goingCount: 95,
    currentAttendees: 0,
    status: 'high_confidence',
    origin: 'platform',
    confirmationsCount: 41,
    disputesCount: 0,
    evidenceCount: 9,
    reliabilityScore: 97,
    createdBy: {
      id: 'admin_platform',
      name: 'Equipe Tá Rolando',
      reputationLevel: 'Muito Confiável',
      trustworthinessScore: 100,
    },
    createdAt: '2026-09-01T14:00:00Z',
    updatedAt: '2026-09-04T09:00:00Z',
  },
  {
    id: 'evt_pending_community',
    title: 'Pagode de Quinta — pendente moderação',
    description: 'Evento cadastrado pela comunidade aguardando aprovação.',
    category: 'festas',
    venueName: 'Bar do Centro',
    address: 'Rua Direita, 120',
    neighborhood: 'Centro',
    coordinates: { lat: -12.2595, lng: -38.9675 },
    date: '2026-09-17',
    startTime: '21:00',
    price: 'R$ 15',
    imageUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    interestedCount: 12,
    goingCount: 8,
    currentAttendees: 0,
    status: 'unconfirmed',
    origin: 'user',
    confirmationsCount: 2,
    disputesCount: 0,
    evidenceCount: 0,
    reliabilityScore: 55,
    createdBy: {
      id: 'usr_new',
      name: 'João Silva',
      reputationLevel: 'Novo',
      trustworthinessScore: 50,
    },
    createdAt: '2026-09-17T12:00:00Z',
    updatedAt: '2026-09-17T12:00:00Z',
  },
];

export const CURATED_EVENT_IDS = curatedEventTemplates.map(e => e.id);

export function buildSeedEvents(now = new Date()): AppEvent[] {
  return curatedEventTemplates.map(template => {
    const date = shiftCatalogDate(template.date, now);
    const event: AppEvent = {
      ...template,
      date,
      dayLabel: dayLabelForEvent(date, now),
      interestedCount: 0,
      goingCount: 0,
      confirmationsCount: 0,
      currentAttendees: 0,
      disputesCount: 0,
      evidenceCount: 0,
      reliabilityScore: 50,
      status: 'unconfirmed',
      updatedAt: now.toISOString(),
    };
    return event;
  });
}

/** @deprecated use buildSeedEvents() — mantido para compatibilidade interna */
export const seedEvents = curatedEventTemplates;

const curatedUrbanReportTemplates: UrbanReport[] = [
  {
    id: 'urb_alagamento_centro',
    type: 'flooding',
    title: 'Ponto crítico de alagamento na pista',
    description:
      'Água subindo rápido próximo ao cruzamento com a Marechal Deodoro. Carros baixos evitando passagem.',
    streetName: 'Rua Monsenhor Moisés do Couto',
    neighborhood: 'Centro',
    coordinates: { lat: -12.2592, lng: -38.9665 },
    status: 'high_confidence',
    confirmationsCount: 16,
    disputesCount: 0,
    reliabilityScore: 96,
    createdBy: {
      id: 'usr_lucas',
      name: 'Lucas Ferreira',
      reputationLevel: 'Confiável',
    },
    createdAt: '2026-09-04T18:25:00Z',
    lastConfirmedAt: '2026-09-04T18:40:00Z',
  },
  {
    id: 'urb_buraco_fraga_maia',
    type: 'pothole',
    title: 'Buraco fundo na faixa da direita',
    description:
      'Causou danos na roda de um carro. Risco de acidente principalmente para motociclistas.',
    streetName: 'Avenida Fraga Maia (sentido centro)',
    neighborhood: 'Mangabeira',
    coordinates: { lat: -12.2415, lng: -38.9568 },
    status: 'confirmed',
    confirmationsCount: 12,
    disputesCount: 1,
    reliabilityScore: 89,
    createdBy: {
      id: 'usr_patricia',
      name: 'Patrícia Lima',
      reputationLevel: 'Colaborador',
    },
    createdAt: '2026-09-04T16:10:00Z',
    lastConfirmedAt: '2026-09-04T18:15:00Z',
  },
  {
    id: 'urb_semaforo_getulio',
    type: 'traffic_light',
    title: 'Semáforo intermitente em amarelo',
    description:
      'Trânsito bastante travado no cruzamento com a Maria Quitéria nos dois sentidos.',
    streetName: 'Av. Getúlio Vargas com Av. Maria Quitéria',
    neighborhood: 'Ponto Central',
    coordinates: { lat: -12.2548, lng: -38.9592 },
    status: 'confirmed',
    confirmationsCount: 22,
    disputesCount: 0,
    reliabilityScore: 94,
    createdBy: {
      id: 'usr_marcos',
      name: 'Marcos Bahia',
      reputationLevel: 'Muito Confiável',
    },
    createdAt: '2026-09-04T17:45:00Z',
    lastConfirmedAt: '2026-09-04T18:38:00Z',
  },
  {
    id: 'urb_iluminacao_capuchinhos',
    type: 'lighting',
    title: 'Trecho com 4 postes apagados',
    description: 'Rua muito escura à noite, pedestres evitando caminhar no local.',
    streetName: 'Rua Frei Hermenegildo',
    neighborhood: 'Capuchinhos',
    coordinates: { lat: -12.2642, lng: -38.9551 },
    status: 'confirmed',
    confirmationsCount: 8,
    disputesCount: 0,
    reliabilityScore: 88,
    createdBy: {
      id: 'usr_renata',
      name: 'Renata Castro',
      reputationLevel: 'Colaborador',
    },
    createdAt: '2026-09-03T20:30:00Z',
    lastConfirmedAt: '2026-09-04T12:00:00Z',
  },
];

export const CURATED_URBAN_REPORT_IDS = curatedUrbanReportTemplates.map(r => r.id);

/** Timestamps relativos ao relógio atual (alertas do pulso). */
export function buildSeedUrbanReports(now = new Date()): UrbanReport[] {
  const minutesAgo = [18, 95, 42, 360];
  return curatedUrbanReportTemplates.map((template, i) => {
    const lastConfirmedAt = new Date(now.getTime() - minutesAgo[i] * 60000).toISOString();
    const createdAt = new Date(new Date(lastConfirmedAt).getTime() - 45 * 60000).toISOString();
    return { ...template, createdAt, lastConfirmedAt };
  });
}

export const seedUrbanReports = curatedUrbanReportTemplates;

export const seedStreets: StreetSegment[] = [
  {
    id: 'seg_getulio_vargas',
    streetName: 'Avenida Getúlio Vargas',
    neighborhood: 'Centro / Santa Mônica',
    condition: 'good',
    path: [
      [-12.2615, -38.9715],
      [-12.2582, -38.9662],
      [-12.2548, -38.9592],
      [-12.2512, -38.9515],
    ],
    evaluationsCount: 54,
    confidenceScore: 96,
    lastUpdated: 'Há 45 min',
    history: [
      { date: 'Hoje', condition: 'good', evaluations: 18 },
      { date: 'Ontem', condition: 'good', evaluations: 22 },
      { date: '3 dias atrás', condition: 'good', evaluations: 14 },
    ],
    recentComments: ['Asfalto novo recém-recapeado', 'Excelente iluminação no canteiro central'],
  },
  {
    id: 'seg_fraga_maia',
    streetName: 'Avenida Fraga Maia',
    neighborhood: 'Mangabeira',
    condition: 'attention',
    path: [
      [-12.2458, -38.9582],
      [-12.2415, -38.9568],
      [-12.2384, -38.9556],
      [-12.2335, -38.9538],
    ],
    evaluationsCount: 38,
    confidenceScore: 89,
    lastUpdated: 'Há 1 hora',
    history: [
      { date: 'Hoje', condition: 'attention', evaluations: 12 },
      { date: 'Ontem', condition: 'attention', evaluations: 15 },
      { date: '3 dias atrás', condition: 'good', evaluations: 11 },
    ],
    recentComments: [
      'Buraco perto do retorno precisa de atenção',
      'Movimento muito alto de carros na porta dos bares',
    ],
  },
  {
    id: 'seg_sao_domingos',
    streetName: 'Rua São Domingos',
    neighborhood: 'Santa Mônica',
    condition: 'good',
    path: [
      [-12.2505, -38.9585],
      [-12.2518, -38.9598],
      [-12.2532, -38.9612],
    ],
    evaluationsCount: 42,
    confidenceScore: 92,
    lastUpdated: 'Há 2 horas',
    history: [
      { date: 'Hoje', condition: 'good', evaluations: 14 },
      { date: 'Ontem', condition: 'good', evaluations: 16 },
    ],
    recentComments: ['Calçadas acessíveis e bem iluminado'],
  },
  {
    id: 'seg_rio_branco',
    streetName: 'Rua Visconde do Rio Branco',
    neighborhood: 'Centro',
    condition: 'bad',
    path: [
      [-12.2618, -38.9692],
      [-12.2635, -38.9680],
      [-12.2655, -38.9668],
    ],
    evaluationsCount: 31,
    confidenceScore: 91,
    lastUpdated: 'Há 3 horas',
    history: [
      { date: 'Hoje', condition: 'bad', evaluations: 10 },
      { date: 'Ontem', condition: 'bad', evaluations: 12 },
      { date: '3 dias atrás', condition: 'bad', evaluations: 9 },
    ],
    recentComments: ['Vários desníveis e pedras soltas', 'Trecho muito acidentado'],
  },
  {
    id: 'seg_castro_alves',
    streetName: 'Rua Castro Alves',
    neighborhood: 'Serraria Brasil',
    condition: 'insufficient_data',
    path: [
      [-12.2650, -38.9610],
      [-12.2672, -38.9602],
    ],
    evaluationsCount: 2,
    confidenceScore: 28,
    lastUpdated: 'Há 3 dias',
    history: [],
    recentComments: ['Ainda poucas avaliações da comunidade'],
  },
];

export const seedVenues: Venue[] = [
  {
    id: 'venue_varandinha',
    name: 'Varandinha Music Bar',
    category: 'Casa de Shows & Gastronomia',
    isVerified: true,
    address: 'Av. Fraga Maia, 1420',
    neighborhood: 'Fraga Maia',
    coordinates: { lat: -12.2384, lng: -38.9556 },
    photoUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    description:
      'Ponto tradicional da noite feirense na Fraga Maia, palco de shows de samba, pagode e sertanejo com estrutura climatizada.',
    openingHours: 'Qua a Dom · a partir das 18h',
    activeEventsCount: 2,
    claimedByOwner: true,
  },
  {
    id: 'venue_vilacontainer',
    name: 'Vila Container Kalilândia',
    category: 'Vila Gastronômica & Choperia',
    isVerified: true,
    address: 'Rua São Domingos, 450',
    neighborhood: 'Santa Mônica',
    coordinates: { lat: -12.2532, lng: -38.9612 },
    photoUrl:
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80',
    description:
      'Espaço ao ar livre com chopes artesanais, música ao vivo e diversas opções culinárias.',
    openingHours: 'Ter a Dom · a partir das 17h',
    activeEventsCount: 2,
    claimedByOwner: true,
  },
  {
    id: 'venue_map',
    name: 'Mercado de Arte Popular (MAP)',
    category: 'Centro Cultural & Artesanato',
    isVerified: true,
    address: 'Praça da Bandeira, s/n',
    neighborhood: 'Centro',
    coordinates: { lat: -12.2601, lng: -38.9682 },
    photoUrl:
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
    description:
      'Patrimônio histórico e cultural da cidade com feira de artesanato, samba de roda e culinária típica sertaneja.',
    openingHours: 'Seg a Sáb · 08h às 18h',
    activeEventsCount: 1,
    claimedByOwner: false,
  },
];

export const seedModerationFlags: ModerationFlag[] = [
  {
    id: 'mod_1',
    targetId: 'evt_futebol_bar',
    targetType: 'event',
    targetTitle: 'Transmissão Ao Vivo: Bahia x Vitória no Bar do Zé',
    reason: 'wrong_location',
    reasonLabel: 'Localização incorreta',
    reportedAt: '2026-09-04T17:10:00Z',
    status: 'pending',
    reportedBy: 'usr_denuncia_42',
    notes: 'A entrada fica na rua lateral, sugeriu ajustar o pin',
  },
];
