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

// Templates pré-prontos
export const TEMPLATES: Template[] = [
  {
    id: 'template-1',
    name: 'Promoção Bold',
    category: 'post',
    thumbnail: '/templates/promo-bold.png',
    description: 'Template de promoção com destaque em vermelho',
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
        color: '#FF0000',
        zIndex: 0,
      },
      {
        id: 'title-1',
        type: 'text',
        x: 50,
        y: 300,
        width: 980,
        height: 200,
        rotation: 0,
        opacity: 1,
        content: 'Seu Título Aqui',
        color: '#FFFFFF',
        fontSize: 72,
        fontFamily: 'Arial',
        zIndex: 2,
      },
    ],
  },
  {
    id: 'template-2',
    name: 'Story Clean',
    category: 'story',
    thumbnail: '/templates/story-clean.png',
    description: 'Story simples e limpa',
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
        color: '#FFFFFF',
        zIndex: 0,
      },
    ],
  },
  {
    id: 'template-3',
    name: 'Carrossel Premium',
    category: 'carousel',
    thumbnail: '/templates/carousel-premium.png',
    description: 'Template premium para carrossel',
    width: 1080,
    height: 1350,
    assets: [
      {
        id: 'bg-3',
        type: 'shape',
        x: 0,
        y: 0,
        width: 1080,
        height: 1350,
        rotation: 0,
        opacity: 1,
        color: '#F5F5F5',
        zIndex: 0,
      },
    ],
  },
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
