'use client';

import { useCart } from '@/lib/store/cartStore';
import { formatCurrency } from '@/lib/utils/formatters';
import Link from 'next/link';
import { FiTrash2, FiMinus, FiPlus } from 'react-icons/fi';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Carrinho Vazio</h1>
          <p className="text-gray-600 mb-8">Você não tem nenhum produto no carrinho</p>
          <Link href="/shop" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700">
            Continuar Comprando
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Carrinho</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Produto</th>
                    <th className="text-center py-2">Quantidade</th>
                    <th className="text-right py-2">Preço</th>
                    <th className="text-right py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} className="border-b hover:bg-gray-50">
                      <td className="py-4">Produto #{item.productId}</td>
                      <td className="text-center py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <FiMinus size={16} />
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <FiPlus size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="text-right py-4">{formatCurrency(item.price * item.quantity)}</td>
                      <td className="text-right py-4">
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(getTotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frete</span>
                  <span className="font-semibold">Grátis</span>
                </div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-xl text-blue-600">{formatCurrency(getTotal())}</span>
                </div>
              </div>
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold mb-3">
                Finalizar Compra
              </button>
              <Link href="/shop" className="block text-center text-blue-600 hover:text-blue-700 py-2">
                Continuar Comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
