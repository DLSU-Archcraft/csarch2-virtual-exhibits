// Updated rooms.ts: added `exhibitKey` to hotspots and new rooms for Bombe, Colossus, Mark I, ENIAC, UNIVAC
export type HotspotType = 'navigation' | 'info' | 'quiz';

export interface RoomHotspot {
  id: string;
  type: HotspotType;
  x?: number;
  y?: number;
  target?: string;
  title?: string;
  description?: string;
  image?: string;
  buttonLabel?: string;
  exhibitKey?: string; // NEW: explicit key for mapping to exhibit/simulator
}

export interface RoomConfig {
  id: string;
  name: string;
  panorama: string;
  hotspots: RoomHotspot[];
}

// Helper function to get the base URL from import.meta.env
const getBaseUrl = () => import.meta.env.BASE_URL || '/';

// Helper function to prepend base URL to asset paths
const assetPath = (path: string): string => {
  const base = getBaseUrl();
  if (path.startsWith('/')) {
    return base.endsWith('/') ? base.slice(0, -1) + path : base + path;
  }
  return path;
};

export const rooms: RoomConfig[] = [
  {
    id: 'lobby',
    name: 'Entrance Lobby',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'to-classical',
        type: 'navigation',
        x: 28,
        y: 58,
        target: 'classical',
        title: 'Door to Classical Ciphers',
        buttonLabel: 'Enter Classical Ciphers'
      },
      {
        id: 'lobby-info',
        type: 'info',
        x: 70,
        y: 34,
        title: 'Welcome to the Exhibit',
        description: 'Step into the story of cryptography and the machines that changed history.',
        image: assetPath('/s02g9/caesar-cipher.webp'),
        buttonLabel: 'Open Exhibit'
      }
    ]
  },
  {
    id: 'classical',
    name: 'Classical Ciphers',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'caesar-hotspot',
        type: 'info',
        x: 34,
        y: 28,
        title: 'Caesar Cipher',
        description: 'Try the Caesar cipher simulator.',
        image: assetPath('/s02g9/caesar-cipher.webp'),
        buttonLabel: 'Open Simulator',
        exhibitKey: 'caesar'
      },
      {
        id: 'vigenere-hotspot',
        type: 'info',
        x: 60,
        y: 34,
        title: 'Vigenère Cipher',
        description: 'Try the Vigenère cipher simulator.',
        image: assetPath('/s02g9/vigenere-table.webp'),
        buttonLabel: 'Open Simulator',
        exhibitKey: 'vigenere'
      },
      {
        id: 'to-timeline',
        type: 'navigation',
        x: 62,
        y: 58,
        target: 'timeline',
        title: 'Door to Timeline of Cryptography',
        buttonLabel: 'Continue to Timeline'
      }
    ]
  },
  {
    id: 'timeline',
    name: 'Timeline of Cryptography',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'to-enigma',
        type: 'navigation',
        x: 66,
        y: 56,
        target: 'enigma',
        title: 'Door to Enigma Gallery',
        buttonLabel: 'Enter Enigma Gallery'
      },
      {
        id: 'timeline-info',
        type: 'info',
        x: 28,
        y: 30,
        title: 'Historical Timeline',
        description: 'Follow the development of cryptography from ancient methods to modern systems.',
        image: assetPath('/s02g9/vigenere-table.webp'),
        buttonLabel: 'Open Timeline',
        exhibitKey: 'timeline'
      },
      {
        id: 'evolution-info',
        type: 'info',
        x: 68,
        y: 30,
        title: 'Computing Evolution Timeline',
        description: 'See how each cryptographic breakthrough influenced the rise of computing.',
        image: assetPath('/s02g9/bletchley-colossus.jpg'),
        buttonLabel: 'Open Evolution Timeline',
        exhibitKey: 'evolution'
      }
    ]
  },
  {
    id: 'enigma',
    name: 'Enigma Machine Gallery',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'enigma-hotspot',
        type: 'info',
        x: 34,
        y: 24,
        title: 'Enigma Machine',
        description: 'Interact with an Enigma simulator.',
        image: assetPath('/s02g9/rotor-machine.webp'),
        buttonLabel: 'Open Simulator',
        exhibitKey: 'enigma'
      },
      {
        id: 'to-rotor',
        type: 'navigation',
        x: 64,
        y: 58,
        target: 'rotor',
        title: 'Door to Rotor Gallery',
        buttonLabel: 'Enter Rotor Gallery'
      }
    ]
  },
  {
    id: 'rotor',
    name: 'Rotor Machines Gallery',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'rotor-info',
        type: 'info',
        x: 32,
        y: 28,
        title: 'Rotor Showcase',
        description: 'Discover how mechanical advances set the foundation for modern computing and secure communication.',
        image: assetPath('/s02g9/rotor-machine.webp'),
        buttonLabel: 'Open Exhibit',
        exhibitKey: 'rotor' // could map to a rotor demo component
      },
      {
        id: 'to-modern',
        type: 'navigation',
        x: 68,
        y: 58,
        target: 'modern',
        title: 'Door to Modern Cryptography',
        buttonLabel: 'Enter Modern Cryptography'
      }
    ]
  },
  {
    id: 'modern',
    name: 'Modern Cryptography',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'modern-info',
        type: 'info',
        x: 72,
        y: 30,
        title: 'Modern Cryptography',
        description: 'A final look at the algorithms and systems that secure the digital age.',
        image: assetPath('/s02g9/bletchley-colossus.jpg'),
        buttonLabel: 'Open Exhibit',
        exhibitKey: 'modern'
      },
      {
        id: 'to-bombe',
        type: 'navigation',
        x: 60,
        y: 58,
        target: 'bombe',
        title: 'Door to Bombe Gallery',
        buttonLabel: 'Enter Bombe Gallery'
      },
      {
        id: 'to-computing-concepts',
        type: 'navigation',
        x: 20,
        y: 58,
        target: 'concepts',
        title: 'Door to Computing Concepts Gallery',
        buttonLabel: 'Enter Concepts Gallery'
      }
    ]
  },

  // NEW historical machine galleries
  {
    id: 'bombe',
    name: 'Bombe Gallery',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'bombe-info',
        type: 'info',
        x: 48,
        y: 36,
        title: 'Bombe',
        description: 'The Bombe helped Allied codebreakers test Enigma settings rapidly.',
        image: assetPath('/s02g9/Bombe.webp'),
        buttonLabel: 'Open Exhibit',
        exhibitKey: 'bombe'
      },
      {
        id: 'to-colossus',
        type: 'navigation',
        x: 72,
        y: 58,
        target: 'colossus',
        title: 'Door to Colossus',
        buttonLabel: 'Enter Colossus'
      },
      {
        id: 'to-modern-return',
        type: 'navigation',
        x: 26,
        y: 58,
        target: 'modern',
        title: 'Return to Modern Cryptography',
        buttonLabel: 'Back'
      }
    ]
  },
  {
    id: 'colossus',
    name: 'Colossus Gallery',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'colossus-info',
        type: 'info',
        x: 44,
        y: 30,
        title: 'Colossus',
        description: 'Colossus automated parts of Lorenz cryptanalysis with electronic logic.',
        image: assetPath('/s02g9/bletchley-colossus.jpg'),
        buttonLabel: 'Open Exhibit',
        exhibitKey: 'colossus'
      },
      {
        id: 'to-mark1',
        type: 'navigation',
        x: 72,
        y: 58,
        target: 'mark1',
        title: 'Door to Harvard Mark I',
        buttonLabel: 'Enter Mark I'
      },
      {
        id: 'to-bombe-return',
        type: 'navigation',
        x: 26,
        y: 58,
        target: 'bombe',
        title: 'Back to Bombe',
        buttonLabel: 'Back'
      }
    ]
  },
  {
    id: 'mark1',
    name: 'Harvard Mark I Gallery',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'mark1-info',
        type: 'info',
        x: 44,
        y: 36,
        title: 'Harvard Mark I',
        description: 'The Harvard Mark I was an early electromechanical computer used for scientific calculations.',
        image: assetPath('/s02g9/Harvard.webp'),
        buttonLabel: 'Open Exhibit',
        exhibitKey: 'mark1'
      },
      {
        id: 'to-eniac',
        type: 'navigation',
        x: 72,
        y: 58,
        target: 'eniac',
        title: 'Door to ENIAC',
        buttonLabel: 'Enter ENIAC'
      },
      {
        id: 'to-colossus-return',
        type: 'navigation',
        x: 26,
        y: 58,
        target: 'colossus',
        title: 'Back to Colossus',
        buttonLabel: 'Back'
      }
    ]
  },
  {
    id: 'eniac',
    name: 'ENIAC Gallery',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'eniac-info',
        type: 'info',
        x: 50,
        y: 34,
        title: 'ENIAC',
        description: 'ENIAC was one of the first electronic digital computers, built for ballistic and scientific calculations.',
        image: assetPath('/s02g9/ENIAC.webp'),
        buttonLabel: 'Open Exhibit',
        exhibitKey: 'eniac'
      },
      {
        id: 'to-univac',
        type: 'navigation',
        x: 72,
        y: 58,
        target: 'univac',
        title: 'Door to UNIVAC I',
        buttonLabel: 'Enter UNIVAC I'
      },
      {
        id: 'to-mark1-return',
        type: 'navigation',
        x: 26,
        y: 58,
        target: 'mark1',
        title: 'Back to Mark I',
        buttonLabel: 'Back'
      }
    ]
  },
  {
    id: 'univac',
    name: 'UNIVAC I Gallery',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'univac-info',
        type: 'info',
        x: 50,
        y: 36,
        title: 'UNIVAC I',
        description: 'UNIVAC I was the first commercially produced computer in the US and brought computing to business and government.',
        image: assetPath('/s02g9/UNIVAC.webp'),
        buttonLabel: 'Open Exhibit',
        exhibitKey: 'univac'
      },
      {
        id: 'to-eniac-return',
        type: 'navigation',
        x: 26,
        y: 58,
        target: 'eniac',
        title: 'Back to ENIAC',
        buttonLabel: 'Back'
      },
      {
        id: 'to-comparison',
        type: 'navigation',
        x: 60,
        y: 58,
        target: 'comparison',
        title: 'Machine Comparison Center',
        buttonLabel: 'Open Comparison Center'
      },
      {
        id: 'to-lobby',
        type: 'navigation',
        x: 92,
        y: 58,
        target: 'lobby',
        title: 'Exit to Lobby',
        buttonLabel: 'Exit to Lobby'
      }
    ]
  },
  {
    id: 'concepts',
    name: 'Computing Concepts Gallery',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'concepts-info',
        type: 'info',
        x: 50,
        y: 34,
        title: 'Computing Concepts Gallery',
        description: 'A gallery of ideas that emerged as cryptography demanded faster and more systematic computation.',
        image: assetPath('/s02g9/concepts.webp'),
        buttonLabel: 'Open Gallery',
        exhibitKey: 'concepts'
      },
      {
        id: 'to-comparison',
        type: 'navigation',
        x: 72,
        y: 58,
        target: 'comparison',
        title: 'Machine Comparison Center',
        buttonLabel: 'Open Comparison Center'
      },
      {
        id: 'to-finale',
        type: 'navigation',
        x: 28,
        y: 58,
        target: 'finale',
        title: 'From Cipher to Silicon',
        buttonLabel: 'Enter Finale'
      }
    ]
  },
  {
    id: 'comparison',
    name: 'Machine Comparison Center',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'comparison-info',
        type: 'info',
        x: 50,
        y: 34,
        title: 'Machine Comparison Center',
        description: 'See how each machine contributed to the evolution of computing.',
        image: assetPath('/s02g9/comparison.webp'),
        buttonLabel: 'Open Comparator',
        exhibitKey: 'comparison'
      },
      {
        id: 'to-finale',
        type: 'navigation',
        x: 72,
        y: 58,
        target: 'finale',
        title: 'From Cipher to Silicon',
        buttonLabel: 'Enter Finale'
      },
      {
        id: 'to-concepts',
        type: 'navigation',
        x: 28,
        y: 58,
        target: 'concepts',
        title: 'Back to Concepts Gallery',
        buttonLabel: 'Back'
      }
    ]
  },
  {
    id: 'finale',
    name: 'From Cipher to Silicon',
    panorama: assetPath('/s02g9/rooms/new_panorama.webp'),
    hotspots: [
      {
        id: 'finale-info',
        type: 'info',
        x: 50,
        y: 34,
        title: 'From Cipher to Silicon',
        description: 'A concluding gallery connecting cryptography and modern computing.',
        image: assetPath('/s02g9/Finale.jpg'),
        buttonLabel: 'Open Finale',
        exhibitKey: 'finale'
      },
      {
        id: 'to-lobby',
        type: 'navigation',
        x: 72,
        y: 58,
        target: 'lobby',
        title: 'Return to Entrance Lobby',
        buttonLabel: 'Return Home'
      }
    ]
  }
];

export const getRoomById = (id: string) => rooms.find((room) => room.id === id) ?? rooms[0];
