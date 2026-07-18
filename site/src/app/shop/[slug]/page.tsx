import { redirect } from 'next/navigation';
import { getCatalogProduct } from '@/data/catalog';

export default function ShopProductPage({ params }: { params: { slug: string } }) {
  const product = getCatalogProduct(params.slug);
  if (product?.href) {
    redirect(product.href);
  }
  redirect('/shop');
}
