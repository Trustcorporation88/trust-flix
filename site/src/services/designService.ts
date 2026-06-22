/**
 * 🎨 Design Service - Gerencia designs, templates e assets
 */

import axios from 'axios';

export interface Asset {
  id: string;
  type: 'image' | 'text' | 'shape' | 'sticker';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  content?: string; // URL, texto, etc
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  zIndex: number;
}

export interface Design {
  id: string;
  name: string;
  type: 'post' | 'story' | 'carousel';
  width: number;
  height: number;
  backgroundColor: string;
  assets: Asset[];
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Template {
  id: string;
  name: string;
  category: 'post' | 'story' | 'carousel';
  thumbnail: string;
  description: string;
  assets: Asset[];
  width: number;
  height: number;
}

// Templates pré-prontos profissionais para posts, stories e carrosséis de marketing
export const TEMPLATES: Template[] = [
  {
    id: 'template-1',
    name: '💎 Oferta Irresistível (Alex Hormozi)',
    category: 'post',
    thumbnail: '/templates/promo-bold.png',
    description: 'Template estratégico escuro focado no modelo Hormozi de alta conversão',
    width: 1080,
    height: 1350,
    assets: [
      {
        id: 'bg-1',
        type: 'shape',
        x: 0,
        y: 0,
        width: 1080,
        height: 1350,
        rotation: 0,
        opacity: 1,
        color: '#0F0B21',
        zIndex: 0,
      },
      {
        id: 'accent-bar',
        type: 'shape',
        x: 140,
        y: 100,
        width: 800,
        height: 20,
        rotation: 0,
        opacity: 1,
        color: '#D946EF',
        zIndex: 1,
      },
      {
        id: 'tag-line',
        type: 'text',
        x: 140,
        y: 150,
        width: 800,
        height: 80,
        rotation: 0,
        opacity: 1,
        content: 'MÉTODO DOUG.EXE 6.0',
        color: '#D946EF',
        fontSize: 36,
        fontFamily: 'Impact',
        zIndex: 2,
      },
      {
        id: 'title-1',
        type: 'text',
        x: 140,
        y: 250,
        width: 800,
        height: 220,
        rotation: 0,
        opacity: 1,
        content: 'COMO MONTAR UMA\nOFERTA IRRESISTÍVEL',
        color: '#FFFFFF',
        fontSize: 64,
        fontFamily: 'Arial',
        zIndex: 3,
      },
      {
        id: 'sub-title-1',
        type: 'text',
        x: 140,
        y: 520,
        width: 800,
        height: 120,
        rotation: 0,
        opacity: 1,
        content: 'Escalar seu negócio de mentoria ou produto digital sem depender de tráfego caro.',
        color: '#A78BFA',
        fontSize: 32,
        fontFamily: 'Arial',
        zIndex: 4,
      },
      {
        id: 'bonus-box',
        type: 'shape',
        x: 140,
        y: 700,
        width: 800,
        height: 380,
        rotation: 0,
        opacity: 0.2,
        color: '#4C1D95',
        zIndex: 1,
      },
      {
        id: 'bonus-title',
        type: 'text',
        x: 180,
        y: 740,
        width: 720,
        height: 70,
        rotation: 0,
        opacity: 1,
        content: '🎁 LEVE HOJE COM 3 BÔNUS',
        color: '#FBBF24',
        fontSize: 40,
        fontFamily: 'Arial',
        zIndex: 5,
      },
      {
        id: 'bonus-list',
        type: 'text',
        x: 180,
        y: 840,
        width: 720,
        height: 200,
        rotation: 0,
        opacity: 1,
        content: '- Manual de Script de Vendas (R$197)\n- 15 Prompts DOUG.EXE de Copy (R$297)\n- Acesso à Comunidade VIP (R$497)',
        color: '#E5E7EB',
        fontSize: 30,
        fontFamily: 'Arial',
        zIndex: 6,
      },
      {
        id: 'sticker-fire',
        type: 'sticker',
        x: 820,
        y: 230,
        width: 150,
        height: 150,
        rotation: 12,
        opacity: 1,
        content: '🔥',
        zIndex: 10,
      }
    ],
  },
  {
    id: 'template-2',
    name: '📢 Caixa de Pergunta (Stories Vendas)',
    category: 'story',
    thumbnail: '/templates/story-clean.png',
    description: 'Story de engajamento com caixa de perguntas para capturar leads no direct',
    width: 1080,
    height: 1920,
    assets: [
      {
        id: 'bg-2',
        type: 'shape',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        rotation: 0,
        opacity: 1,
        color: '#4C1D95',
        zIndex: 0,
      },
      {
        id: 'story-header',
        type: 'text',
        x: 100,
        y: 180,
        width: 880,
        height: 120,
        rotation: 0,
        opacity: 1,
        content: 'MENTORIA ELITE TRUSTFLIX',
        color: '#A78BFA',
        fontSize: 32,
        fontFamily: 'Arial',
        zIndex: 2,
      },
      {
        id: 'story-title',
        type: 'text',
        x: 100,
        y: 320,
        width: 880,
        height: 300,
        rotation: 0,
        opacity: 1,
        content: 'Qual o maior obstáculo\nque impede você de\nvender todos os dias?',
        color: '#FFFFFF',
        fontSize: 56,
        fontFamily: 'Arial',
        zIndex: 3,
      },
      {
        id: 'insta-box',
        type: 'shape',
        x: 140,
        y: 800,
        width: 800,
        height: 350,
        rotation: 0,
        opacity: 1,
        color: '#FFFFFF',
        zIndex: 1,
      },
      {
        id: 'insta-box-text-1',
        type: 'text',
        x: 180,
        y: 840,
        width: 720,
        height: 60,
        rotation: 0,
        opacity: 1,
        content: 'Envie sua pergunta ou desafio...',
        color: '#9CA3AF',
        fontSize: 32,
        fontFamily: 'Arial',
        zIndex: 4,
      },
      {
        id: 'insta-box-btn',
        type: 'shape',
        x: 180,
        y: 1020,
        width: 720,
        height: 90,
        rotation: 0,
        opacity: 1,
        color: '#EF4444',
        zIndex: 2,
      },
      {
        id: 'insta-box-btn-text',
        type: 'text',
        x: 180,
        y: 1040,
        width: 720,
        height: 50,
        rotation: 0,
        opacity: 1,
        content: 'RESPONDER PERGUNTA',
        color: '#FFFFFF',
        fontSize: 30,
        fontFamily: 'Arial',
        zIndex: 5,
      },
      {
        id: 'finger-sticker',
        type: 'sticker',
        x: 460,
        y: 1200,
        width: 150,
        height: 150,
        rotation: 0,
        opacity: 1,
        content: '👇',
        zIndex: 10,
      }
    ],
  },
  {
    id: 'template-3',
    name: '🔥 Promoção FOMO / Últimas Horas',
    category: 'story',
    thumbnail: '/templates/story-clean.png',
    description: 'Story de urgência com alto senso de perca para fechamento de turmas',
    width: 1080,
    height: 1920,
    assets: [
      {
        id: 'bg-3',
        type: 'shape',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        rotation: 0,
        opacity: 1,
        color: '#111827',
        zIndex: 0,
      },
      {
        id: 'fomo-red-bar',
        type: 'shape',
        x: 100,
        y: 180,
        width: 880,
        height: 140,
        rotation: 0,
        opacity: 1,
        color: '#EF4444',
        zIndex: 1,
      },
      {
        id: 'fomo-red-bar-text',
        type: 'text',
        x: 100,
        y: 220,
        width: 880,
        height: 80,
        rotation: 0,
        opacity: 1,
        content: '⏳ ÚLTIMAS HORAS DISPONÍVEIS',
        color: '#FFFFFF',
        fontSize: 38,
        fontFamily: 'Impact',
        zIndex: 3,
      },
      {
        id: 'fomo-title',
        type: 'text',
        x: 100,
        y: 420,
        width: 880,
        height: 320,
        rotation: 0,
        opacity: 1,
        content: 'O DESCONTO DE 50%\nVAI EXPIRAR À MEIA-NOITE.',
        color: '#FFFFFF',
        fontSize: 54,
        fontFamily: 'Arial',
        zIndex: 4,
      },
      {
        id: 'fomo-subtitle',
        type: 'text',
        x: 100,
        y: 800,
        width: 880,
        height: 150,
        rotation: 0,
        opacity: 1,
        content: 'Se você ficar de fora, terá que pagar o valor integral de R$ 997 na próxima semana.',
        color: '#9CA3AF',
        fontSize: 34,
        fontFamily: 'Arial',
        zIndex: 5,
      },
      {
        id: 'cta-btn-shape',
        type: 'shape',
        x: 100,
        y: 1100,
        width: 880,
        height: 160,
        rotation: 0,
        opacity: 1,
        color: '#FBBF24',
        zIndex: 2,
      },
      {
        id: 'cta-btn-text',
        type: 'text',
        x: 100,
        y: 1150,
        width: 880,
        height: 80,
        rotation: 0,
        opacity: 1,
        content: 'QUERO MEU ACESSO COM 50% DESCONTO',
        color: '#000000',
        fontSize: 32,
        fontFamily: 'Arial',
        zIndex: 6,
      },
      {
        id: 'rocket-sticker',
        type: 'sticker',
        x: 780,
        y: 1240,
        width: 150,
        height: 150,
        rotation: -15,
        opacity: 1,
        content: '🚀',
        zIndex: 10,
      }
    ],
  },
  {
    id: 'template-4',
    name: '⭐ Depoimento / Prova Social',
    category: 'post',
    thumbnail: '/templates/carousel-premium.png',
    description: 'Template de prova social com design clean e selo de confiança',
    width: 1080,
    height: 1350,
    assets: [
      {
        id: 'bg-4',
        type: 'shape',
        x: 0,
        y: 0,
        width: 1080,
        height: 1350,
        rotation: 0,
        opacity: 1,
        color: '#F9FAFB',
        zIndex: 0,
      },
      {
        id: 'stars-line',
        type: 'text',
        x: 140,
        y: 180,
        width: 800,
        height: 80,
        rotation: 0,
        opacity: 1,
        content: '⭐⭐⭐⭐⭐',
        color: '#FBBF24',
        fontSize: 48,
        fontFamily: 'Arial',
        zIndex: 2,
      },
      {
        id: 'quote-text',
        type: 'text',
        x: 140,
        y: 300,
        width: 800,
        height: 400,
        rotation: 0,
        opacity: 1,
        content: '"O DOUG.EXE mudou completamente nossa taxa de conversão. Geramos mais de R$ 45.000 em vendas em apenas 12 dias após estruturar nossa oferta."',
        color: '#1F2937',
        fontSize: 44,
        fontFamily: 'Georgia',
        zIndex: 3,
      },
      {
        id: 'author-name',
        type: 'text',
        x: 140,
        y: 750,
        width: 800,
        height: 60,
        rotation: 0,
        opacity: 1,
        content: 'Marcos Rezende',
        color: '#111827',
        fontSize: 36,
        fontFamily: 'Arial',
        zIndex: 4,
      },
      {
        id: 'author-title',
        type: 'text',
        x: 140,
        y: 810,
        width: 800,
        height: 60,
        rotation: 0,
        opacity: 1,
        content: 'Fundador da Rezende Digital',
        color: '#4B5563',
        fontSize: 28,
        fontFamily: 'Arial',
        zIndex: 5,
      },
      {
        id: 'badge-sticker',
        type: 'sticker',
        x: 800,
        y: 750,
        width: 140,
        height: 140,
        rotation: 0,
        opacity: 1,
        content: '🏆',
        zIndex: 10,
      }
    ],
  }
];

class DesignService {
  private designs: Map<string, Design> = new Map();
  private api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
  });

  /**
   * Criar novo design
   */
  async createDesign(
    name: string,
    type: 'post' | 'story' | 'carousel' = 'post'
  ): Promise<Design> {
    const dimensions = this.getDefaultDimensions(type);
    
    const design: Design = {
      id: `design-${Date.now()}`,
      name,
      type,
      width: dimensions.width,
      height: dimensions.height,
      backgroundColor: '#FFFFFF',
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.designs.set(design.id, design);
    return design;
  }

  /**
   * Obter design por ID
   */
  getDesign(designId: string): Design | undefined {
    return this.designs.get(designId);
  }

  /**
   * Salvar design
   */
  async saveDesign(design: Design): Promise<Design> {
    design.updatedAt = new Date();
    this.designs.set(design.id, design);
    
    // TODO: Salvar no backend
    await this.api.post('/api/designs', design);
    
    return design;
  }

  /**
   * Listar todos os designs
   */
  async listDesigns(): Promise<Design[]> {
    return Array.from(this.designs.values());
  }

  /**
   * Adicionar asset ao design
   */
  addAsset(designId: string, asset: Asset): void {
    const design = this.designs.get(designId);
    if (design) {
      design.assets.push(asset);
      design.updatedAt = new Date();
    }
  }

  /**
   * Remover asset
   */
  removeAsset(designId: string, assetId: string): void {
    const design = this.designs.get(designId);
    if (design) {
      design.assets = design.assets.filter(a => a.id !== assetId);
      design.updatedAt = new Date();
    }
  }

  /**
   * Atualizar asset
   */
  updateAsset(designId: string, assetId: string, updates: Partial<Asset>): void {
    const design = this.designs.get(designId);
    if (design) {
      const asset = design.assets.find(a => a.id === assetId);
      if (asset) {
        Object.assign(asset, updates);
        design.updatedAt = new Date();
      }
    }
  }

  /**
   * Exportar design como JSON
   */
  exportDesign(designId: string): string {
    const design = this.designs.get(designId);
    if (!design) throw new Error('Design not found');
    return JSON.stringify(design, null, 2);
  }

  /**
   * Importar design de JSON
   */
  importDesign(json: string): Design {
    const design: Design = JSON.parse(json);
    design.id = `design-${Date.now()}`;
    design.createdAt = new Date();
    design.updatedAt = new Date();
    this.designs.set(design.id, design);
    return design;
  }

  /**
   * Criar design a partir de template
   */
  async createFromTemplate(templateId: string, name: string): Promise<Design> {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    const design: Design = {
      id: `design-${Date.now()}`,
      name,
      type: template.category,
      width: template.width,
      height: template.height,
      backgroundColor: '#FFFFFF',
      assets: JSON.parse(JSON.stringify(template.assets)), // Deep copy
      templateId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.designs.set(design.id, design);
    return design;
  }

  /**
   * Obter templates
   */
  getTemplates(category?: 'post' | 'story' | 'carousel'): Template[] {
    if (category) {
      return TEMPLATES.filter(t => t.category === category);
    }
    return TEMPLATES;
  }

  /**
   * Dimensões padrão por tipo
   */
  private getDefaultDimensions(type: 'post' | 'story' | 'carousel'): { width: number; height: number } {
    const sizes = {
      post: { width: 1080, height: 1350 },
      story: { width: 1080, height: 1920 },
      carousel: { width: 1080, height: 1350 },
    };
    return sizes[type];
  }

  /**
   * Gerar caption com IA (mock)
   */
  async generateCaption(_theme: string, hashtags?: string[]): Promise<string> {
    const captions = [
      `Confira nosso novo produto! ${hashtags?.join(' ') || '#novo'}`,
      `Você não pode perder isso! ${hashtags?.join(' ') || '#promoção'}`,
      `Aproveite enquanto há tempo! ${hashtags?.join(' ') || '#oferta'}`,
    ];
    return captions[Math.floor(Math.random() * captions.length)];
  }

  /**
   * Otimizar hashtags
   */
  async optimizeHashtags(category: string): Promise<string[]> {
    const hashtags: Record<string, string[]> = {
      moda: ['#moda', '#style', '#ootd', '#fashion', '#instastyle'],
      beleza: ['#beleza', '#makeup', '#beauty', '#skincare', '#glow'],
      comida: ['#comida', '#foodblog', '#foodie', '#delicia', '#yummy'],
      lifestyle: ['#lifestyle', '#motivation', '#goals', '#inspiration', '#blessed'],
    };
    return hashtags[category] || hashtags['lifestyle'];
  }
}

export const designService = new DesignService();
